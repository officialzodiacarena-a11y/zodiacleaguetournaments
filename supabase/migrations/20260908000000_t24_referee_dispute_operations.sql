-- =============================================================================
-- MIGRATION: T2.4-BE-08 — Referee, Disputes & Penalties Operations (v1.3.1)
-- Spec: T2.4-BE-08_Referee_Dispute_Operations_Spec.md (v1.3.0, patched by Alice CTO)
-- Run manually in Supabase SQL Editor, in order, as a single transaction.
--
-- Corrections vs spec v1.3.0 (verified against live schema_all.sql dump):
--   * dispute_category_type / dispute_status_type do NOT exist yet anywhere in
--     the deployed schema (spec assumed they were already in the ERD migration
--     — they are not). Created here, guarded with IF NOT EXISTS.
--   * current_player_id() / is_admin() / is_team_leader() / is_referee_of()
--     already exist in production. Redeclared here as CREATE OR REPLACE using
--     their real, already-deployed bodies — NOT the spec's draft versions.
--     In particular is_referee_of() checks matches.referee_id directly; there
--     is no public.referee_assignments table in this schema.
--   * advance_bracket_node(): spec referenced bracket_nodes.winner_to, which
--     does not exist — the real column is winner_to_node_id (and
--     loser_to_node_id). Rewritten to use the real columns and to mirror the
--     winner/loser propagation + READY/PENDING status logic already used in
--     app/api/v1/matches/[id]/result/route.ts, so brackets actually advance
--     correctly for 4/8/16-team draws instead of silently no-op'ing.
--   * disputes_team_insert RLS: spec restricted filing to match.status =
--     'AWAITING_RESULT', but the route handler (Section 4.1) validates
--     LIVE/PAUSED/AWAITING_RESULT as fileable states. Widened the RLS check
--     to match the app-layer contract so INVALID_DISPUTE_STATE stays an
--     app-level 422 instead of an unreachable RLS 403 for LIVE/PAUSED.
-- =============================================================================

-- ── penalty_type: new enum, does not exist yet
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'penalty_type') THEN
        CREATE TYPE penalty_type AS ENUM (
            'AP_FINE',              -- ปรับแต้ม AP รายบุคคล
            'ZP_DEDUCTION',         -- หักคะแนนสะสมซีซันสโมสร
            'ATHLETE_SUSPENSION',   -- พักสิทธิ์การลงแข่งชั่วคราว
            'ATHLETE_BAN'           -- แบนออกจากการแข่งขันถาวร
        );
    END IF;
END
$$;

-- ── dispute_category_type / dispute_status_type: NOT present in the deployed
-- ERD despite spec v1.3.0 assuming otherwise — create them here, guarded.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_category_type') THEN
        CREATE TYPE dispute_category_type AS ENUM (
            'WRONG_SCORE', 'CHEATING', 'SMURFING', 'INELIGIBLE_PLAYER',
            'NO_SHOW', 'TOXICITY', 'TECHNICAL_ISSUE', 'RULE_VIOLATION', 'OTHER'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_status_type') THEN
        CREATE TYPE dispute_status_type AS ENUM (
            'OPEN', 'UNDER_REVIEW', 'RESOLVED'
        );
    END IF;
END
$$;

-- ── Helper Functions (redeclared to match what's already deployed in production)

CREATE OR REPLACE FUNCTION public.current_player_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT id FROM public.players WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.players p ON p.id = ur.player_id
        WHERE p.user_id = auth.uid()
          AND ur.role IN ('ADMIN', 'SUPER_ADMIN')
          AND ur.revoked_at IS NULL
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    );
$$;

CREATE OR REPLACE FUNCTION public.is_team_leader(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = p_team_id
          AND player_id = public.current_player_id()
          AND role IN ('CAPTAIN', 'MANAGER', 'OWNER')
          AND status = 'ACTIVE'
    );
$$;

-- NOTE: no public.referee_assignments table exists in this schema.
-- matches.referee_id is the single source of truth for match assignment.
CREATE OR REPLACE FUNCTION public.is_referee_of(p_match_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.matches
        WHERE id = p_match_id
          AND referee_id = public.current_player_id()
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE player_id = public.current_player_id()
          AND role IN ('REFEREE', 'ADMIN', 'SUPER_ADMIN')
          AND revoked_at IS NULL
    );
$$;

-- ── disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_number      VARCHAR(20) NOT NULL UNIQUE,  -- DSP-2026-0001

    match_id            UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    match_game_id       UUID REFERENCES public.match_games(id) ON DELETE SET NULL,

    filed_by            UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
    filed_by_team_id    UUID NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
    against_team_id     UUID REFERENCES public.teams(id) ON DELETE SET NULL,

    category            dispute_category_type NOT NULL DEFAULT 'WRONG_SCORE',
    status              dispute_status_type NOT NULL DEFAULT 'OPEN',
    priority            SMALLINT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),

    title               VARCHAR(200) NOT NULL,
    description         TEXT NOT NULL,
    evidence_urls       TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,

    assigned_to         UUID REFERENCES public.players(id) ON DELETE SET NULL,
    resolved_by         UUID REFERENCES public.players(id) ON DELETE SET NULL,
    resolved_at         TIMESTAMPTZ,
    resolution          TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT chk_resolved CHECK (
        status <> 'RESOLVED' OR (resolved_at IS NOT NULL AND resolution IS NOT NULL)
    ),
    CONSTRAINT chk_not_self_dispute CHECK (
        filed_by_team_id <> against_team_id
    )
);

