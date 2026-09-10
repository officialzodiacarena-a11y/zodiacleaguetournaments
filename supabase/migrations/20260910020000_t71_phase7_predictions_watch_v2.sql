-- =============================================================================
-- MIGRATION: T7.1-T7.3 — Stage 2 Phase 7: Pari-Mutuel Prediction Pools,
-- Watch-to-Earn V2 Heartbeat & Admin Command Room RPCs
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น (ห้ามโคลท์รัน)
--
-- Run AFTER migration_stage2_phase7.sql (already applied — creates
-- season_jackpot_pools, prediction_pools, prediction_tickets,
-- system_burn_ledger, their ENUMs/indexes/RLS/triggers, and the
-- watch_heartbeats.cap_reached_at column). That file explicitly left all
-- RPCs as stubs ("implement โดย โคลท์") and its pg_cron job commented out —
-- this migration fills those in, plus adds open_prediction_pool() and
-- buy_prediction_ticket() which aren't even in the RPC stub list but are
-- required by the ticket-purchase flow.
--
-- Verified against real DB / already-shipped code before writing this file
-- (2026-09-10):
--   * ⚠️ public.watch_heartbeats has NO player_id column — it is keyed by
--     session_id only (watch_heartbeats.session_id -> watch_sessions.id,
--     and watch_sessions.player_id is the real FK to players). The Feature
--     Spec's "watch_heartbeats.player_id FK -> players(id) ห้ามใช้ anonymous
--     session_id" is read here as "never invent a separate anonymous guest
--     identifier" — which the existing session_id -> watch_sessions.player_id
--     chain already satisfies, since watch_sessions.player_id is NOT NULL
--     and always a real authenticated player. No new column added.
--   * public.matches.stage_id is a real, populated column (confirmed via
--     app/tournament/weekly/page.tsx querying matches by stage_id directly)
--     -> public.tournament_stages.tournament_id -> public.tournaments.season_id
--     is the real chain used to resolve a match's season, and it works for
--     both bracket and Swiss-format stages (unlike matches.bracket_node_id,
--     which Swiss matches don't have).
--   * public.ap_daily_limits (player_id, limit_date, ap_earned, daily_cap)
--     already exists and is the real daily-cap ledger used by
--     claim_watch_reward() (20260908120000_t33) — reused here for Watch V2's
--     CAP_REACHED check rather than inventing a parallel counter.
--   * public.ap_earning_rules (ap_per_interval, interval_seconds,
--     daily_cap_ap) already exists — Watch V2 reads its is_active row for
--     the per-heartbeat AP amount rather than hardcoding it again.
--   * public.tournament_registrations.ap_deducted exists but entry fees are
--     debited via a DIRECT `UPDATE players SET ap_balance = ...` in
--     actions/registration.ts (bypassing move_ap()/ap_ledger entirely) and
--     are scoped to a whole TOURNAMENT, not a single match. Voiding one
--     match is not 1:1 with a tournament registration, and refunding an
--     entire tournament entry fee because one match was voided has no clear
--     scope rule in the spec (which match/team/how much). Rather than guess
--     at a financially consequential action with no unambiguous basis,
--     admin_void_match_and_refund() below does NOT touch
--     tournament_registrations at all — it only handles what the schema and
--     spec unambiguously define (the match's own prediction pool + tickets +
--     jackpot). Flagged loudly here and in the PR description; needs a
--     product decision from อลิส/พี่ศิลา on exact scope before adding it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ap_ledger: allow the Phase 7 prediction/watch reasons
-- -----------------------------------------------------------------------------
ALTER TABLE public.ap_ledger DROP CONSTRAINT IF EXISTS ap_ledger_reason_check;
ALTER TABLE public.ap_ledger ADD CONSTRAINT ap_ledger_reason_check
    CHECK (reason IN ('WATCH_REWARD', 'CLAWBACK', 'ADMIN_ADJUSTMENT', 'STORE_REDEEM', 'TOP_UP', 'REFUND_AP_CREDIT', 'PENALTY_FINE', 'SUBSCRIPTION_RENEWAL', 'MARKETPLACE_BID', 'MARKETPLACE_REFUND', 'MARKETPLACE_SOLD', 'ESCROW_LOCK', 'ESCROW_SETTLED', 'ESCROW_AUTO_RELEASE', 'PREDICTION_BUY', 'PREDICTION_PAYOUT', 'PREDICTION_REFUND_VOID', 'PREDICTION_HOUSE_FEE_BURN', 'WATCH_EARN', 'PREDICTION_JACKPOT_PAYOUT'));

-- -----------------------------------------------------------------------------
-- 2. Helper: resolve a match's season_id via stage_id -> tournament_stages ->
--    tournaments.season_id (works for bracket AND Swiss stages).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_match_season_id(p_match_id UUID)
RETURNS UUID
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT t.season_id
    FROM public.matches m
    JOIN public.tournament_stages ts ON ts.id = m.stage_id
    JOIN public.tournaments t ON t.id = ts.tournament_id
    WHERE m.id = p_match_id;
$$;

-- -----------------------------------------------------------------------------
-- 3. Sprint 7.1 — open_prediction_pool() / buy_prediction_ticket()
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.open_prediction_pool(
    p_match_id          UUID,
    p_house_fee_percent NUMERIC DEFAULT 5.00
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match RECORD;
    v_pool_id UUID;
BEGIN
    SELECT id, status INTO v_match FROM public.matches WHERE id = p_match_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'MATCH_NOT_FOUND');
    END IF;

    IF v_match.status NOT IN ('SCHEDULED', 'READY_CHECK') THEN
        RETURN jsonb_build_object('success', false, 'error', 'MATCH_NOT_SCHEDULABLE');
    END IF;

    INSERT INTO public.prediction_pools (match_id, house_fee_percent)
    VALUES (p_match_id, LEAST(GREATEST(p_house_fee_percent, 0), 10))
    RETURNING id INTO v_pool_id;

    RETURN jsonb_build_object('success', true, 'pool_id', v_pool_id, 'status', 'OPEN');
EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'POOL_ALREADY_EXISTS');
END;
$$;

