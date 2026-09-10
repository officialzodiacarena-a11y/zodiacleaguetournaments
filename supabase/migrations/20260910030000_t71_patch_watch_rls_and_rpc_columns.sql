-- =============================================================================
-- PATCH: T7.2 Watch-to-Earn V2 — fix RLS gap + RPC/schema column mismatch found
-- by scripts/smoke-test-phase7.mjs against the live DB.
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น (ห้ามโคลท์รัน)
--
-- Bug 1 — public.watch_sessions had no SELECT policy for the owning player,
--   so /api/v1/watch/heartbeat (which reads the session through the caller's
--   own JWT, not the service role) always got an empty result and returned
--   404 SESSION_NOT_FOUND, even for the player's own active session.
--
-- Bug 2 — credit_watch_v2_heartbeat() (20260910020000_t71_phase7...) reads
--   v_rule.daily_cap_ap / v_rule.interval_seconds / v_rule.ap_per_interval,
--   none of which exist on the live public.ap_earning_rules table (confirmed
--   via the PostgREST OpenAPI schema — real columns are ap_amount,
--   cooldown_seconds, min_watch_seconds/percent, max_per_day/max_per_stream).
--   Every heartbeat call 500'd on this. Remapped to the real columns:
--     ap_per_interval -> ap_amount        (AP awarded per heartbeat)
--     daily_cap_ap    -> max_per_day, falling back to ap_daily_limits'
--                        own column default (100) when the rule doesn't set one
--     interval_seconds -> cooldown_seconds (informational delta_sec log only,
--                          not used in any cap math), falling back to 30s
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Bug 1 fix — allow a player to SELECT their own watch_sessions rows.
-- -----------------------------------------------------------------------------
ALTER TABLE public.watch_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can view own watch sessions" ON public.watch_sessions;
CREATE POLICY "Players can view own watch sessions"
ON public.watch_sessions FOR SELECT
USING (player_id = public.current_player_id());

-- -----------------------------------------------------------------------------
-- Bug 2 fix — credit_watch_v2_heartbeat(), remapped to real ap_earning_rules
-- columns. Logic is otherwise unchanged from 20260910020000_t71...sql.
--
-- Bug 4 fix (found by scripts/smoke-test-phase7.mjs) — the move_ap()
-- idempotency key was only second-granular
-- (session_id || '-tick-' || extract(epoch from now())::bigint), so two
-- heartbeats landing in the same wall-clock second (network retry, unusually
-- fast client) collided and the second was wrongly rejected as
-- DUPLICATE_KEY, 500'ing a perfectly legitimate heartbeat. Now keyed by
-- session_id + a microsecond-precision clock_timestamp() + an 8-char random
-- suffix, which cannot collide across distinct heartbeat calls.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.credit_watch_v2_heartbeat(
    p_session_id UUID,
    p_player_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session      RECORD;
    v_rule         RECORD;
    v_today        DATE;
    v_limit        RECORD;
    v_remaining    NUMERIC;
    v_award        NUMERIC;
    v_move         JSONB;
    v_default_cap  NUMERIC;
BEGIN
    SELECT id, status FROM public.watch_sessions WHERE id = p_session_id AND player_id = p_player_id INTO v_session;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND');
    END IF;
    IF v_session.status <> 'ACTIVE' THEN
        RETURN jsonb_build_object('success', false, 'error', 'STREAM_ENDED');
    END IF;

    SELECT * INTO v_rule FROM public.ap_earning_rules WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'EARNING_RULE_NOT_FOUND');
    END IF;

    v_today := (NOW() AT TIME ZONE 'Asia/Bangkok')::date;

    -- ap_daily_limits.daily_cap already defaults to 100 at the column level;
    -- only override it with the rule's max_per_day when the rule sets one.
    SELECT column_default::NUMERIC INTO v_default_cap
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ap_daily_limits' AND column_name = 'daily_cap';

    INSERT INTO public.ap_daily_limits (player_id, limit_date, ap_earned, daily_cap)
    VALUES (p_player_id, v_today, 0, COALESCE(v_rule.max_per_day, v_default_cap, 100))
    ON CONFLICT (player_id, limit_date) DO NOTHING;

    SELECT * INTO v_limit FROM public.ap_daily_limits WHERE player_id = p_player_id AND limit_date = v_today FOR UPDATE;

    v_remaining := GREATEST(v_limit.daily_cap - v_limit.ap_earned, 0);

    IF v_remaining <= 0 THEN
        -- Zero DB Write: record cap_reached_at once, nothing else.
        UPDATE public.watch_heartbeats SET cap_reached_at = NOW()
        WHERE session_id = p_session_id AND cap_reached_at IS NULL
              AND id = (SELECT id FROM public.watch_heartbeats WHERE session_id = p_session_id ORDER BY created_at DESC LIMIT 1);

        RETURN jsonb_build_object(
            'success', true, 'status', 'CAP_REACHED', 'earned', 0,
            'total_today', v_limit.ap_earned, 'daily_cap', v_limit.daily_cap
        );
    END IF;

    v_award := LEAST(v_rule.ap_amount, v_remaining);

    v_move := public.move_ap(
        p_player_id, v_award, 'WATCH_EARN',
        p_session_id::text || '-tick-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS') || '-' || substr(gen_random_uuid()::text, 1, 8),
        'watch_session', p_session_id
    );
    IF (v_move->>'success')::boolean IS NOT TRUE THEN
        RETURN jsonb_build_object('success', false, 'error', COALESCE(v_move->>'error', 'MOVE_AP_FAILED'));
    END IF;

    INSERT INTO public.watch_heartbeats (session_id, position_sec, playback_rate, delta_sec, watched_seconds)
    VALUES (p_session_id, 0, 1, COALESCE(NULLIF(v_rule.cooldown_seconds, 0), 30), 0);

    UPDATE public.ap_daily_limits SET ap_earned = ap_earned + v_award, updated_at = NOW()
    WHERE player_id = p_player_id AND limit_date = v_today;

    UPDATE public.watch_sessions SET last_heartbeat_at = NOW(), updated_at = NOW() WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true, 'status', 'OK', 'earned', v_award,
        'total_today', v_limit.ap_earned + v_award, 'daily_cap', v_limit.daily_cap
    );
END;
$$;

-- =============================================================================
-- END patch
-- =============================================================================
