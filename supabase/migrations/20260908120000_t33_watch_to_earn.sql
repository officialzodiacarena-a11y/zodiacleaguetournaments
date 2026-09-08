-- =============================================================================
-- MIGRATION: T3.3 — Streaming & AP Distribution (Watch-to-Earn)
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น
-- หมายเหตุ: move_ap() และ claim_watch_reward() มีอยู่แล้วในระบบ — migration นี้ไม่แตะ
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
    reason           TEXT NOT NULL CHECK (reason IN ('WATCH_REWARD', 'CLAWBACK', 'ADMIN_ADJUSTMENT')),
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