CREATE OR REPLACE FUNCTION public.buy_prediction_ticket(
    p_pool_id           UUID,
    p_player_id         UUID,
    p_predicted_team_id UUID,
    p_tier              prediction_ticket_tier_type,
    p_ap_amount         BIGINT,
    p_idempotency_key   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pool  RECORD;
    v_match RECORD;
    v_debit JSONB;
    v_ticket_id UUID;
BEGIN
    SELECT * INTO v_pool FROM public.prediction_pools WHERE id = p_pool_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'POOL_NOT_FOUND');
    END IF;

    IF v_pool.status <> 'OPEN' THEN
        RETURN jsonb_build_object('success', false, 'error', 'POOL_NOT_OPEN');
    END IF;

    SELECT id, status, team_a_id, team_b_id INTO v_match FROM public.matches WHERE id = v_pool.match_id;
    IF v_match.status NOT IN ('SCHEDULED', 'READY_CHECK') THEN
        -- Defensive: the LIVE-transition trigger below should have already
        -- locked this pool, but re-check in case of a race.
        UPDATE public.prediction_pools SET status = 'LOCKED' WHERE id = p_pool_id AND status = 'OPEN';
        RETURN jsonb_build_object('success', false, 'error', 'MATCH_ALREADY_LIVE');
    END IF;

    IF p_predicted_team_id NOT IN (v_match.team_a_id, v_match.team_b_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_TEAM');
    END IF;

    v_debit := public.move_ap(p_player_id, -p_ap_amount, 'PREDICTION_BUY', p_idempotency_key, 'prediction_pool', p_pool_id);
    IF (v_debit->>'success')::boolean IS NOT TRUE THEN
        IF v_debit->>'error' = 'DUPLICATE_KEY' THEN
            RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_KEY');
        END IF;
        RETURN jsonb_build_object('success', false, 'error', COALESCE(v_debit->>'error', 'INSUFFICIENT_AP_BALANCE'));
    END IF;

    BEGIN
        INSERT INTO public.prediction_tickets (pool_id, player_id, predicted_team_id, tier, ap_amount)
        VALUES (p_pool_id, p_player_id, p_predicted_team_id, p_tier, p_ap_amount)
        RETURNING id INTO v_ticket_id;
    EXCEPTION WHEN unique_violation THEN
        -- Refund the debit above — the ticket was never created.
        PERFORM public.move_ap(p_player_id, p_ap_amount, 'PREDICTION_REFUND_VOID', p_idempotency_key || '-dup-refund', 'prediction_pool', p_pool_id);
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_TICKETED');
    END;

    IF p_predicted_team_id = v_match.team_a_id THEN
        UPDATE public.prediction_pools SET total_ap_pool_a = total_ap_pool_a + p_ap_amount WHERE id = p_pool_id;
    ELSE
        UPDATE public.prediction_pools SET total_ap_pool_b = total_ap_pool_b + p_ap_amount WHERE id = p_pool_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'ticket_id', v_ticket_id, 'pool_id', p_pool_id);
