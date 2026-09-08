-- =============================================================================
-- Critical bugfix batch (QA Audit 2026-09-09 / Execution Sheet items #12, #13, #23)
--   1. ap_ledger.reason ยังไม่รองรับ 'PENALTY_FINE' — deduct_player_ap_fine() ที่
--      dispute/resolve/route.ts เรียกอยู่ไม่มีอยู่จริงในระบบ (error ถูกกลืนเงียบ ๆ
--      ด้วย console.error โดยไม่ block คำขอ) แก้โดยเพิ่ม 'PENALTY_FINE' เข้า CHECK
--      แล้วให้ route เรียก move_ap(reason='PENALTY_FINE') ตรง ๆ แทน
--   2. trg_validate_match_transition ไม่มี branch อนุญาตเข้า/ออกสถานะ DISPUTED เลย
--      (มีคอมเมนต์เดิมว่า "out of scope" ตั้งแต่ Sprint 2.3) ทำให้ dispute/route.ts
--      (ยื่นข้อพิพาท) และ dispute/resolve/route.ts (ชี้ขาด → COMPLETED) อัปเดต
--      สถานะไม่ผ่านจริงในโปรดักชัน แก้โดยเพิ่ม branch LIVE/PAUSED/AWAITING_RESULT
--      -> DISPUTED และ DISPUTED -> COMPLETED/WALKOVER/CANCELLED
--   3. claim_watch_reward() รับแค่ p_session_id เดิม client ส่ง Idempotency-Key
--      header มาแต่ route.ts ไม่ได้ใช้งานจริงเลย (มีแค่เช็คว่ามี header ส่งมา)
--      แก้โดยเพิ่ม p_idempotency_key ให้เลือกส่งต่อเข้า move_ap() แทนคีย์อัตโนมัติ
--      เดิม (คงพฤติกรรมเดิมไว้เป็นค่า default เมื่อไม่ส่งมา)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. เพิ่ม 'PENALTY_FINE' เป็นเหตุผลที่ ap_ledger ยอมรับได้
-- -----------------------------------------------------------------------------
ALTER TABLE public.ap_ledger DROP CONSTRAINT IF EXISTS ap_ledger_reason_check;
ALTER TABLE public.ap_ledger ADD CONSTRAINT ap_ledger_reason_check
    CHECK (reason IN ('WATCH_REWARD', 'CLAWBACK', 'ADMIN_ADJUSTMENT', 'STORE_REDEEM', 'TOP_UP', 'REFUND_AP_CREDIT', 'PENALTY_FINE'));

-- -----------------------------------------------------------------------------
-- 2. เปิดทาง DISPUTED เข้า/ออกใน Match State Machine Guard
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_match_transition_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_allowed       BOOLEAN := FALSE;
    v_has_veto      BOOLEAN := FALSE;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Terminal states are locked.
    IF OLD.status IN ('COMPLETED', 'WALKOVER', 'BYE', 'CANCELLED') THEN
        RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Terminal status % cannot be updated to %', OLD.status, NEW.status;
    END IF;

    CASE OLD.status
        WHEN 'SCHEDULED' THEN
            IF NEW.status IN ('READY_CHECK', 'WALKOVER', 'BYE', 'CANCELLED') THEN
                v_allowed := TRUE;
            END IF;

        WHEN 'READY_CHECK' THEN
            IF NEW.status = 'WALKOVER' THEN
                v_allowed := TRUE;
            ELSIF NEW.status IN ('VETO', 'LIVE') THEN
                SELECT (veto_format IS NOT NULL AND veto_format != '{}'::jsonb) INTO v_has_veto
                FROM public.tournament_stages s
                WHERE s.id = OLD.stage_id;

                IF NEW.status = 'VETO' AND v_has_veto THEN
                    v_allowed := TRUE;
                ELSIF NEW.status = 'LIVE' AND NOT v_has_veto THEN
                    v_allowed := TRUE;
                END IF;
            END IF;

        WHEN 'VETO' THEN
            IF NEW.status IN ('LIVE', 'CANCELLED') THEN
                v_allowed := TRUE;
            END IF;

        WHEN 'LIVE' THEN
            -- Fix (2026-09-09): เดิมอนุญาตแค่ PAUSED/AWAITING_RESULT ทำให้ยื่น
            -- ข้อพิพาทตอนแมตช์กำลัง LIVE ไม่ผ่าน trigger จริง
            IF NEW.status IN ('PAUSED', 'AWAITING_RESULT', 'DISPUTED') THEN
                v_allowed := TRUE;
            END IF;

        WHEN 'PAUSED' THEN
            -- Fix (2026-09-09): เพิ่ม DISPUTED ให้ยื่นข้อพิพาทตอนแมตช์ถูกพักได้
            IF NEW.status IN ('LIVE', 'DISPUTED') THEN
                v_allowed := TRUE;
            END IF;

        WHEN 'AWAITING_RESULT' THEN
            -- Fix (2026-09-09): เพิ่ม DISPUTED สำหรับกรณีรายงานผลขัดแย้งกัน
            IF NEW.status IN ('COMPLETED', 'DISPUTED') THEN
                v_allowed := TRUE;
            END IF;

        WHEN 'DISPUTED' THEN
            -- Fix (2026-09-09): เดิมไม่มี branch นี้เลย ทำให้กรรมการชี้ขาด
            -- (dispute/resolve) อัปเดตสถานะเป็น COMPLETED ไม่ผ่านจริงในโปรดักชัน
            IF NEW.status IN ('COMPLETED', 'WALKOVER', 'CANCELLED') THEN
                v_allowed := TRUE;
            END IF;

        ELSE
            v_allowed := FALSE;
    END CASE;

    IF NOT v_allowed THEN
        RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Cannot transition match % from % to %', OLD.id, OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. claim_watch_reward — เพิ่ม p_idempotency_key (optional) ส่งต่อเข้า move_ap()
--    แทนคีย์อัตโนมัติเดิม 'claim-session-<id>' เมื่อ client ส่งมาจริง
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_watch_reward(
    p_session_id      UUID,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session         RECORD;
    v_rule            RECORD;
    v_intervals       NUMERIC;
    v_raw_ap          NUMERIC;
    v_today           DATE;
    v_daily_earned    NUMERIC;
    v_daily_cap       NUMERIC;
    v_remaining_today NUMERIC;
    v_ap_awarded      NUMERIC;
    v_capped          BOOLEAN;
    v_move_result     JSONB;
BEGIN
    SELECT * INTO v_session
    FROM public.watch_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND');
    END IF;

    IF v_session.status = 'CLAIMED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CLAIMED');
    END IF;

    IF v_session.status <> 'ACTIVE' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_SESSION_STATUS');
    END IF;

    IF v_session.is_anomalous THEN
        RETURN jsonb_build_object('success', false, 'error', 'SESSION_TOO_RISKY');
    END IF;

    SELECT * INTO v_rule FROM public.ap_earning_rules WHERE id = v_session.earning_rule_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'EARNING_RULE_NOT_FOUND');
    END IF;

    v_intervals := FLOOR(v_session.watched_seconds / v_rule.interval_seconds);
    v_raw_ap := v_intervals * v_rule.ap_per_interval;

    v_today := (NOW() AT TIME ZONE 'Asia/Bangkok')::date;

    SELECT ap_earned, daily_cap INTO v_daily_earned, v_daily_cap
    FROM public.ap_daily_limits
    WHERE player_id = v_session.player_id AND limit_date = v_today
    FOR UPDATE;

    IF NOT FOUND THEN
        v_daily_earned := 0;
        v_daily_cap := v_rule.daily_cap_ap;
    END IF;

    v_remaining_today := GREATEST(v_daily_cap - v_daily_earned, 0);
    v_ap_awarded := LEAST(v_raw_ap, v_remaining_today);
    v_capped := v_ap_awarded < v_raw_ap;

    IF v_ap_awarded > 0 THEN
        v_move_result := public.move_ap(
            v_session.player_id,
            v_ap_awarded,
            'WATCH_REWARD',
            COALESCE(p_idempotency_key, 'claim-session-' || p_session_id::text),
            'watch_session',
            p_session_id
        );

        IF NOT (v_move_result->>'success')::boolean THEN
            RETURN jsonb_build_object('success', false, 'error', COALESCE(v_move_result->>'error', 'MOVE_AP_FAILED'));
        END IF;
    END IF;

    UPDATE public.watch_sessions
    SET status = 'CLAIMED', claimed_at = NOW(), ap_awarded = v_ap_awarded, updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'ap_awarded', v_ap_awarded,
        'capped', v_capped,
        'balance_after', COALESCE(
            (v_move_result->>'balance_after')::numeric,
            (SELECT balance_after FROM public.ap_ledger WHERE player_id = v_session.player_id ORDER BY created_at DESC LIMIT 1),
            0
        ),
        'daily_earned', v_daily_earned + v_ap_awarded,
        'daily_cap', v_daily_cap
    );
END;
$$;
