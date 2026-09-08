-- =============================================================================
-- MIGRATION: T3.2 — player_stats materialized cache table
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.player_stats (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id       UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    game_id         UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    season_id       UUID REFERENCES public.seasons(id) ON DELETE SET NULL,

    -- Match counts
    matches_played  INTEGER NOT NULL DEFAULT 0,
    games_played    INTEGER NOT NULL DEFAULT 0,
    matches_won     INTEGER NOT NULL DEFAULT 0,
    matches_lost    INTEGER NOT NULL DEFAULT 0,

    -- Raw totals (for recalculation)
    total_kills         INTEGER NOT NULL DEFAULT 0,
    total_deaths        INTEGER NOT NULL DEFAULT 0,
    total_assists       INTEGER NOT NULL DEFAULT 0,
    total_first_bloods  INTEGER NOT NULL DEFAULT 0,

    -- Computed averages
    avg_acs         NUMERIC(8,2),
    avg_adr         NUMERIC(8,2),
    avg_kd          NUMERIC(5,2),
    avg_kda         NUMERIC(5,2),
    headshot_pct    NUMERIC(5,2),  -- NULL ถ้าไม่มีข้อมูล Riot API
    win_rate        NUMERIC(5,2),

    -- JSONB aggregates
    agent_pool      JSONB NOT NULL DEFAULT '{}'::jsonb,
    map_performance JSONB NOT NULL DEFAULT '{}'::jsonb,

    last_match_at   TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Season-specific rows (season_id NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_player_stats_season
    ON public.player_stats (player_id, game_id, season_id)
    WHERE season_id IS NOT NULL;

-- Career rows (season_id IS NULL) — one per (player, game)
CREATE UNIQUE INDEX IF NOT EXISTS uq_player_stats_career
    ON public.player_stats (player_id, game_id)
    WHERE season_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_player_stats_leaderboard
    ON public.player_stats (game_id, season_id, avg_acs DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_player_stats_player
    ON public.player_stats (player_id);