END;
$$;

-- Auto-lock any OPEN pool the instant its match goes LIVE.
CREATE OR REPLACE FUNCTION public.lock_prediction_pool_on_match_live()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'LIVE' AND OLD.status IS DISTINCT FROM 'LIVE' THEN
        UPDATE public.prediction_pools
        SET status = 'LOCKED'
        WHERE match_id = NEW.id AND status = 'OPEN';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_prediction_pool_on_match_live ON public.matches;
CREATE TRIGGER trg_lock_prediction_pool_on_match_live
    AFTER UPDATE OF status ON public.matches
    FOR EACH ROW EXECUTE FUNCTION public.lock_prediction_pool_on_match_live();

-- -----------------------------------------------------------------------------
-- 4. settle_prediction_pool() — Pari-Mutuel payout, sequential per spec.
--    A nested EXCEPTION block lets the function record SETTLEMENT_ERROR on
--    the pool row itself (surviving the outer call) instead of the whole
--    RPC invocation silently rolling back to nothing on failure.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.settle_prediction_pool(
    p_pool_id         UUID,
    p_winning_team_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pool              RECORD;
    v_total_pool        BIGINT;
    v_house_fee         BIGINT;
    v_net_distributed   BIGINT;
    v_winning_ap_sum    BIGINT;
    v_ticket            RECORD;
    v_payout_share      BIGINT;
    v_bonus_share       BIGINT;
    v_season_id         UUID;
    v_error_message     TEXT;
BEGIN
    SELECT * INTO v_pool FROM public.prediction_pools WHERE id = p_pool_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'POOL_NOT_FOUND');
    END IF;

    IF v_pool.status <> 'LOCKED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'POOL_NOT_LOCKED');
    END IF;

    BEGIN
        v_total_pool := v_pool.total_ap_pool_a + v_pool.total_ap_pool_b;
        v_house_fee := FLOOR(v_total_pool * (v_pool.house_fee_percent / 100.0));
        v_net_distributed := v_total_pool - v_house_fee;

        IF v_house_fee > 0 THEN
            INSERT INTO public.system_burn_ledger (source_module, burned_ap_amount, reference_id)
            VALUES ('PREDICTION_HOUSE_FEE', v_house_fee, p_pool_id);

            -- Only burn from AP economy if there was actually a pool to burn from.
            -- (system_burn_ledger has no FK to players — this is a ledger entry,
            -- the AP itself simply never gets paid back out, which is the burn.)
        END IF;

        SELECT COALESCE(SUM(ap_amount), 0) INTO v_winning_ap_sum
        FROM public.prediction_tickets
        WHERE pool_id = p_pool_id AND predicted_team_id = p_winning_team_id;

        IF v_winning_ap_sum = 0 THEN
            -- Zero Winners: net_distributed + any already-injected bonus carries
            -- to the season jackpot instead of being paid out.
            v_season_id := public.resolve_match_season_id(v_pool.match_id);

            IF v_season_id IS NOT NULL THEN
                INSERT INTO public.season_jackpot_pools (season_id, accumulated_ap)
                VALUES (v_season_id, v_net_distributed + v_pool.bonus_pool_ap)
                ON CONFLICT (season_id) DO UPDATE
                    SET accumulated_ap = public.season_jackpot_pools.accumulated_ap + EXCLUDED.accumulated_ap;
            END IF;

            UPDATE public.prediction_pools
            SET status = 'JACKPOT_CARRIED', winning_team_id = p_winning_team_id, settled_at = NOW()
            WHERE id = p_pool_id;

            RETURN jsonb_build_object(
                'success', true, 'pool_id', p_pool_id, 'status', 'JACKPOT_CARRIED',
                'house_fee_burned', v_house_fee, 'carried_to_jackpot', v_net_distributed + v_pool.bonus_pool_ap
            );
        END IF;

        FOR v_ticket IN
            SELECT id, player_id, ap_amount FROM public.prediction_tickets
            WHERE pool_id = p_pool_id AND predicted_team_id = p_winning_team_id
        LOOP
            v_payout_share := FLOOR((v_ticket.ap_amount::NUMERIC / v_winning_ap_sum) * v_net_distributed);
            v_bonus_share := CASE WHEN v_pool.bonus_pool_ap > 0
                THEN FLOOR((v_ticket.ap_amount::NUMERIC / v_winning_ap_sum) * v_pool.bonus_pool_ap)
                ELSE 0 END;

            IF v_payout_share > 0 THEN
                PERFORM public.move_ap(v_ticket.player_id, v_payout_share, 'PREDICTION_PAYOUT', 'settle-' || v_ticket.id::text, 'prediction_ticket', v_ticket.id);
            END IF;
            IF v_bonus_share > 0 THEN
                PERFORM public.move_ap(v_ticket.player_id, v_bonus_share, 'PREDICTION_JACKPOT_PAYOUT', 'settle-bonus-' || v_ticket.id::text, 'prediction_ticket', v_ticket.id);
            END IF;

            UPDATE public.prediction_tickets
            SET payout_ap = v_payout_share + v_bonus_share
            WHERE id = v_ticket.id;
        END LOOP;

        UPDATE public.prediction_pools
        SET status = 'SETTLED', winning_team_id = p_winning_team_id, settled_at = NOW()
        WHERE id = p_pool_id;

        RETURN jsonb_build_object(
            'success', true, 'pool_id', p_pool_id, 'status', 'SETTLED',
            'total_pool', v_total_pool, 'house_fee_burned', v_house_fee, 'net_distributed', v_net_distributed
        );
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        UPDATE public.prediction_pools SET status = 'SETTLEMENT_ERROR' WHERE id = p_pool_id;
        RETURN jsonb_build_object('success', false, 'error', 'SETTLEMENT_ERROR', 'detail', v_error_message);
    END;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. inject_jackpot_bonus() — pulls season_jackpot_pools.accumulated_ap into
