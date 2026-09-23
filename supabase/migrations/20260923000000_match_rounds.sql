-- =============================================================================
-- MIGRATION: 20260923000000_match_rounds.sql
-- AUTHOR: DAT (System Architect & Stress Tester)
-- GOAL: Match Rounds History & OCR Win Condition Tracking Engine
-- SPEC: SPEC-OCR-TELEMETRY-ROUNDS-V8.01-001 (Part 2)
-- =============================================================================

-- 1. Create Enum for Win Condition
DO $$ BEGIN
    CREATE TYPE public.win_condition_enum AS ENUM (
        'elimination',
        'spike_detonate',
        'spike_defuse',
        'time_expire'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create Table match_rounds
CREATE TABLE IF NOT EXISTS public.match_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    game_number INT NOT NULL DEFAULT 1,
    round_number INT NOT NULL,
    winner_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    win_condition public.win_condition_enum NOT NULL DEFAULT 'elimination',
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_match_rounds_positive CHECK (game_number > 0 AND round_number > 0),
    CONSTRAINT uq_match_game_round UNIQUE (match_id, game_number, round_number)
);

-- 3. High-Performance Indexing
CREATE INDEX IF NOT EXISTS idx_match_rounds_lookup
ON public.match_rounds (match_id, game_number, round_number);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.match_rounds ENABLE ROW LEVEL SECURITY;

-- Policy: Public Read Access for Overlay/Spectators
CREATE POLICY "Allow public read access to match_rounds"
ON public.match_rounds FOR SELECT
USING (true);

-- Policy: Write Access restricted to Service Role & Authenticated Admins/Referees
CREATE POLICY "Allow authenticated staff to insert/update match_rounds"
ON public.match_rounds FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.players p
        WHERE p.user_id = auth.uid()
        AND p.role IN ('SUPER_ADMIN', 'ADMIN', 'REFEREE', 'PRODUCER', 'BROADCAST')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.players p
        WHERE p.user_id = auth.uid()
        AND p.role IN ('SUPER_ADMIN', 'ADMIN', 'REFEREE', 'PRODUCER', 'BROADCAST')
    )
);

-- 5. Atomic RPC for Idempotent Round Recording
CREATE OR REPLACE FUNCTION public.record_match_round_event(
    p_match_id UUID,
    p_game_number INT,
    p_round_number INT,
    p_winner_team_id UUID,
    p_win_condition public.win_condition_enum,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match RECORD;
    v_existing_round_id UUID;
    v_new_round_id UUID;
BEGIN
    -- Set lock timeout to 3 seconds (Rule ST-01 Guard)
    SET LOCAL lock_timeout = '3s';

    -- Lock Match Row to prevent race condition during score calculation
    SELECT * INTO v_match
    FROM public.matches
    WHERE id = p_match_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'MATCH_NOT_FOUND');
    END IF;

    -- Check Idempotency
    SELECT id INTO v_existing_round_id
    FROM public.match_rounds
    WHERE match_id = p_match_id
      AND game_number = p_game_number
      AND round_number = p_round_number;

    IF v_existing_round_id IS NOT NULL THEN
        -- Already recorded, return idempotent success
        RETURN jsonb_build_object(
            'success', true,
            'message', 'ROUND_ALREADY_RECORDED',
            'round_id', v_existing_round_id,
            'is_duplicate', true
        );
    END IF;

    -- Insert New Round Event
    INSERT INTO public.match_rounds (
        match_id,
        game_number,
        round_number,
        winner_team_id,
        win_condition,
        idempotency_key
    ) VALUES (
        p_match_id,
        p_game_number,
        p_round_number,
        p_winner_team_id,
        p_win_condition,
        p_idempotency_key
    ) RETURNING id INTO v_new_round_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'ROUND_RECORDED_SUCCESSFULLY',
        'round_id', v_new_round_id,
        'is_duplicate', false
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', true, 'message', 'ROUND_ALREADY_RECORDED', 'is_duplicate', true);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 6. Anti-BOLA Lockdown (Protocol §5.2 fix, 2026-09-23):
-- SECURITY DEFINER bypasses RLS automatically -- without this, ANY authenticated/anon
-- caller could invoke the RPC directly via the Supabase client and insert forged rounds.
-- Only the /telemetry route's service-role client (already gated by the observer-token
-- check upstream) is allowed to call this function -- no client role should ever call it directly.
REVOKE EXECUTE ON FUNCTION public.record_match_round_event(UUID, INT, INT, UUID, public.win_condition_enum, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_match_round_event(UUID, INT, INT, UUID, public.win_condition_enum, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.record_match_round_event(UUID, INT, INT, UUID, public.win_condition_enum, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_match_round_event(UUID, INT, INT, UUID, public.win_condition_enum, TEXT) TO service_role;
