-- supabase/migrations/20260914_match_room_mercy_scrim_v7_01.sql
-- =============================================================================
-- ZODIAC ARENA - MATCH ROOM & MERCY SCRIM SYSTEM MIGRATION SCRIPT (V7.01)
-- Document Code: SPEC-MRS001
-- Standard: ACID Escrow Ledger & Zero-Leak Protocol V7.01
--
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น — Claude ไม่มีสิทธิ์รัน SQL
--
-- แก้ไขจาก spec ต้นฉบับหลังตรวจกับ schema จริงบนสาขานี้ (feat/athlete-dashboard-hud)
-- ก่อนเขียนไฟล์นี้:
--
--   1. [Flag 1 - Alis] ลบ CONSTRAINT chk_booking_window ออกจาก DDL ของ
--      match_rooms — PostgreSQL evaluate NOW() ครั้งเดียวตอน CREATE TABLE ไม่ใช่
--      ตอน insert แต่ละแถว constraint นี้จึงไม่ทำงานจริง validation ที่ถูกต้อง
--      (1-7 วัน) มีอยู่แล้วใน create_scrim_room() RPC ด้านล่าง
--
--   2. sendRoomMessage() ใน spec เดิมให้ insert เข้า public.match_lobby_messages
--      แต่ตารางนั้น (20260907120000_t23_match_lifecycle.sql) มี match_id FK ชี้
--      ไป public.matches(id) เท่านั้น — คนละ id space กับ match_rooms ที่สร้างใหม่
--      ใน patch นี้ ทุก insert จะชน foreign key violation แน่นอน
--      → คุยกับพี่หยัดแล้ว: สร้างตาราง match_room_messages ใหม่แยกต่างหาก
--      FK ชี้ไป match_rooms(id) โดยเฉพาะ ไม่แตะ match_lobby_messages เดิมที่ระบบ
--      tournament ใช้งานอยู่ (ความเสี่ยงต่ำสุด)
--
--   3. ap_ledger.reason: บนสาขานี้ ap_ledger_reason_check เวอร์ชันล่าสุดคือของ
--      20260910020000_t71_phase7_predictions_watch_v2.sql (ยังไม่มีไฟล์
--      20260914_daily_quest_and_affiliate_v6.sql — อยู่คนละ feature branch ที่
--      ยังไม่ merge) เพิ่ม 'SCRIM_ESCROW_LOCK' และ 'SCRIM_MERCY_RINGER_STAKE'
--      ต่อท้ายรายการเดิมทั้งหมด ไม่งั้น move_ap() ใน RPC ด้านล่างจะชน CHECK ทันที
--
--   4. create_scrim_room() / claim_mercy_sub_slot(): เพิ่มการเช็ค
--      (v_res->>'success')::boolean หลังเรียก move_ap() ทุกจุด — โค้ดเดิมใน spec
--      ไม่เช็คผลลัพธ์เลย ถ้า move_ap() fail (เช่น AP ไม่พอ) โค้ดเดิมจะสร้างห้อง/
--      ใส่ผู้เล่นเข้าโรสเตอร์ต่อไปโดยที่ไม่ได้หัก AP จริง แต่ mark
--      has_paid_escrow = true อยู่ดี แพทเทิร์นเช็ค success ก่อน proceed มีอยู่แล้ว
--      ใน daily_quest_and_affiliate migration (claim_daily_quest_reward,
--      process_affiliate_kyc_bonus) ใช้ pattern เดียวกันที่นี่
--
--   5. create_scrim_room(): เดิมส่ง p_reference_id เป็น string 'PENDING_ROOM'
--      แต่ move_ap() param จริงเป็น UUID type — invalid input syntax for type
--      uuid ทันที แก้โดย gen_random_uuid() ห้อง id ล่วงหน้าก่อนเรียก move_ap()
--      แล้ว insert ด้วย id เดิมนั้น (แทนที่จะพึ่ง DEFAULT + RETURNING id)
--
--   6. claim_mercy_sub_slot(): เดิมส่ง p_ticket_id::text เข้าพารามิเตอร์ที่เป็น
--      UUID — PostgreSQL ไม่ auto-cast text→uuid ตอน resolve function overload
--      (เป็นแค่ assignment cast ไม่ใช่ implicit) จะได้ "function does not exist"
--      แก้โดยส่ง p_ticket_id ตรงๆ (เป็น UUID type อยู่แล้ว ไม่ต้อง cast)
--
--   7. RLS: spec เดิม ALTER TABLE ... ENABLE ROW LEVEL SECURITY ให้
--      match_room_staff และ mercy_fill_tickets แต่ไม่ได้ใส่ SELECT policy ให้
--      เลยสักตัว — Postgres/Supabase default-deny เมื่อเปิด RLS แล้วไม่มี policy
--      แปลว่า nested select `match_room_staff(*)` ใน getRoomDetails() จะว่างเปล่า
--      เสมอ (กระทบ Staff Oversight Box บนหน้า UI โดยตรง) เพิ่ม public read policy
--      ให้ทั้งสองตาราง ให้สอดคล้องกับตารางอื่นในแพตช์นี้ที่เปิดอ่านสาธารณะหมด
--
--   8. [พบตอนรันซ้ำ — 42710 policy already exists] CREATE POLICY ไม่มี
--      IF NOT EXISTS ให้ใช้ (ต่างจาก CREATE TABLE IF NOT EXISTS / DO-block
--      enum check ด้านบนที่กันไว้แล้ว) รันไฟล์นี้ซ้ำครั้งที่สองเลยพังที่ policy
--      แรกสุดทันที เพิ่ม DROP POLICY IF EXISTS นำหน้าทุก CREATE POLICY ในหมวด 4
--      ให้รันซ้ำได้ปลอดภัยเหมือนส่วนอื่นของไฟล์
--
--   9. [พบตอนรัน daily_quest_and_affiliate_v6.sql ทีหลัง — 23514 check
--      constraint violated] ไฟล์นั้น (คนละ feature branch, พัฒนาพร้อมกัน) ก็
--      DROP/ADD ap_ledger_reason_check เหมือนกัน แต่ใส่แค่ 'QUEST_REWARD'/
--      'REFERRAL' ของตัวเอง ไม่มี 'SCRIM_ESCROW_LOCK'/'SCRIM_MERCY_RINGER_STAKE'
--      — พอรันไฟล์นั้นทับ constraint ของไฟล์นี้ทิ้ง แถวเก่าที่มี reason แบบ
--      SCRIM_* (จากการสร้างห้อง scrim จริง) เลยชน constraint ใหม่ทันที แก้โดยใส่
--      'QUEST_REWARD'/'REFERRAL' รวมเข้ามาในหมวด 5 ด้านล่างด้วย ให้เป็น union
--      เดียวกันทั้งสองไฟล์ ไม่ว่าจะรันไฟล์ไหนก่อน-หลังก็ปลอดภัย
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS & ENUMS DEFINITIONS
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scrim_room_status_enum') THEN
        CREATE TYPE public.scrim_room_status_enum AS ENUM (
            'PENDING_APPROVAL',
            'APPROVED',
            'LOBBY_PREPARING',
            'READY_CHECK',
            'LIVE',
            'RESOLVED',
            'DISPUTED',
            'CANCELLED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scrim_participant_role_enum') THEN
        CREATE TYPE public.scrim_participant_role_enum AS ENUM (
            'TEAM_A_STARTER',
            'TEAM_B_STARTER',
            'RESERVE_SUB',
            'STAFF_OBSERVER'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'valorant_agent_role_enum') THEN
        CREATE TYPE public.valorant_agent_role_enum AS ENUM (
            'DUELIST',
            'INITIATOR',
            'CONTROLLER',
            'SENTINEL',
            'FLEX'
        );
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. CORE TABLES
-- -----------------------------------------------------------------------------