--    prediction_pools.bonus_pool_ap (Grand Final only, called before the pool
--    locks). Consumes the jackpot (zeroes accumulated_ap) since it's now
--    committed to this pool.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inject_jackpot_bonus(
    p_pool_id   UUID,
    p_season_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_jackpot RECORD;
    v_pool    RECORD;
BEGIN
    SELECT * INTO v_pool FROM public.prediction_pools WHERE id = p_pool_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'POOL_NOT_FOUND');
    END IF;
    IF v_pool.status <> 'OPEN' THEN
        RETURN jsonb_build_object('success', false, 'error', 'POOL_NOT_OPEN');
    END IF;

    SELECT * INTO v_jackpot FROM public.season_jackpot_pools WHERE season_id = p_season_id FOR UPDATE;
    IF NOT FOUND OR v_jackpot.accumulated_ap = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'NO_JACKPOT_AVAILABLE');
    END IF;

    UPDATE public.prediction_pools SET bonus_pool_ap = bonus_pool_ap + v_jackpot.accumulated_ap WHERE id = p_pool_id;

    UPDATE public.season_jackpot_pools
    SET accumulated_ap = 0, status = 'INJECTED', injected_at = NOW()
    WHERE season_id = p_season_id;

    RETURN jsonb_build_object('success', true, 'pool_id', p_pool_id, 'bonus_injected', v_jackpot.accumulated_ap);
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. admin_revert_prediction_pool() — VOID after settle (post-settlement
--    fraud found). Claws back exactly what was paid, refunds original
--    stakes. All-or-nothing: any clawback failure (e.g. a winner already
--    spent the AP down below zero) aborts the whole revert.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_revert_prediction_pool(
    p_pool_id  UUID,
    p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pool   RECORD;
    v_ticket RECORD;
    v_move   JSONB;
BEGIN
    SELECT * INTO v_pool FROM public.prediction_pools WHERE id = p_pool_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'POOL_NOT_FOUND');
    END IF;
    IF v_pool.status NOT IN ('SETTLED', 'JACKPOT_CARRIED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'POOL_NOT_SETTLED');
    END IF;

    FOR v_ticket IN SELECT id, player_id, ap_amount, payout_ap FROM public.prediction_tickets WHERE pool_id = p_pool_id LOOP
        IF v_ticket.payout_ap IS NOT NULL AND v_ticket.payout_ap > 0 THEN
            v_move := public.move_ap(v_ticket.player_id, -v_ticket.payout_ap, 'PREDICTION_REFUND_VOID', 'revert-clawback-' || v_ticket.id::text, 'prediction_ticket', v_ticket.id);
            IF (v_move->>'success')::boolean IS NOT TRUE THEN
                RAISE EXCEPTION 'CLAWBACK_FAILED for ticket %: %', v_ticket.id, v_move->>'error';
            END IF;
        END IF;

        v_move := public.move_ap(v_ticket.player_id, v_ticket.ap_amount, 'PREDICTION_REFUND_VOID', 'revert-refund-' || v_ticket.id::text, 'prediction_ticket', v_ticket.id);
        IF (v_move->>'success')::boolean IS NOT TRUE THEN
            RAISE EXCEPTION 'REFUND_FAILED for ticket %: %', v_ticket.id, v_move->>'error';
        END IF;

        UPDATE public.prediction_tickets SET payout_ap = 0 WHERE id = v_ticket.id;
    END LOOP;

    IF v_pool.status = 'JACKPOT_CARRIED' THEN
        DECLARE v_season_id UUID;
        BEGIN
            v_season_id := public.resolve_match_season_id(v_pool.match_id);
            IF v_season_id IS NOT NULL THEN
                UPDATE public.season_jackpot_pools
                SET accumulated_ap = GREATEST(accumulated_ap - (v_pool.total_ap_pool_a + v_pool.total_ap_pool_b - FLOOR((v_pool.total_ap_pool_a + v_pool.total_ap_pool_b) * (v_pool.house_fee_percent / 100.0))), 0)
                WHERE season_id = v_season_id;
            END IF;
        END;
    END IF;

    UPDATE public.prediction_pools SET status = 'VOIDED' WHERE id = p_pool_id;

    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, reason, after_data)
    VALUES (p_admin_id, 'UPDATE', 'prediction_pools', p_pool_id, 'ADMIN_REVERT_AFTER_SETTLE', jsonb_build_object('status', 'VOIDED'));

    RETURN jsonb_build_object('success', true, 'pool_id', p_pool_id, 'status', 'VOIDED');
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. admin_void_match_and_refund() — emergency void. Per the header note
--    above, this deliberately does NOT touch tournament_registrations —
--    scope for that is undefined. It voids the match's prediction pool
--    (100% ticket refund + jackpot rollback to CARRIED_OVER) and marks the
--    match CANCELLED.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_void_match_and_refund(
    p_match_id  UUID,
    p_admin_id  UUID,
    p_reason    TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match   RECORD;
    v_pool    RECORD;
    v_ticket  RECORD;
    v_season_id UUID;
BEGIN
    SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'MATCH_NOT_FOUND');
    END IF;

    IF v_match.status = 'CANCELLED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'MATCH_ALREADY_VOID');
    END IF;
    IF v_match.status = 'COMPLETED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'MATCH_COMPLETED');
    END IF;

    SELECT * INTO v_pool FROM public.prediction_pools WHERE match_id = p_match_id FOR UPDATE;

    IF FOUND THEN
        IF v_pool.status IN ('SETTLED', 'JACKPOT_CARRIED') THEN
            PERFORM public.admin_revert_prediction_pool(v_pool.id, p_admin_id);
        ELSIF v_pool.status IN ('OPEN', 'LOCKED', 'SETTLEMENT_ERROR') THEN
            FOR v_ticket IN SELECT id, player_id, ap_amount FROM public.prediction_tickets WHERE pool_id = v_pool.id LOOP
                PERFORM public.move_ap(v_ticket.player_id, v_ticket.ap_amount, 'PREDICTION_REFUND_VOID', 'void-refund-' || v_ticket.id::text, 'prediction_ticket', v_ticket.id);
            END LOOP;

            IF v_pool.bonus_pool_ap > 0 THEN
                v_season_id := public.resolve_match_season_id(p_match_id);
                IF v_season_id IS NOT NULL THEN
                    UPDATE public.season_jackpot_pools
                    SET accumulated_ap = accumulated_ap + v_pool.bonus_pool_ap, status = 'CARRIED_OVER', carried_over_at = NOW()
                    WHERE season_id = v_season_id;
                END IF;
            END IF;

            UPDATE public.prediction_pools SET status = 'VOIDED' WHERE id = v_pool.id;
        END IF;
    END IF;

    UPDATE public.matches
    SET status = 'CANCELLED', updated_at = NOW()
    WHERE id = p_match_id;

    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, reason, after_data)
    VALUES (p_admin_id, 'UPDATE', 'matches', p_match_id, p_reason, jsonb_build_object('status', 'CANCELLED'));

    RETURN jsonb_build_object('success', true, 'match_id', p_match_id, 'status', 'CANCELLED', 'pool_voided', FOUND);
