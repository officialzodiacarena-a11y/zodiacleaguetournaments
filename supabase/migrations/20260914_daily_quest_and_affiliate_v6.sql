-- =============================================================================
-- ZODIAC ARENA - DAILY QUEST & MULTI-TIER AFFILIATE SYSTEM MIGRATION SCRIPT
-- Document Code: SPEC-QUEST-AFFILIATE-V6.0202
-- Standard: ZODIAC ARENA ACID Financial Ledger & Anti-BOLA Protocol V5.01
--
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น — Claude ไม่มีสิทธิ์รัน SQL
--
-- หมายเหตุการ verify กับ DB จริงก่อนเขียนไฟล์นี้ (ตาม AGENTS.md ข้อ 4):
--   1. public.players.id เป็น UUID, players.user_id เป็น UUID อ้าง auth.users — ตรงกับที่
--      สเปคสมมติไว้ ใช้อ้างอิง FK ได้ตรง ๆ
--   2. public.ap_daily_limits มีอยู่แล้วจริง (สร้างใน 20260908170000_t40) พร้อมคอลัมน์
--      daily_cap ตามที่สเปคสมมติไว้ — ไม่ต้องสร้างใหม่หรือแก้โครงสร้าง
--   3. public.move_ap(p_player_id UUID, p_amount NUMERIC, p_reason TEXT,
--      p_idempotency_key TEXT, p_reference_type TEXT, p_reference_id UUID) ของจริง
--      มี p_reference_id เป็นชนิด UUID — ต่างจากดราฟต์สเปคที่ยัด p_quest_id (VARCHAR เช่น
--      'QUEST_DAILY_LOGIN') เข้าพารามิเตอร์นี้ตรง ๆ ซึ่งจะพังด้วย
--      "invalid input syntax for type uuid" ทันทีตอนรัน — แก้โดยส่ง NULL แทน (เก็บ
--      quest_id ไว้ใน idempotency_key และ affiliate_rewards_ledger.reference_tx_id อยู่แล้ว
--      เพียงพอต่อการ audit) ส่วน process_affiliate_spend_cashback ยังส่ง
--      p_reference_tx_id ได้ตรง ๆ เพราะ orders.id เป็น UUID จริง (verify กับ
--      20260908130000_t34_redemption_store.sql แล้ว)
--   4. public.ap_ledger.reason เป็น TEXT + CHECK constraint (ไม่ใช่ ENUM) และค่าที่อนุญาต
--      ปัจจุบัน (ล่าสุดจาก 20260910020000_t71) ยังไม่มี 'QUEST_REWARD' และ 'REFERRAL' —
--      ต้อง DROP/ADD constraint ใหม่เพิ่มสองค่านี้เข้าไป (เก็บค่าเดิมทั้งหมดไว้ครบ) ไม่งั้า
--      INSERT INTO ap_ledger ภายใน move_ap() จะชน CHECK constraint ทันที
--   5. เพิ่ม guard เช็ค v_ledger_res->>'success' ใน claim_daily_quest_reward ก่อนจะ mark
--      claimed / เพิ่ม ap_daily_limits — ของดราฟต์สเปคเดิมไม่เช็ค ถ้า move_ap คืน
--      success:false (เช่น DUPLICATE_KEY) จะเดินหน้าปรับ ap_daily_limits/สถานะราวกับสำเร็จ
--      ทั้งที่ไม่มีการโอน AP จริง
--
-- Deviation อื่นที่ยังไม่ได้ทำ (ต้องให้อลิสตัดสินใจสโคปก่อน ไม่ตัดสินใจเอง):
--   - Sybil device/IP fingerprint auto-FLAGGED (ข้อ 4 ใน Feature_General) — ต้องมีตาราง/
--     แหล่งข้อมูล device_id, ip_address ของผู้เล่นแต่ละคนมาเทียบก่อน ยังไม่มี pipeline นี้ในระบบ
--     คอลัมน์ device_id_hash / ip_address_hash ใน affiliate_referrals เตรียมไว้ให้ แต่ตัว
--     "สแกนหาบัญชีซ้ำแล้วสลัก FLAGGED อัตโนมัติ" ยังไม่ implement เป็น trigger/RPC ในไฟล์นี้
--   - Clawback เมื่อ revoke KYC (Q10 ใน SPEC-DIA-007) — เป็นคำถามเชิงสถาปัตยกรรมใน Q&A
--     ไม่ใช่ Full Production Code ที่ถูกกำหนดไว้ใน DIA-001..005 จึงยังไม่ implement
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS & ENUMS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quest_type_enum') THEN
        CREATE TYPE public.quest_type_enum AS ENUM ('LOGIN', 'WATCH_STREAM', 'PLAY_MATCH', 'PREDICT_POOL', 'STREAK_7DAY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'affiliate_status_enum') THEN
        CREATE TYPE public.affiliate_status_enum AS ENUM ('PENDING_KYC', 'ACTIVE', 'FLAGGED', 'BLOCKED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'affiliate_reward_type_enum') THEN
        CREATE TYPE public.affiliate_reward_type_enum AS ENUM ('KYC_BONUS', 'STORE_CASHBACK', 'TOURNAMENT_CASHBACK');
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. TABLES DEFINITIONS
-- -----------------------------------------------------------------------------

-- 2.1 Daily Quests Master Catalog
CREATE TABLE IF NOT EXISTS public.daily_quests (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    reward_ap NUMERIC(12,2) NOT NULL CHECK (reward_ap > 0),
    quest_type public.quest_type_enum NOT NULL,
    target_count INT NOT NULL DEFAULT 1 CHECK (target_count > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Player Daily Quest Progress Table
CREATE TABLE IF NOT EXISTS public.player_daily_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    quest_id VARCHAR(64) NOT NULL REFERENCES public.daily_quests(id) ON DELETE CASCADE,
    quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
    current_count INT NOT NULL DEFAULT 0 CHECK (current_count >= 0),
    is_completed BOOLEAN NOT NULL DEFAULT false,
    is_claimed BOOLEAN NOT NULL DEFAULT false,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_player_quest_date UNIQUE (player_id, quest_id, quest_date)
);

-- 2.3 Affiliate Codes Table
CREATE TABLE IF NOT EXISTS public.affiliate_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL UNIQUE REFERENCES public.players(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL UNIQUE,
    total_referrals INT NOT NULL DEFAULT 0 CHECK (total_referrals >= 0),
    total_ap_earned NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_ap_earned >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 Affiliate Referrals Network Table
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL UNIQUE REFERENCES public.players(id) ON DELETE CASCADE,
    affiliate_code VARCHAR(32) NOT NULL REFERENCES public.affiliate_codes(code),
    status public.affiliate_status_enum NOT NULL DEFAULT 'PENDING_KYC',
    flag_reason TEXT,
    kyc_reward_claimed BOOLEAN NOT NULL DEFAULT false,
    device_id_hash VARCHAR(128),
    ip_address_hash VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_no_self_referral CHECK (referrer_id <> referee_id)
);

-- 2.5 Affiliate Rewards Audit Ledger Table
CREATE TABLE IF NOT EXISTS public.affiliate_rewards_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    tier_level INT NOT NULL CHECK (tier_level IN (1, 2)),
    reward_type public.affiliate_reward_type_enum NOT NULL,
    amount_ap NUMERIC(12,2) NOT NULL CHECK (amount_ap > 0),
    reference_tx_id VARCHAR(128),
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. INDEXES FOR HIGH-THROUGHPUT QUERYING
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_player_daily_quests_lookup ON public.player_daily_quests(player_id, quest_date);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referrer ON public.affiliate_referrals(referrer_id, status);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referee ON public.affiliate_referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_codes_code ON public.affiliate_codes(code);
CREATE INDEX IF NOT EXISTS idx_affiliate_rewards_referrer ON public.affiliate_rewards_ledger(referrer_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_rewards_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Quests Catalog" ON public.daily_quests FOR SELECT USING (true);
CREATE POLICY "Owner Read Quest Progress" ON public.player_daily_quests FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.players WHERE id = player_id));
CREATE POLICY "Public Read Affiliate Codes" ON public.affiliate_codes FOR SELECT USING (true);
CREATE POLICY "Referrer Read Referrals" ON public.affiliate_referrals FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.players WHERE id = referrer_id OR id = referee_id));
CREATE POLICY "Referrer Read Rewards Ledger" ON public.affiliate_rewards_ledger FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.players WHERE id = referrer_id));