-- 2.1 Match Rooms Master Table
-- Fix 1 (Alis Flag 1): chk_booking_window ถูกตัดออก — NOW() evaluate ครั้งเดียว
-- ตอน CREATE TABLE ไม่มีผลจริง validation อยู่ใน create_scrim_room() แทน
CREATE TABLE IF NOT EXISTS public.match_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(128) NOT NULL,
    creator_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    team_a_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    team_b_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    min_ap_stake NUMERIC(12,2) NOT NULL DEFAULT 100.00 CHECK (min_ap_stake >= 0),
    total_escrow_ap NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_escrow_ap >= 0),
    status public.scrim_room_status_enum NOT NULL DEFAULT 'PENDING_APPROVAL',
    target_tier_min VARCHAR(32) DEFAULT 'GOLD',
    target_tier_max VARCHAR(32) DEFAULT 'RADIANT',
    riot_lobby_code VARCHAR(128),
    auto_audit_approved BOOLEAN NOT NULL DEFAULT false,
    mercy_beacon_active BOOLEAN NOT NULL DEFAULT false,
    mercy_beacon_triggered_at TIMESTAMPTZ,
    forfeit_deadline_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Match Room Participants Table (Max 12 Capacity)
CREATE TABLE IF NOT EXISTS public.match_room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.match_rooms(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    team_side VARCHAR(10) NOT NULL CHECK (team_side IN ('TEAM_A', 'TEAM_B', 'SPECTATOR')),
    role_type public.scrim_participant_role_enum NOT NULL DEFAULT 'TEAM_A_STARTER',
    agent_role_preference public.valorant_agent_role_enum DEFAULT 'FLEX',
    ap_staked NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (ap_staked >= 0),
    has_paid_escrow BOOLEAN NOT NULL DEFAULT false,
    is_ready_confirmed BOOLEAN NOT NULL DEFAULT false,
    is_mercy_ringer BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_room_player UNIQUE (room_id, player_id)
);