CREATE INDEX IF NOT EXISTS idx_disputes_status   ON public.disputes(status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_match    ON public.disputes(match_id);
CREATE INDEX IF NOT EXISTS idx_disputes_assigned ON public.disputes(assigned_to) WHERE status IN ('OPEN','UNDER_REVIEW');

-- ── UNIQUE index กัน double dispute ต่อทีมต่อแมตช์
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_dispute_per_team
    ON public.disputes(match_id, filed_by_team_id)
    WHERE status IN ('OPEN', 'UNDER_REVIEW');

-- ── penalties table
CREATE TABLE IF NOT EXISTS public.penalties (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id           UUID REFERENCES public.players(id) ON DELETE SET NULL,
    team_id             UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    match_id            UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    dispute_id          UUID REFERENCES public.disputes(id) ON DELETE SET NULL,

    type                penalty_type NOT NULL,
    ap_fine_amount      BIGINT NOT NULL DEFAULT 0 CHECK (ap_fine_amount >= 0),
    zp_deduction_amount BIGINT NOT NULL DEFAULT 0 CHECK (zp_deduction_amount >= 0),
    notes               TEXT NOT NULL,
    suspended_until     TIMESTAMPTZ,

    created_by          UUID REFERENCES public.players(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_penalties_player ON public.penalties(player_id);
CREATE INDEX IF NOT EXISTS idx_penalties_team   ON public.penalties(team_id);

-- ── Auto-generate dispute_number
CREATE SEQUENCE IF NOT EXISTS dispute_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.generate_dispute_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.dispute_number IS NULL THEN
        NEW.dispute_number := 'DSP-' || EXTRACT(YEAR FROM NOW())::TEXT || '-'
                              || LPAD(nextval('dispute_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispute_number ON public.disputes;
CREATE TRIGGER trg_dispute_number
    BEFORE INSERT ON public.disputes
    FOR EACH ROW EXECUTE FUNCTION public.generate_dispute_number();

DROP TRIGGER IF EXISTS trg_disputes_updated ON public.disputes;
CREATE TRIGGER trg_disputes_updated
    BEFORE UPDATE ON public.disputes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "disputes_public_read" ON public.disputes;
CREATE POLICY "disputes_public_read" ON public.disputes
    FOR SELECT USING (TRUE);

-- Widened to LIVE/PAUSED/AWAITING_RESULT to match the app-layer state check
-- in app/api/v1/matches/[id]/dispute/route.ts (spec's RLS only allowed
-- AWAITING_RESULT, which would silently 403 legitimate LIVE/PAUSED filings).
DROP POLICY IF EXISTS "disputes_team_insert" ON public.disputes;
CREATE POLICY "disputes_team_insert" ON public.disputes
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND public.is_team_leader(filed_by_team_id)
        AND EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id = match_id
              AND (m.team_a_id = filed_by_team_id OR m.team_b_id = filed_by_team_id)
              AND m.status IN ('LIVE', 'PAUSED', 'AWAITING_RESULT')
        )
    );

DROP POLICY IF EXISTS "disputes_admin_all" ON public.disputes;
CREATE POLICY "disputes_admin_all" ON public.disputes
    FOR ALL USING (public.is_admin() OR public.is_referee_of(match_id));

DROP POLICY IF EXISTS "penalties_self_read" ON public.penalties;
CREATE POLICY "penalties_self_read" ON public.penalties
    FOR SELECT USING (
        player_id = public.current_player_id()
        OR public.is_team_leader(team_id)
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "penalties_admin_all" ON public.penalties;
CREATE POLICY "penalties_admin_all" ON public.penalties
    FOR ALL USING (public.is_admin());

-- ── advance_bracket_node RPC
-- เรียกใช้หลัง dispute resolve เพื่อเดินสาย bracket ให้ผู้ชนะ/ผู้แพ้
-- Uses the real bracket_nodes columns (winner_to_node_id / loser_to_node_id)
-- and mirrors the winner/loser propagation + READY/PENDING status logic
-- already shipped in app/api/v1/matches/[id]/result/route.ts.
CREATE OR REPLACE FUNCTION public.advance_bracket_node(
    p_match_id UUID,
    p_winner_team_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_node          RECORD;
    v_loser_team_id UUID;
    v_next_node     RECORD;
    v_assign_a      BOOLEAN;
BEGIN
    SELECT bn.* INTO v_node
    FROM public.bracket_nodes bn
    WHERE bn.match_id = p_match_id
    LIMIT 1;

    IF NOT FOUND THEN RETURN; END IF;

    v_loser_team_id := CASE
        WHEN p_winner_team_id = v_node.team_a_id THEN v_node.team_b_id
        ELSE v_node.team_a_id
    END;

    UPDATE public.bracket_nodes
    SET status = 'COMPLETED', updated_at = NOW()
    WHERE id = v_node.id;

    IF v_node.winner_to_node_id IS NOT NULL THEN
        SELECT * INTO v_next_node FROM public.bracket_nodes WHERE id = v_node.winner_to_node_id;
        IF FOUND THEN
            v_assign_a := v_next_node.team_a_id IS NULL;
            UPDATE public.bracket_nodes
            SET team_a_id = CASE WHEN v_assign_a THEN p_winner_team_id ELSE v_next_node.team_a_id END,
                team_b_id = CASE WHEN v_assign_a THEN v_next_node.team_b_id ELSE p_winner_team_id END,
                status = CASE
                    WHEN (CASE WHEN v_assign_a THEN p_winner_team_id ELSE v_next_node.team_a_id END) IS NOT NULL
                     AND (CASE WHEN v_assign_a THEN v_next_node.team_b_id ELSE p_winner_team_id END) IS NOT NULL
                    THEN 'READY' ELSE 'PENDING'
                END,
                updated_at = NOW()
            WHERE id = v_next_node.id;
        END IF;
    END IF;

    IF v_node.loser_to_node_id IS NOT NULL AND v_loser_team_id IS NOT NULL THEN
        SELECT * INTO v_next_node FROM public.bracket_nodes WHERE id = v_node.loser_to_node_id;
        IF FOUND THEN
            v_assign_a := v_next_node.team_a_id IS NULL;
            UPDATE public.bracket_nodes
            SET team_a_id = CASE WHEN v_assign_a THEN v_loser_team_id ELSE v_next_node.team_a_id END,
                team_b_id = CASE WHEN v_assign_a THEN v_next_node.team_b_id ELSE v_loser_team_id END,
                status = CASE
                    WHEN (CASE WHEN v_assign_a THEN v_loser_team_id ELSE v_next_node.team_a_id END) IS NOT NULL
                     AND (CASE WHEN v_assign_a THEN v_next_node.team_b_id ELSE v_loser_team_id END) IS NOT NULL
                    THEN 'READY' ELSE 'PENDING'
                END,
                updated_at = NOW()
            WHERE id = v_next_node.id;
        END IF;
    END IF;
END;
$$;
