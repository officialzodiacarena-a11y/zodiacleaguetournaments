-- supabase/migrations/20260914_match_room_mercy_scrim_v7_01_fixes.sql
-- =============================================================================
-- ZODIAC ARENA - MATCH ROOM & MERCY SCRIM SYSTEM (V7.01 REPAIR MIGRATION)
-- Document Code: SPEC-MATCH-ROOM-MERCY-SCRIM-V7.01-FIXES
-- Purpose: Complete missing RPCs (approve, settle escrow, atomic mercy beacon)
--
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น — Claude ไม่มีสิทธิ์รัน SQL
--
-- แก้ไขจาก spec ต้นฉบับ (SPEC-MRS-FIX01..05) หลังตรวจกับ schema จริงบนสาขานี้
-- (20260914_match_room_mercy_scrim_v7_01.sql) ก่อนเขียนไฟล์นี้:
--
--   1. Spec เดิมสมมติคอลัมน์ที่ไม่มีอยู่จริงบนสาขานี้ — stake_ap_amount,
--      host_team_id/opponent_team_id, payment_status, staked_ap บน
--      match_room_participants, และ missing_player_id บน mercy_fill_tickets.
--      ของจริงคือ min_ap_stake/total_escrow_ap บน match_rooms และ
--      ap_staked/has_paid_escrow/team_side บน match_room_participants,
--      missing_team_side บน mercy_fill_tickets. เขียน RPC ทั้งหมดด้านล่างใหม่
--      ให้ตรงกับคอลัมน์จริงแทนที่จะ copy spec ตรงๆ
--
--   2. Spec เดิมตั้ง status = 'SETTLED' ตอนจบเกม แต่ scrim_room_status_enum
--      (สร้างใน migration ก่อนหน้า) ไม่มีค่า 'SETTLED' เลย — ใช้ 'RESOLVED' ที่มี
--      อยู่แล้วในแทน (แพ้ชนะ) และ 'CANCELLED' สำหรับ draw/refund
--
--   3. move_ap() บนสาขานี้ (20260908140000_t33_patch_ap_balance_sync.sql) ไม่มี
--      แนวคิด "system escrow wallet" — เป็นแค่ debit/credit ของผู้เล่นคนเดียว
--      ต่อครั้ง + บันทึก ap_ledger เท่านั้น เงินที่ escrow ไว้ตอนสร้างห้อง/claim
--      ringer คือ "หายไปจาก balance ผู้เล่น" ธรรมดา ไม่ได้โอนไปเก็บที่ไหน
--      settle_scrim_escrow() ด้านล่างจึง credit AP กลับผู้เล่นตรงๆ ด้วย
--      move_ap(..., +amount, ...) ไม่ได้โอนจาก wallet กลาง
--
--   4. move_ap() กัน DUPLICATE_KEY ด้วย UNIQUE(idempotency_key) — settle เดิม
--      (spec) วน loop ผู้ชนะหลายคนแต่ใช้ idempotency key เดียวกันทุกคน คนที่ 2
--      เป็นต้นไปจะโดน DUPLICATE_KEY ทันที แก้โดยต่อท้าย player_id เข้า key
--      ให้ unique ต่อผู้เล่นแต่ละคนในหมวด 3 ด้านล่าง
--
--   5. เพิ่ม 'SCRIM_VICTORY_PAYOUT' และ 'SCRIM_REFUND' เข้า ap_ledger_reason_check
--      (union กับค่าเดิมทั้งหมดจาก 20260914_match_room_mercy_scrim_v7_01.sql
--      ตามแพทเทิร์นเดียวกับที่ไฟล์นั้นทำไว้กับ daily_quest_and_affiliate_v6)
--      ไม่งั้น move_ap() ใน settle_scrim_escrow() จะชน CHECK ทันที
--
--   6. trigger_mercy_beacon() เดิมเป็น insert/update แบบกระจายใน Server Action
--      (Race Condition ได้ถ้ายิงเรียกตัวสำรองพร้อมกันสองครั้ง) ย้ายมาเป็น RPC
--      เดียวพร้อม FOR UPDATE lock + เช็ค OPEN ticket ซ้ำก่อนสร้างใหม่ (idempotent)
--
--   7. approve_scrim_room() / settle_scrim_escrow() ไม่มี anti-BOLA auth.uid()
--      check แบบ create_scrim_room()/claim_mercy_sub_slot() เพราะเป็น action
--      ของ staff/referee ไม่ใช่ผู้เล่นเจ้าของ — สิทธิ์เช็คที่ชั้น Server Action
--      (lib/actions/match-room.ts) ผ่าน match_room_staff.staff_role ก่อนเรียก
--      RPC แทน (adminClient เรียก RPC ด้วย service_role ซึ่ง auth.uid() เป็น NULL
--      อยู่แล้วในบริบทนี้)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. RPC: approve_scrim_room
-- Purpose: Staff (Admin/Referee) approval to move a room out of PENDING_APPROVAL
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_scrim_room(
    p_room_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
BEGIN
    SET LOCAL lock_timeout = '3s';

    SELECT id, status INTO v_room
    FROM public.match_rooms
    WHERE id = p_room_id
    FOR UPDATE;

    IF v_room.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ROOM_NOT_FOUND');
    END IF;

    IF v_room.status <> 'PENDING_APPROVAL' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_ROOM_STATUS');
    END IF;

    UPDATE public.match_rooms
    SET status = 'APPROVED', updated_at = NOW()
    WHERE id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'room_id', p_room_id,
        'status', 'APPROVED'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. RPC: settle_scrim_escrow
-- Purpose: Pay out staked AP to the winning side, or refund everyone on a
-- draw/cancellation. Credits players directly via move_ap() (see Fix 3 above).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.settle_scrim_escrow(
    p_room_id UUID,
    p_winner_team_side VARCHAR DEFAULT NULL, -- 'TEAM_A' | 'TEAM_B' | NULL = draw/cancel refund
    p_idempotency_key VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_part RECORD;
    v_winner_count INT := 0;
    v_ap_per_winner NUMERIC := 0;
    v_move_res JSONB;
    v_settled_total NUMERIC := 0;
    v_base_key TEXT;
BEGIN
    SET LOCAL lock_timeout = '3s';

    SELECT id, status, total_escrow_ap INTO v_room
    FROM public.match_rooms
    WHERE id = p_room_id
    FOR UPDATE;

    IF v_room.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ROOM_NOT_FOUND');
    END IF;

    IF v_room.status IN ('RESOLVED', 'CANCELLED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'ROOM_ALREADY_SETTLED');
    END IF;

    v_base_key := COALESCE(p_idempotency_key, 'settle_' || p_room_id::text);

    IF p_winner_team_side IS NOT NULL THEN
        IF p_winner_team_side NOT IN ('TEAM_A', 'TEAM_B') THEN
            RETURN jsonb_build_object('success', false, 'error', 'INVALID_WINNER_TEAM_SIDE');
        END IF;

        SELECT COUNT(*) INTO v_winner_count
        FROM public.match_room_participants
        WHERE room_id = p_room_id AND team_side = p_winner_team_side AND has_paid_escrow = true;

        IF v_winner_count = 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'NO_PAID_WINNERS_FOUND');
        END IF;

        v_ap_per_winner := FLOOR(v_room.total_escrow_ap / v_winner_count);

        -- Fix 4: idempotency key suffixed per player_id so paying out N winners
        -- in one call doesn't collide on move_ap()'s UNIQUE(idempotency_key).
        FOR v_part IN
            SELECT player_id
            FROM public.match_room_participants
            WHERE room_id = p_room_id AND team_side = p_winner_team_side AND has_paid_escrow = true
        LOOP
            v_move_res := public.move_ap(
                v_part.player_id,
                v_ap_per_winner,
                'SCRIM_VICTORY_PAYOUT',
                v_base_key || '_' || v_part.player_id::text,
                'match_rooms',
                p_room_id
            );

            IF NOT COALESCE((v_move_res->>'success')::boolean, false) THEN
                RAISE EXCEPTION 'PAYOUT_FAILED: %', v_move_res->>'error' USING ERRCODE = 'P0003';
            END IF;

            v_settled_total := v_settled_total + v_ap_per_winner;
        END LOOP;

        UPDATE public.match_rooms
        SET status = 'RESOLVED', total_escrow_ap = 0, updated_at = NOW()
        WHERE id = p_room_id;
    ELSE
        FOR v_part IN
            SELECT player_id, ap_staked
            FROM public.match_room_participants
            WHERE room_id = p_room_id AND has_paid_escrow = true AND ap_staked > 0
        LOOP
            v_move_res := public.move_ap(
                v_part.player_id,
                v_part.ap_staked,
                'SCRIM_REFUND',
                v_base_key || '_' || v_part.player_id::text,
                'match_rooms',
                p_room_id
            );

            IF NOT COALESCE((v_move_res->>'success')::boolean, false) THEN
                RAISE EXCEPTION 'REFUND_FAILED: %', v_move_res->>'error' USING ERRCODE = 'P0003';
            END IF;

            v_settled_total := v_settled_total + v_part.ap_staked;
        END LOOP;

        UPDATE public.match_rooms
        SET status = 'CANCELLED', total_escrow_ap = 0, updated_at = NOW()
        WHERE id = p_room_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'room_id', p_room_id,
        'settled_amount_ap', v_settled_total,
        'winner_team_side', p_winner_team_side
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. RPC: trigger_mercy_beacon (Atomic Implementation, Fix 6)
-- Purpose: Replace the scattered insert/update in the Server Action with one
-- locked, idempotent RPC call.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_mercy_beacon(
    p_room_id UUID,
    p_missing_team_side VARCHAR,
    p_required_role public.valorant_agent_role_enum DEFAULT 'FLEX'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_ticket_id UUID;
BEGIN
    SET LOCAL lock_timeout = '3s';

    IF p_missing_team_side NOT IN ('TEAM_A', 'TEAM_B') THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_TEAM_SIDE');
    END IF;

    SELECT id, status INTO v_room
    FROM public.match_rooms
    WHERE id = p_room_id
    FOR UPDATE;

    IF v_room.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ROOM_NOT_FOUND');
    END IF;

    -- Idempotent: reuse an already-open ticket for the same room+side instead
    -- of racing to create duplicates when two teammates hit the beacon at once.
    SELECT id INTO v_ticket_id
    FROM public.mercy_fill_tickets
    WHERE room_id = p_room_id AND missing_team_side = p_missing_team_side AND status = 'OPEN'
    LIMIT 1;

    IF v_ticket_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'ticket_id', v_ticket_id,
            'message', 'MERCY_BEACON_ALREADY_ACTIVE'
        );
    END IF;

    INSERT INTO public.mercy_fill_tickets (room_id, missing_team_side, required_role, status)
    VALUES (p_room_id, p_missing_team_side, p_required_role, 'OPEN')
    RETURNING id INTO v_ticket_id;

    UPDATE public.match_rooms
    SET mercy_beacon_active = true, mercy_beacon_triggered_at = NOW(), updated_at = NOW()
    WHERE id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'ticket_id', v_ticket_id,
        'room_id', p_room_id,
        'status', 'OPEN'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. ap_ledger: allow the new settlement reasons (Fix 5)
--    (เก็บค่าเดิมทั้งหมดจาก 20260914_match_room_mercy_scrim_v7_01.sql ไว้ครบ
--    แล้วเพิ่ม SCRIM_VICTORY_PAYOUT / SCRIM_REFUND ท้ายรายการ)
-- -----------------------------------------------------------------------------
ALTER TABLE public.ap_ledger DROP CONSTRAINT IF EXISTS ap_ledger_reason_check;
ALTER TABLE public.ap_ledger ADD CONSTRAINT ap_ledger_reason_check
    CHECK (reason IN ('WATCH_REWARD', 'CLAWBACK', 'ADMIN_ADJUSTMENT', 'STORE_REDEEM', 'TOP_UP', 'REFUND_AP_CREDIT', 'PENALTY_FINE', 'SUBSCRIPTION_RENEWAL', 'MARKETPLACE_BID', 'MARKETPLACE_REFUND', 'MARKETPLACE_SOLD', 'ESCROW_LOCK', 'ESCROW_SETTLED', 'ESCROW_AUTO_RELEASE', 'PREDICTION_BUY', 'PREDICTION_PAYOUT', 'PREDICTION_REFUND_VOID', 'PREDICTION_HOUSE_FEE_BURN', 'WATCH_EARN', 'PREDICTION_JACKPOT_PAYOUT', 'SCRIM_ESCROW_LOCK', 'SCRIM_MERCY_RINGER_STAKE', 'QUEST_REWARD', 'REFERRAL', 'SCRIM_VICTORY_PAYOUT', 'SCRIM_REFUND'));

COMMIT;