-- 2.3 Match Room Staff Oversight Table
CREATE TABLE IF NOT EXISTS public.match_room_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.match_rooms(id) ON DELETE CASCADE,
    staff_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    staff_role VARCHAR(32) NOT NULL DEFAULT 'REFEREE' CHECK (staff_role IN ('REFEREE', 'OBSERVER', 'ADMIN', 'CASTER')),
    is_active_monitoring BOOLEAN NOT NULL DEFAULT true,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_room_staff UNIQUE (room_id, staff_player_id)
);

-- 2.4 Mercy Sub Pool Table (On-Call Ringers)
CREATE TABLE IF NOT EXISTS public.mercy_sub_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL UNIQUE REFERENCES public.players(id) ON DELETE CASCADE,
    preferred_role public.valorant_agent_role_enum NOT NULL DEFAULT 'FLEX',
    rank_tier VARCHAR(32) NOT NULL DEFAULT 'DIAMOND',
    is_on_call BOOLEAN NOT NULL DEFAULT true,
    ap_stake_budget NUMERIC(12,2) NOT NULL DEFAULT 100.00 CHECK (ap_stake_budget >= 0),
    last_beacon_notified_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 Mercy Fill Tickets Table
CREATE TABLE IF NOT EXISTS public.mercy_fill_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.match_rooms(id) ON DELETE CASCADE,
    missing_team_side VARCHAR(10) NOT NULL CHECK (missing_team_side IN ('TEAM_A', 'TEAM_B')),
    required_role public.valorant_agent_role_enum NOT NULL DEFAULT 'FLEX',
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FILLED', 'EXPIRED', 'CANCELLED')),
    filled_by_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 Match Room Tactical Chat Messages (Fix 2 — new table, see header)
