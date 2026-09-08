-- =============================================================================
-- MIGRATION: T3.3 — Streaming & AP Distribution (Watch-to-Earn)
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น
-- หมายเหตุ: verify กับ DB จริงแล้วว่า move_ap()/claim_watch_reward() ยังไม่มีอยู่จริง
-- (ต่างจากที่สเปคเดิมสมมติไว้) จึงสร้างไว้ท้ายไฟล์นี้ — เป็นฟังก์ชันกลางของระบบ AP
-- ที่ T3.4 (Redemption Store) เรียกใช้ผ่าน move_ap() ด้วยเช่นกัน (reason='STORE_REDEEM')
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ap_earning_rules — กติกาการให้ AP ต่อสตรีม (interval, cap, ฯลฯ)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ap_earning_rules (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 TEXT NOT NULL,
    ap_per_interval      NUMERIC(6,2) NOT NULL DEFAULT 1,
    interval_seconds     INTEGER NOT NULL DEFAULT 60,
    daily_cap_ap         INTEGER NOT NULL DEFAULT 100,
    max_session_minutes  INTEGER NOT NULL DEFAULT 180,
    is_active            BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- streams — อาจมีอยู่แล้วบางส่วน (จากสเปคก่อนหน้า) เติมคอลัมน์ที่ T3.3 ต้องใช้
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.streams (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title             TEXT NOT NULL,
    match_id          UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    is_earn_eligible  BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- type/status ใช้ ENUM stream_type_type / stream_status_type ที่มีอยู่แล้วใน DB (ไม่ใช่ TEXT + CHECK)
ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS type stream_type_type;
ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS status stream_status_type NOT NULL DEFAULT 'SCHEDULED';
ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL;
ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS earning_rule_id UUID REFERENCES public.ap_earning_rules(id) ON DELETE SET NULL;
ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS ap_budget_total NUMERIC(10,2);
ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS ap_budget_spent NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS stream_url TEXT;

CREATE INDEX IF NOT EXISTS idx_streams_status ON public.streams (status);
CREATE INDEX IF NOT EXISTS idx_streams_tournament ON public.streams (tournament_id);

-- -----------------------------------------------------------------------------
-- watch_sessions — วงจรชีวิตของการดูสตรีมเพื่อรับ AP
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.watch_sessions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id             UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
    player_id             UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    earning_rule_id       UUID REFERENCES public.ap_earning_rules(id) ON DELETE SET NULL,
    status                TEXT NOT NULL DEFAULT 'ACTIVE'
                              CHECK (status IN ('ACTIVE', 'CLAIMED', 'EXPIRED', 'ABANDONED')),
    started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_heartbeat_at     TIMESTAMPTZ,
    position_sec          NUMERIC(10,2) NOT NULL DEFAULT 0,
    watched_seconds       NUMERIC(10,2) NOT NULL DEFAULT 0,
    risk_score            NUMERIC(5,2) NOT NULL DEFAULT 0,
    is_anomalous          BOOLEAN NOT NULL DEFAULT false,
    anomaly_note          TEXT,
    claimed_at            TIMESTAMPTZ,
    ap_awarded            NUMERIC(10,2),
    start_idempotency_key TEXT,
    device_id             TEXT,
    ip_address            TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ผู้เล่นหนึ่งคนมี session ACTIVE ได้ทีละ 1 รายการเท่านั้น (กันดูหลายสตรีมพร้อมกันเพื่อฟาร์ม AP)
CREATE UNIQUE INDEX IF NOT EXISTS uq_watch_sessions_active_player
    ON public.watch_sessions (player_id)
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_watch_sessions_stream ON public.watch_sessions (stream_id);
CREATE INDEX IF NOT EXISTS idx_watch_sessions_player ON public.watch_sessions (player_id);
CREATE INDEX IF NOT EXISTS idx_watch_sessions_device ON public.watch_sessions (device_id);
CREATE INDEX IF NOT EXISTS idx_watch_sessions_ip ON public.watch_sessions (ip_address);

-- -----------------------------------------------------------------------------
-- watch_heartbeats — log ทุก heartbeat เพื่อ audit/anti-abuse
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.watch_heartbeats (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        UUID NOT NULL REFERENCES public.watch_sessions(id) ON DELETE CASCADE,
    position_sec      NUMERIC(10,2) NOT NULL,
    playback_rate     NUMERIC(4,2) NOT NULL DEFAULT 1,
    delta_sec         NUMERIC(10,2) NOT NULL,
    watched_seconds   NUMERIC(10,2) NOT NULL,
    is_anomalous      BOOLEAN NOT NULL DEFAULT false,
    anomaly_reason    TEXT,
    risk_score_delta  NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watch_heartbeats_session ON public.watch_heartbeats (session_id, created_at);

-- -----------------------------------------------------------------------------
-- ap_daily_limits — โควต้า AP ต่อวันต่อผู้เล่น (Asia/Bangkok)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ap_daily_limits (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id   UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    limit_date  DATE NOT NULL,
    ap_earned   NUMERIC(10,2) NOT NULL DEFAULT 0,
    daily_cap   NUMERIC(10,2) NOT NULL DEFAULT 100,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ap_daily_limits_player_date
    ON public.ap_daily_limits (player_id, limit_date);

-- -----------------------------------------------------------------------------
-- ap_ledger — ประวัติการเคลื่อนไหว AP ทั้งหมด (เขียนโดย move_ap / claim_watch_reward)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ap_ledger (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id        UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    amount           NUMERIC(10,2) NOT NULL,
    reason           TEXT NOT NULL CHECK (reason IN ('WATCH_REWARD', 'CLAWBACK', 'ADMIN_ADJUSTMENT', 'STORE_REDEEM')),
    reference_type   TEXT,
    reference_id     UUID,
    idempotency_key  TEXT UNIQUE,
    balance_after    NUMERIC(10,2) NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ap_ledger_player ON public.ap_ledger (player_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- abuse_flags — ผลตรวจจับความผิดปกติจาก cron abuse-analysis
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.abuse_flags (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id        UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    flag_type        TEXT NOT NULL CHECK (flag_type IN ('DEVICE_MULTI_ACCOUNT', 'IP_CLUSTER', 'BOT_PATTERN')),
    severity         TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    details          JSONB NOT NULL DEFAULT '{}'::jsonb,
    status           TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REVIEWED', 'CLAWED_BACK', 'DISMISSED')),
    clawback_amount  NUMERIC(10,2),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at      TIMESTAMPTZ,
    reviewed_by      UUID REFERENCES public.players(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_abuse_flags_player ON public.abuse_flags (player_id);
CREATE INDEX IF NOT EXISTS idx_abuse_flags_status ON public.abuse_flags (status);

-- -----------------------------------------------------------------------------
-- move_ap — จุดเดียวที่แก้ยอด AP ของผู้เล่น: อ่านยอดปัจจุบันจาก ap_ledger.balance_after
-- แถวล่าสุด, เช็ค idempotency_key ซ้ำ, เช็คห้ามติดลบ, insert แถวใหม่ลง ledger,
-- และถ้าเป็น WATCH_REWARD ที่เป็นบวกจะพ่วงอัปเดต ap_daily_limits ให้ในตัว
-- ล็อกต่อผู้เล่นด้วย pg_advisory_xact_lock กันสอง request แข่งกันแก้ยอดพร้อมกัน
-- -----------------------------------------------------------------------------
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

    PERFORM pg_advisory_xact_lock(hashtext(p_player_id::text)::bigint);

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

    SELECT balance_after INTO v_current_balance
    FROM public.ap_ledger
    WHERE player_id = p_player_id
    ORDER BY created_at DESC
    LIMIT 1;

    v_current_balance := COALESCE(v_current_balance, 0);
    v_new_balance := v_current_balance + p_amount;

    IF v_new_balance < 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_AP_BALANCE',
            'current_balance', v_current_balance,
            'requested', p_amount
        );
    END IF;

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

-- -----------------------------------------------------------------------------
-- claim_watch_reward — ปิด watch_sessions (ACTIVE -> CLAIMED) แบบกันเบิ้ล, คำนวณ AP
-- จาก watched_seconds/interval_seconds * ap_per_interval, บังคับ daily cap,
-- ปฏิเสธ session ที่ is_anomalous, และ mint AP ผ่าน move_ap() (reason=WATCH_REWARD)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_watch_reward(p_session_id UUID)
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
            'claim-session-' || p_session_id::text,
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
