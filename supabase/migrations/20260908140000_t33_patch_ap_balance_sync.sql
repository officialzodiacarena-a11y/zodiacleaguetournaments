-- =============================================================================
-- MIGRATION PATCH: T3.3 — sync move_ap() with the real players.ap_balance column
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น (รันหลัง 20260908120000_t33 เสมอ)
--
-- Bug พบตอน verify DB ก่อนเริ่ม T3.5: public.players.ap_balance (BIGINT NOT NULL
-- DEFAULT 0) มีอยู่จริงในระบบมาตั้งแต่แรก — ตอนเขียน move_ap() ครั้งแรก (T3.3)
-- เข้าใจผิดว่าคอลัมน์นี้ไม่มี (จากการอ่านผลลัพธ์ query verify ของ T3.4 ตกหล่น)
-- จึงออกแบบ balance ให้คำนวณจากแถวล่าสุดของ ap_ledger.balance_after แทน ผลคือ
-- players.ap_balance ค้างที่ 0 ตลอดแม้ move_ap() จะรันสำเร็จและ credit/debit จริง
--
-- แก้โดยให้ players.ap_balance เป็น source of truth ตัวเดียว: ล็อกแถวผู้เล่นด้วย
-- SELECT ... FOR UPDATE (แทน pg_advisory_xact_lock แบบเดิม), อ่าน/เขียน ap_balance
-- ตรง ๆ แล้วค่อย insert ap_ledger.balance_after ให้ตรงกันเป็นบันทึกประวัติ
-- =============================================================================

CREATE OR REPLACE FUNCTION public.move_ap(
    p_player_id       UUID,
    p_amount          NUMERIC,
    p_reason          TEXT,
    p_idempotency_key TEXT DEFAULT NULL,
    p_reference_type  TEXT DEFAULT NULL,
    p_reference_id    UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance NUMERIC;
    v_new_balance     NUMERIC;
    v_existing        RECORD;
    v_ledger_id       UUID;
    v_today           DATE;
BEGIN
    IF p_amount = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'ZERO_AMOUNT');
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, balance_after INTO v_existing
        FROM public.ap_ledger
        WHERE idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'DUPLICATE_KEY',
                'ledger_id', v_existing.id,
                'balance_after', v_existing.balance_after
            );
        END IF;
    END IF;

    -- players.ap_balance คือ source of truth ตัวจริง — ล็อกแถวนี้แทน advisory lock
    SELECT ap_balance INTO v_current_balance
    FROM public.players
    WHERE id = p_player_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PLAYER_NOT_FOUND');
    END IF;

    v_new_balance := v_current_balance + p_amount;

    IF v_new_balance < 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_AP_BALANCE',
            'current_balance', v_current_balance,
            'requested', p_amount
        );
    END IF;

    UPDATE public.players
    SET ap_balance = v_new_balance, updated_at = NOW()
    WHERE id = p_player_id;

    INSERT INTO public.ap_ledger (player_id, amount, reason, reference_type, reference_id, idempotency_key, balance_after)
    VALUES (p_player_id, p_amount, p_reason, p_reference_type, p_reference_id, p_idempotency_key, v_new_balance)
    RETURNING id INTO v_ledger_id;

    IF p_reason = 'WATCH_REWARD' AND p_amount > 0 THEN
        v_today := (NOW() AT TIME ZONE 'Asia/Bangkok')::date;

        INSERT INTO public.ap_daily_limits (player_id, limit_date, ap_earned)
        VALUES (p_player_id, v_today, p_amount)
        ON CONFLICT (player_id, limit_date) DO UPDATE
            SET ap_earned = public.ap_daily_limits.ap_earned + EXCLUDED.ap_earned,
                updated_at = NOW();
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'ledger_id', v_ledger_id,
        'balance_after', v_new_balance
    );
END;
$$;

-- Backfill: sync players.ap_balance กับผลรวมจริงจาก ap_ledger สำหรับผู้เล่นที่มี
-- ธุรกรรมเกิดขึ้นไปแล้วก่อนแพตช์นี้ (ถ้ามี) ให้ตรงกับแถวล่าสุดของแต่ละคน
UPDATE public.players p
SET ap_balance = latest.balance_after
FROM (
    SELECT DISTINCT ON (player_id) player_id, balance_after
    FROM public.ap_ledger
    ORDER BY player_id, created_at DESC
) latest
WHERE p.id = latest.player_id;