CREATE TABLE IF NOT EXISTS public.match_room_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id     UUID NOT NULL REFERENCES public.match_rooms(id) ON DELETE CASCADE,
    sender_id   UUID REFERENCES public.players(id) ON DELETE CASCADE,
    sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('TEAM_A', 'TEAM_B', 'REFEREE', 'SYSTEM')),
    message     TEXT NOT NULL CHECK (char_length(message) <= 500),
    is_system   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. INDEXES FOR HIGH-THROUGHPUT QUERYING
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_match_rooms_status_time ON public.match_rooms(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_match_room_part_lookup ON public.match_room_participants(room_id, team_side);
CREATE INDEX IF NOT EXISTS idx_mercy_sub_pool_oncall ON public.mercy_sub_pool(is_on_call, preferred_role);
CREATE INDEX IF NOT EXISTS idx_mercy_fill_tickets_room ON public.mercy_fill_tickets(room_id, status);
CREATE INDEX IF NOT EXISTS idx_match_room_messages_room ON public.match_room_messages(room_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.match_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_room_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercy_sub_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercy_fill_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_room_messages ENABLE ROW LEVEL SECURITY;

-- Fix 8: CREATE POLICY has no IF NOT EXISTS guard (unlike the CREATE TABLE
-- IF NOT EXISTS / DO-block enum checks above), so re-running this migration
-- after a prior successful run fails with 42710 "policy already exists" on
-- the very first one. DROP POLICY IF EXISTS before each CREATE POLICY makes
-- the whole file safe to run more than once.

-- Public Read Match Rooms
DROP POLICY IF EXISTS "Public Read Match Rooms" ON public.match_rooms;
CREATE POLICY "Public Read Match Rooms" ON public.match_rooms FOR SELECT USING (true);

-- Participant Read Match Room Members
DROP POLICY IF EXISTS "Participants Read Room Members" ON public.match_room_participants;
CREATE POLICY "Participants Read Room Members" ON public.match_room_participants FOR SELECT USING (true);

-- Fix 7: match_room_staff had RLS enabled but zero SELECT policy in the
-- original spec — nested `match_room_staff(*)` reads always returned empty.
DROP POLICY IF EXISTS "Public Read Match Room Staff" ON public.match_room_staff;
CREATE POLICY "Public Read Match Room Staff" ON public.match_room_staff FOR SELECT USING (true);

-- Mercy Sub Pool Public Read
DROP POLICY IF EXISTS "Public Read Mercy Sub Pool" ON public.mercy_sub_pool;
CREATE POLICY "Public Read Mercy Sub Pool" ON public.mercy_sub_pool FOR SELECT USING (true);

-- Mercy Sub Pool Owner Update
DROP POLICY IF EXISTS "Owner Manage Mercy Sub Pool" ON public.mercy_sub_pool;
CREATE POLICY "Owner Manage Mercy Sub Pool" ON public.mercy_sub_pool
    FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.players WHERE id = player_id));

-- Fix 7: same default-deny trap as match_room_staff — mercy beacons are
-- broadcast to everyone, ticket visibility should be public too.
DROP POLICY IF EXISTS "Public Read Mercy Fill Tickets" ON public.mercy_fill_tickets;
CREATE POLICY "Public Read Mercy Fill Tickets" ON public.mercy_fill_tickets FOR SELECT USING (true);

-- Tactical Lobby Chat: readable by anyone (mirrors the other room tables in
-- this patch); writes only ever happen server-side via the admin client in
-- lib/actions/match-room.ts, which bypasses RLS, so no INSERT policy is
-- required for the app to function — still documented as read-only here.
DROP POLICY IF EXISTS "Public Read Match Room Messages" ON public.match_room_messages;
CREATE POLICY "Public Read Match Room Messages" ON public.match_room_messages FOR SELECT USING (true);