-- -----------------------------------------------------------------------------
-- 5. ap_ledger: allow the new QUEST_REWARD / REFERRAL reasons
--    (เก็บค่าเดิมทั้งหมดจาก 20260910020000_t71_phase7_predictions_watch_v2.sql ไว้ครบ
--    แล้วเพิ่มสองค่าใหม่ท้ายรายการ — verify แล้วว่านี่คือ constraint เวอร์ชันล่าสุดของจริง)
-- -----------------------------------------------------------------------------
ALTER TABLE public.ap_ledger DROP CONSTRAINT IF EXISTS ap_ledger_reason_check;
ALTER TABLE public.ap_ledger ADD CONSTRAINT ap_ledger_reason_check
    CHECK (reason IN ('WATCH_REWARD', 'CLAWBACK', 'ADMIN_ADJUSTMENT', 'STORE_REDEEM', 'TOP_UP', 'REFUND_AP_CREDIT', 'PENALTY_FINE', 'SUBSCRIPTION_RENEWAL', 'MARKETPLACE_BID', 'MARKETPLACE_REFUND', 'MARKETPLACE_SOLD', 'ESCROW_LOCK', 'ESCROW_SETTLED', 'ESCROW_AUTO_RELEASE', 'PREDICTION_BUY', 'PREDICTION_PAYOUT', 'PREDICTION_REFUND_VOID', 'PREDICTION_HOUSE_FEE_BURN', 'WATCH_EARN', 'PREDICTION_JACKPOT_PAYOUT', 'QUEST_REWARD', 'REFERRAL'));