EXCEPTION WHEN OTHERS THEN
    -- Terminal-state guard on matches (trg_validate_match_transition) can
    -- reject CANCELLED from some source states — surface that as a clean
    -- error code instead of a raw 500.
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_MATCH_STATE_FOR_VOID', 'detail', SQLERRM);
END;
$$;

-- -----------------------------------------------------------------------------
-- 8. Sprint 7.2 — Watch-to-Earn V2 heartbeat credit
--    The CAP_REACHED zero-write path is handled at the route layer with a
--    plain read-only SELECT before ever calling this RPC (see
--    app/api/v1/watch/heartbeat/route.ts) — this function is only invoked
--    when there is genuinely AP left to credit, but it re-checks under lock
--    for race safety and still performs zero writes if another concurrent
--    request already exhausted the cap first.
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

    INSERT INTO public.ap_daily_limits (player_id, limit_date, ap_earned, daily_cap)
    VALUES (p_player_id, v_today, 0, v_rule.daily_cap_ap)
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

    v_award := LEAST(v_rule.ap_per_interval, v_remaining);

    v_move := public.move_ap(p_player_id, v_award, 'WATCH_EARN', p_session_id::text || '-tick-' || extract(epoch from now())::bigint::text, 'watch_session', p_session_id);
    IF (v_move->>'success')::boolean IS NOT TRUE THEN
        RETURN jsonb_build_object('success', false, 'error', COALESCE(v_move->>'error', 'MOVE_AP_FAILED'));
    END IF;

    INSERT INTO public.watch_heartbeats (session_id, position_sec, playback_rate, delta_sec, watched_seconds)
    VALUES (p_session_id, 0, 1, v_rule.interval_seconds, 0);

    UPDATE public.ap_daily_limits SET ap_earned = ap_earned + v_award, updated_at = NOW()
    WHERE player_id = p_player_id AND limit_date = v_today;

    UPDATE public.watch_sessions SET last_heartbeat_at = NOW(), updated_at = NOW() WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true, 'status', 'OK', 'earned', v_award,
        'total_today', v_limit.ap_earned + v_award, 'daily_cap', v_limit.daily_cap
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 9. pg_cron: settlement-error alerting (the reference migration only left a
--    bare SELECT as a comment — this actually writes an admin-visible alert,
--    deduped via audit_logs so a stuck pool isn't re-alerted every 5 minutes).
-- -----------------------------------------------------------------------------
SELECT cron.schedule('retry-settlement-error', '*/5 * * * *', $$
    INSERT INTO public.audit_logs (action, entity_type, entity_id, reason, after_data)
    SELECT 'UPDATE', 'prediction_pools', p.id, 'SETTLEMENT_ERROR_STUCK_ALERT', jsonb_build_object('stuck_since', p.updated_at)
    FROM public.prediction_pools p
    WHERE p.status = 'SETTLEMENT_ERROR'
      AND p.updated_at < NOW() - INTERVAL '10 minutes'
      AND NOT EXISTS (
          SELECT 1 FROM public.audit_logs a
          WHERE a.entity_type = 'prediction_pools' AND a.entity_id = p.id
            AND a.reason = 'SETTLEMENT_ERROR_STUCK_ALERT'
            AND a.created_at > p.updated_at
      );
$$);

-- =============================================================================
-- END Phase 7 Predictions & Watch V2 Migration
-- =============================================================================