-- -----------------------------------------------------------------------------
-- 5. ap_ledger: allow the new Scrim Escrow reasons (Fix 3)
--    (เก็บค่าเดิมทั้งหมดจาก 20260910020000_t71_phase7_predictions_watch_v2.sql
--    ไว้ครบ แล้วเพิ่มสองค่าใหม่ท้ายรายการ)
--
--    Fix 9 [23514 check constraint violated]: 20260914_daily_quest_and_affiliate_v6.sql
--    (คนละ feature branch, พัฒนาพร้อมกัน) ก็ DROP/ADD constraint นี้เหมือนกัน แล้วเพิ่ม
--    'QUEST_REWARD'/'REFERRAL' ของมันเองแทน — เพิ่มสองค่านั้นเข้ามาด้วยที่นี่ ให้เป็น union
--    เดียวกัน ไม่ว่าจะรัน migration ไหนก่อน-หลังก็ไม่ไปเขี่ยค่าของอีกไฟล์ทิ้ง
-- -----------------------------------------------------------------------------
ALTER TABLE public.ap_ledger DROP CONSTRAINT IF EXISTS ap_ledger_reason_check;
ALTER TABLE public.ap_ledger ADD CONSTRAINT ap_ledger_reason_check
    CHECK (reason IN ('WATCH_REWARD', 'CLAWBACK', 'ADMIN_ADJUSTMENT', 'STORE_REDEEM', 'TOP_UP', 'REFUND_AP_CREDIT', 'PENALTY_FINE', 'SUBSCRIPTION_RENEWAL', 'MARKETPLACE_BID', 'MARKETPLACE_REFUND', 'MARKETPLACE_SOLD', 'ESCROW_LOCK', 'ESCROW_SETTLED', 'ESCROW_AUTO_RELEASE', 'PREDICTION_BUY', 'PREDICTION_PAYOUT', 'PREDICTION_REFUND_VOID', 'PREDICTION_HOUSE_FEE_BURN', 'WATCH_EARN', 'PREDICTION_JACKPOT_PAYOUT', 'SCRIM_ESCROW_LOCK', 'SCRIM_MERCY_RINGER_STAKE', 'QUEST_REWARD', 'REFERRAL'));

-- -----------------------------------------------------------------------------
-- 6. ATOMIC RPC PROCEDURES WITH ACID & SAFETY GUARDS
-- -----------------------------------------------------------------------------