-- -----------------------------------------------------------------------------
-- 6. ATOMIC RPC PROCEDURES WITH SAFETY GUARDS
-- -----------------------------------------------------------------------------

-- 6.1 Claim Daily Quest Reward RPC
CREATE OR REPLACE FUNCTION public.claim_daily_quest_reward(
    p_player_id UUID,
    p_quest_id VARCHAR,
    p_idempotency_key VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quest RECORD;
    v_progress RECORD;
    v_daily_earned NUMERIC := 0.00;
    v_user_auth_id UUID;
    v_ledger_res JSONB;
BEGIN
    SET LOCAL lock_timeout = '3s';

    -- Anti-BOLA Verification
    SELECT user_id INTO v_user_auth_id FROM public.players WHERE id = p_player_id;
    IF v_user_auth_id IS NULL OR (v_user_auth_id <> auth.uid() AND auth.role() <> 'service_role') THEN
        RAISE EXCEPTION 'UNAUTHORIZED_ACCESS: Cannot claim quest for another player' USING ERRCODE = '42501';
    END IF;

    -- Quest Catalog Lock Check
    SELECT * INTO v_quest FROM public.daily_quests WHERE id = p_quest_id AND is_active = true;
    IF v_quest.id IS NULL THEN
        RAISE EXCEPTION 'QUEST_NOT_FOUND: Invalid or inactive quest' USING ERRCODE = 'P0001';
    END IF;

    -- Lock Player Quest Progress Row
    SELECT * INTO v_progress FROM public.player_daily_quests
    WHERE player_id = p_player_id AND quest_id = p_quest_id AND quest_date = CURRENT_DATE
    FOR UPDATE;

    IF v_progress.id IS NULL OR NOT v_progress.is_completed THEN
        RAISE EXCEPTION 'QUEST_NOT_COMPLETED: Quest conditions not met' USING ERRCODE = 'P0002';
    END IF;

    IF v_progress.is_claimed THEN
        RAISE EXCEPTION 'ALREADY_CLAIMED: Reward already claimed for today' USING ERRCODE = 'P0003';
    END IF;

    -- Daily AP Cap Check (100 AP Daily Cap, shared with Watch-to-Earn via ap_daily_limits)
    SELECT COALESCE(ap_earned, 0) INTO v_daily_earned
    FROM public.ap_daily_limits
    WHERE player_id = p_player_id AND limit_date = CURRENT_DATE
    FOR UPDATE;

    IF (v_daily_earned + v_quest.reward_ap) > 100.00 THEN
        RAISE EXCEPTION 'DAILY_CAP_EXCEEDED: Daily limit of 100 AP reached' USING ERRCODE = 'P0004';
    END IF;

    -- Atomic Credit AP via move_ap RPC
    -- หมายเหตุ: p_reference_id ของ move_ap() จริงเป็น UUID แต่ p_quest_id เป็น VARCHAR
    -- (เช่น 'QUEST_DAILY_LOGIN') จึงส่ง NULL แทนตรงนี้ — quest_id ยังสืบย้อนได้ครบจาก
    -- p_idempotency_key และจาก reference_type='daily_quests' ร่วมกับแถวนี้เอง
    v_ledger_res := public.move_ap(
        p_player_id,
        v_quest.reward_ap,
        'QUEST_REWARD',
        p_idempotency_key,
        'daily_quests',
        NULL
    );

    IF NOT COALESCE((v_ledger_res->>'success')::boolean, false) THEN
        RAISE EXCEPTION 'LEDGER_ERROR: % (%)', v_ledger_res->>'error', p_idempotency_key USING ERRCODE = 'P0005';
    END IF;

    -- Update Daily Limit Record
    INSERT INTO public.ap_daily_limits (player_id, limit_date, ap_earned)
    VALUES (p_player_id, CURRENT_DATE, v_quest.reward_ap)
    ON CONFLICT (player_id, limit_date)
    DO UPDATE SET ap_earned = public.ap_daily_limits.ap_earned + v_quest.reward_ap, updated_at = NOW();

    -- Mark Quest Progress as Claimed
    UPDATE public.player_daily_quests
    SET is_claimed = true, claimed_at = NOW(), updated_at = NOW()
    WHERE id = v_progress.id;

    RETURN jsonb_build_object(
        'success', true,
        'reward_ap', v_quest.reward_ap,
        'ledger_result', v_ledger_res,
        'message', 'Quest reward claimed successfully'
    );
END;
$$;

-- 6.2 Process Affiliate KYC Bonus RPC
CREATE OR REPLACE FUNCTION public.process_affiliate_kyc_bonus(p_referee_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ref RECORD;
    v_idempotency VARCHAR;
    v_bonus_ap NUMERIC := 50.00;
    v_ledger_res JSONB;
BEGIN
    SET LOCAL lock_timeout = '3s';

    SELECT * INTO v_ref FROM public.affiliate_referrals
    WHERE referee_id = p_referee_id AND status = 'PENDING_KYC'
    FOR UPDATE;

    IF v_ref.id IS NULL OR v_ref.kyc_reward_claimed THEN
        RETURN jsonb_build_object('success', false, 'message', 'No pending referral or reward already claimed');
    END IF;

    v_idempotency := 'aff_kyc_' || v_ref.referrer_id || '_' || p_referee_id;

    -- Credit Referrer +50 AP
    v_ledger_res := public.move_ap(
        v_ref.referrer_id,
        v_bonus_ap,
        'REFERRAL',
        v_idempotency,
        'affiliate_referrals',
        v_ref.id
    );

    IF NOT COALESCE((v_ledger_res->>'success')::boolean, false) THEN
        RETURN jsonb_build_object('success', false, 'message', v_ledger_res->>'error');
    END IF;

    -- Audit Ledger Entry
    INSERT INTO public.affiliate_rewards_ledger (
        referrer_id, referee_id, tier_level, reward_type, amount_ap, reference_tx_id, idempotency_key
    ) VALUES (
        v_ref.referrer_id, p_referee_id, 1, 'KYC_BONUS', v_bonus_ap, p_referee_id::text, v_idempotency
    );

    -- Update Code Stats & Referral Status
    UPDATE public.affiliate_codes SET total_referrals = total_referrals + 1, total_ap_earned = total_ap_earned + v_bonus_ap WHERE player_id = v_ref.referrer_id;
    UPDATE public.affiliate_referrals SET status = 'ACTIVE', kyc_reward_claimed = true, updated_at = NOW() WHERE id = v_ref.id;

    RETURN jsonb_build_object('success', true, 'referrer_id', v_ref.referrer_id, 'bonus_ap', v_bonus_ap, 'ledger', v_ledger_res);
END;
$$;

-- 6.3 Process Affiliate Spend Cashback RPC (Tier 1 5% & Tier 2 2%)
CREATE OR REPLACE FUNCTION public.process_affiliate_spend_cashback(
    p_buyer_id UUID,
    p_spend_amount_ap NUMERIC,
    p_reference_tx_id VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tier1_ref RECORD;
    v_tier2_ref RECORD;
    v_t1_cb NUMERIC;
    v_t2_cb NUMERIC;
    v_t1_idem VARCHAR;
    v_t2_idem VARCHAR;
BEGIN
    SET LOCAL lock_timeout = '3s';

    IF p_spend_amount_ap <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid spend amount');
    END IF;

    -- Find Tier 1 Referrer
    SELECT * INTO v_tier1_ref FROM public.affiliate_referrals WHERE referee_id = p_buyer_id AND status = 'ACTIVE';
    IF v_tier1_ref.id IS NOT NULL THEN
        v_t1_cb := ROUND(p_spend_amount_ap * 0.05, 2);
        IF v_t1_cb > 0 THEN
            v_t1_idem := 'aff_cb_t1_' || v_tier1_ref.referrer_id || '_' || p_reference_tx_id;
            PERFORM public.move_ap(v_tier1_ref.referrer_id, v_t1_cb, 'REFERRAL', v_t1_idem, 'orders', p_reference_tx_id::uuid);
            INSERT INTO public.affiliate_rewards_ledger (
                referrer_id, referee_id, tier_level, reward_type, amount_ap, reference_tx_id, idempotency_key
            ) VALUES (
                v_tier1_ref.referrer_id, p_buyer_id, 1, 'STORE_CASHBACK', v_t1_cb, p_reference_tx_id, v_t1_idem
            );
            UPDATE public.affiliate_codes SET total_ap_earned = total_ap_earned + v_t1_cb WHERE player_id = v_tier1_ref.referrer_id;
        END IF;

        -- Find Tier 2 Referrer (Who referred Tier 1 Referrer)
        SELECT * INTO v_tier2_ref FROM public.affiliate_referrals WHERE referee_id = v_tier1_ref.referrer_id AND status = 'ACTIVE';
        IF v_tier2_ref.id IS NOT NULL THEN
            v_t2_cb := ROUND(p_spend_amount_ap * 0.02, 2);
            IF v_t2_cb > 0 THEN
                v_t2_idem := 'aff_cb_t2_' || v_tier2_ref.referrer_id || '_' || p_reference_tx_id;
                PERFORM public.move_ap(v_tier2_ref.referrer_id, v_t2_cb, 'REFERRAL', v_t2_idem, 'orders', p_reference_tx_id::uuid);
                INSERT INTO public.affiliate_rewards_ledger (
                    referrer_id, referee_id, tier_level, reward_type, amount_ap, reference_tx_id, idempotency_key
                ) VALUES (
                    v_tier2_ref.referrer_id, p_buyer_id, 2, 'STORE_CASHBACK', v_t2_cb, p_reference_tx_id, v_t2_idem
                );
                UPDATE public.affiliate_codes SET total_ap_earned = total_ap_earned + v_t2_cb WHERE player_id = v_tier2_ref.referrer_id;
            END IF;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'tier1_cashback', COALESCE(v_t1_cb, 0), 'tier2_cashback', COALESCE(v_t2_cb, 0));
END;
$$;

-- Seed Default Quests Catalog
INSERT INTO public.daily_quests (id, title, description, reward_ap, quest_type, target_count, is_active)
VALUES
    ('QUEST_DAILY_LOGIN', 'Daily Check-In', 'ล็อกอินเข้าสู่ระบบ ZODIAC ARENA ประจำวัน', 10.00, 'LOGIN', 1, true),
    ('QUEST_WATCH_STREAM', 'Stream Enthusiast', 'รับชมสตรีมสดสะสมครบ 15 นาที', 20.00, 'WATCH_STREAM', 15, true),
    ('QUEST_PLAY_MATCH', 'Arena Warrior', 'ลงแข่งขันในทัวร์นาเมนต์หรือ Scrim อย่างน้อย 1 แมตช์', 30.00, 'PLAY_MATCH', 1, true),
    ('QUEST_PREDICT_POOL', 'Oracle Predictor', 'ร่วมทายผลการแข่งขันใน Pari-Mutuel Prediction Pool 1 ครั้ง', 15.00, 'PREDICT_POOL', 1, true),
    ('QUEST_STREAK_7DAY', '7-Day Streak Bonus', 'เช็กอินต่อเนื่องครบ 7 วัน', 50.00, 'STREAK_7DAY', 7, true)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title, reward_ap = EXCLUDED.reward_ap, is_active = EXCLUDED.is_active;

COMMIT;