-- 6.1 Create Scheduled Scrim Room RPC
CREATE OR REPLACE FUNCTION public.create_scrim_room(
    p_title VARCHAR,
    p_creator_player_id UUID,
    p_scheduled_at TIMESTAMPTZ,
    p_min_ap_stake NUMERIC,
    p_target_tier_min VARCHAR DEFAULT 'GOLD',
    p_target_tier_max VARCHAR DEFAULT 'RADIANT',
    p_idempotency_key VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_auth_id UUID;
    v_new_room_id UUID;
    v_escrow_res JSONB;
BEGIN
    SET LOCAL lock_timeout = '3s';

    -- Anti-BOLA Security Check
    SELECT user_id INTO v_user_auth_id FROM public.players WHERE id = p_creator_player_id;
    IF v_user_auth_id <> auth.uid() AND auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'UNAUTHORIZED_ACCESS: Cannot create room for another player' USING ERRCODE = '42501';
    END IF;

    -- Validate Scheduled Time Window (1 to 7 Days)
    IF p_scheduled_at < (NOW() + INTERVAL '1 hour') OR p_scheduled_at > (NOW() + INTERVAL '7 days') THEN
        RAISE EXCEPTION 'INVALID_SCHEDULE_TIME: Room booking must be between 1 hour and 7 days in advance' USING ERRCODE = 'P0001';
    END IF;

    -- Fix 5: generate the room id up front so it can be passed to move_ap()
    -- as a real UUID reference_id instead of the invalid 'PENDING_ROOM' text
    -- literal the original spec used.
    v_new_room_id := gen_random_uuid();

    -- Deduct AP Stake from Creator into Escrow
    v_escrow_res := public.move_ap(
        p_creator_player_id,
        -p_min_ap_stake,
        'SCRIM_ESCROW_LOCK',
        p_idempotency_key,
        'match_rooms',
        v_new_room_id
    );

    -- Fix 4: the original spec never checked this result — an insufficient
    -- balance would silently create the room and mark escrow as paid anyway.
    IF NOT COALESCE((v_escrow_res->>'success')::boolean, false) THEN
        RETURN jsonb_build_object('success', false, 'error', v_escrow_res->>'error');
    END IF;

    -- Insert Room Record
    INSERT INTO public.match_rooms (
        id, title, creator_player_id, scheduled_at, min_ap_stake, total_escrow_ap,
        status, target_tier_min, target_tier_max, forfeit_deadline_at
    ) VALUES (
        v_new_room_id, p_title, p_creator_player_id, p_scheduled_at, p_min_ap_stake, p_min_ap_stake,
        'PENDING_APPROVAL', p_target_tier_min, p_target_tier_max, p_scheduled_at + INTERVAL '15 minutes'
    );

    -- Insert Creator as Team A Starter
    INSERT INTO public.match_room_participants (
        room_id, player_id, team_side, role_type, ap_staked, has_paid_escrow, is_ready_confirmed
    ) VALUES (
        v_new_room_id, p_creator_player_id, 'TEAM_A', 'TEAM_A_STARTER', p_min_ap_stake, true, true
    );

    RETURN jsonb_build_object(
        'success', true,
        'room_id', v_new_room_id,
        'escrow_staked', p_min_ap_stake,
        'status', 'PENDING_APPROVAL'
    );
END;
$$;

-- 6.2 Claim Mercy Sub Slot RPC
CREATE OR REPLACE FUNCTION public.claim_mercy_sub_slot(
    p_ticket_id UUID,
    p_ringer_player_id UUID,
    p_idempotency_key VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ticket RECORD;
    v_room RECORD;
    v_user_auth_id UUID;
    v_res JSONB;
BEGIN
    SET LOCAL lock_timeout = '3s';

    -- Anti-BOLA Security Check
    SELECT user_id INTO v_user_auth_id FROM public.players WHERE id = p_ringer_player_id;
    IF v_user_auth_id <> auth.uid() AND auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'UNAUTHORIZED_ACCESS: Cannot claim ringer slot for another player' USING ERRCODE = '42501';
    END IF;

    -- Lock Mercy Ticket
    SELECT * INTO v_ticket FROM public.mercy_fill_tickets WHERE id = p_ticket_id AND status = 'OPEN' FOR UPDATE;
    IF v_ticket.id IS NULL THEN
        RAISE EXCEPTION 'TICKET_NOT_AVAILABLE: Ticket is either filled, expired, or invalid' USING ERRCODE = 'P0002';
    END IF;

    -- Lock Room
    SELECT * INTO v_room FROM public.match_rooms WHERE id = v_ticket.room_id FOR UPDATE;

    -- Deduct AP Stake from Ringer
    -- Fix 6: p_ticket_id is already UUID — the original spec's `::text` cast
    -- broke function-overload resolution against move_ap()'s UUID parameter.
    v_res := public.move_ap(
        p_ringer_player_id,
        -v_room.min_ap_stake,
        'SCRIM_MERCY_RINGER_STAKE',
        p_idempotency_key,
        'mercy_fill_tickets',
        p_ticket_id
    );

    -- Fix 4: same missing success check as create_scrim_room() above.
    IF NOT COALESCE((v_res->>'success')::boolean, false) THEN
        RETURN jsonb_build_object('success', false, 'error', v_res->>'error');
    END IF;

    -- Insert Ringer to Room Participants
    INSERT INTO public.match_room_participants (
        room_id, player_id, team_side, role_type, agent_role_preference,
        ap_staked, has_paid_escrow, is_ready_confirmed, is_mercy_ringer
    ) VALUES (
        v_room.id, p_ringer_player_id, v_ticket.missing_team_side, 'RESERVE_SUB', v_ticket.required_role,
        v_room.min_ap_stake, true, true, true
    );

    -- Update Ticket Status
    UPDATE public.mercy_fill_tickets
    SET status = 'FILLED', filled_by_player_id = p_ringer_player_id, updated_at = NOW()
    WHERE id = v_ticket.id;

    -- Update Room Total Escrow
    UPDATE public.match_rooms
    SET total_escrow_ap = total_escrow_ap + v_room.min_ap_stake, updated_at = NOW()
    WHERE id = v_room.id;

    RETURN jsonb_build_object(
        'success', true,
        'room_id', v_room.id,
        'assigned_side', v_ticket.missing_team_side,
        'staked_ap', v_room.min_ap_stake
    );
END;
$$;

COMMIT;
