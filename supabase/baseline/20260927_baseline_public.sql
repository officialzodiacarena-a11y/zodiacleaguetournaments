-- =============================================================================
-- BASELINE SCHEMA (public) - snapshot of LIVE Supabase DB, 2026-09-27
-- Decision: Sila_For_Alich 2026-09-27 16:24 (item 1) - make the repo able to rebuild the DB from zero.
-- Source: pg_dump 17.6 --schema-only --schema=public --no-owner, read via role alis_readonly (read-only).
-- Post-processing (script build-baseline.js, not hand-edited):
--   * removed 89 single-line GRANT/ALTER DEFAULT PRIVILEGES statements for operational role alis_readonly
--   * removed 2 psql \restrict/\unrestrict lines (compatibility with older psql)
--   * changed 1 line "CREATE SCHEMA public;" -> "CREATE SCHEMA IF NOT EXISTS public;" (schema exists in every new project)
-- Contents: {"tables":86,"functions":79,"policies":150,"triggers":28,"enums":42,"rls_enabled":86,"grants":408,"revokes":54}
--
-- HOW TO USE: fresh Supabase project only (never run on the existing live DB - objects already exist).
--   Prerequisites that every Supabase project already provides: roles anon/authenticated/service_role,
--   schema auth (auth.users, auth.uid(), auth.role(), auth.jwt()), schema extensions with uuid-ossp + pgcrypto.
--   Also enable extension citext in schema public BEFORE running this file.
--   Run: psql "<connection string>" -v ON_ERROR_STOP=1 -f <this file>
--   Not included (outside schema public): triggers on auth.users, pg_cron jobs (see migrations with cron.schedule),
--   storage buckets/policies, vault secrets, data rows.
-- Replay-tested on a clean local PostgreSQL 17.6 (result recorded in HOTFIX-2 doc section 12).
-- =============================================================================
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: account_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_status_type AS ENUM (
    'PENDING',
    'ACTIVE',
    'SUSPENDED',
    'BANNED',
    'DEACTIVATED'
);


--
-- Name: affiliate_reward_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.affiliate_reward_type_enum AS ENUM (
    'KYC_BONUS',
    'STORE_CASHBACK',
    'TOURNAMENT_CASHBACK'
);


--
-- Name: affiliate_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.affiliate_status_enum AS ENUM (
    'PENDING_KYC',
    'ACTIVE',
    'FLAGGED',
    'BLOCKED'
);


--
-- Name: ap_reason_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ap_reason_type AS ENUM (
    'WATCH_EARN',
    'TOP_UP',
    'CRYPTO_TOP_UP',
    'PRIZE_PAYOUT',
    'REFUND',
    'PROMO',
    'REFERRAL',
    'COMPENSATION',
    'STORE_PURCHASE',
    'TOURNAMENT_ENTRY',
    'WITHDRAWAL',
    'PENALTY',
    'EXPIRY',
    'ADMIN_ADJUSTMENT',
    'REVERSAL',
    'CLAWBACK'
);


--
-- Name: athlete_bid_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.athlete_bid_status AS ENUM (
    'PENDING',
    'ACCEPTED',
    'OUTBID',
    'REFUNDED'
);


--
-- Name: athlete_listing_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.athlete_listing_status AS ENUM (
    'ACTIVE',
    'SOLD',
    'CANCELLED',
    'EXPIRED',
    'ESCROW_LOCKED'
);


--
-- Name: athlete_listing_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.athlete_listing_type AS ENUM (
    'AUCTION',
    'BUYOUT_ONLY',
    'DUAL_MODE'
);


--
-- Name: audit_action_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.audit_action_type AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'GRANT',
    'REVOKE',
    'APPROVE',
    'REJECT',
    'CREDIT',
    'DEBIT',
    'TRANSFER',
    'BAN',
    'UNBAN',
    'SUSPEND',
    'RESTORE'
);


--
-- Name: bracket_node_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bracket_node_status_type AS ENUM (
    'PENDING',
    'READY',
    'LIVE',
    'COMPLETED',
    'VOID',
    'RESET'
);


--
-- Name: decision_type_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.decision_type_type AS ENUM (
    'PENALTY',
    'SCORE_OVERRIDE',
    'MATCH_VOID',
    'DISQUALIFICATION',
    'REMATCH_ORDER'
);


--
-- Name: dispute_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dispute_status_type AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'AWAITING_EVIDENCE',
    'RESOLVED',
    'REJECTED',
    'ESCALATED',
    'WITHDRAWN'
);


--
-- Name: escrow_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.escrow_status_type AS ENUM (
    'PENDING',
    'COMPLETED',
    'CANCELLED',
    'DISPUTED',
    'AUTO_RELEASED',
    'CANCELLED_BANNED'
);


--
-- Name: game_code_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.game_code_type AS ENUM (
    'VAL',
    'LOL',
    'CS2',
    'TFT'
);


--
-- Name: invoice_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoice_status_type AS ENUM (
    'PENDING',
    'PAID',
    'EXPIRED',
    'FAILED',
    'REFUNDED'
);


--
-- Name: jackpot_pool_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.jackpot_pool_status_type AS ENUM (
    'ACCUMULATING',
    'INJECTED',
    'CARRIED_OVER'
);


--
-- Name: listing_currency_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.listing_currency_type AS ENUM (
    'AP',
    'THB'
);


--
-- Name: listing_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.listing_status_type AS ENUM (
    'ACTIVE',
    'PENDING_PAYMENT',
    'UNPUBLISHED_OVERDUE',
    'SOLD',
    'CANCELLED',
    'EXPIRED'
);


--
-- Name: match_outcome_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.match_outcome_type AS ENUM (
    'NORMAL',
    'FORFEIT',
    'WALKOVER',
    'DISQUALIFICATION',
    'ADMIN_DECISION',
    'DRAW',
    'BYE'
);


--
-- Name: match_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.match_status_type AS ENUM (
    'SCHEDULED',
    'READY_CHECK',
    'VETO',
    'LIVE',
    'PAUSED',
    'AWAITING_RESULT',
    'DISPUTED',
    'COMPLETED',
    'FORFEITED',
    'WALKOVER',
    'BYE',
    'CANCELLED'
);


--
-- Name: membership_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.membership_status_type AS ENUM (
    'INVITED',
    'REQUESTED',
    'ACTIVE',
    'LEFT',
    'KICKED',
    'LOCKED'
);


--
-- Name: notification_channel_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_channel_type AS ENUM (
    'IN_APP',
    'EMAIL',
    'PUSH',
    'DISCORD',
    'LINE'
);


--
-- Name: perk_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.perk_type AS ENUM (
    'HEALTH_WELLNESS_CHECK'
);


--
-- Name: prediction_pool_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.prediction_pool_status_type AS ENUM (
    'OPEN',
    'LOCKED',
    'SETTLED',
    'SETTLEMENT_ERROR',
    'VOIDED',
    'JACKPOT_CARRIED'
);


--
-- Name: prediction_ticket_tier_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.prediction_ticket_tier_type AS ENUM (
    'BRONZE',
    'SILVER',
    'GOLD',
    'PLATINUM'
);


--
-- Name: quest_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quest_type_enum AS ENUM (
    'LOGIN',
    'WATCH_STREAM',
    'PLAY_MATCH',
    'PREDICT_POOL',
    'STREAK_7DAY'
);


--
-- Name: result_source_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.result_source_type AS ENUM (
    'GAME_API',
    'PLAYER_REPORT',
    'REFEREE',
    'ADMIN_OVERRIDE'
);


--
-- Name: scrim_participant_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.scrim_participant_role_enum AS ENUM (
    'TEAM_A_STARTER',
    'TEAM_B_STARTER',
    'RESERVE_SUB',
    'STAFF_OBSERVER'
);


--
-- Name: scrim_room_status_enum; Type: TYPE; Schema: public; Owner: -
--

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


--
-- Name: sponsor_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sponsor_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'SUSPENDED'
);


--
-- Name: sponsor_tier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sponsor_tier AS ENUM (
    'SPONSOR',
    'SPONSOR_PARTNER',
    'PARTNER_COOP'
);


--
-- Name: stage_format_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stage_format_type AS ENUM (
    'SINGLE_ELIMINATION',
    'DOUBLE_ELIMINATION',
    'SWISS',
    'ROUND_ROBIN',
    'GROUP_STAGE',
    'GAUNTLET',
    'SHOWDOWN'
);


--
-- Name: stage_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stage_status_type AS ENUM (
    'PENDING',
    'SEEDING',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: stream_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stream_status_type AS ENUM (
    'SCHEDULED',
    'LIVE',
    'ENDED',
    'PROCESSING',
    'AVAILABLE',
    'REMOVED'
);


--
-- Name: stream_type_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stream_type_type AS ENUM (
    'LIVE_MATCH',
    'VOD',
    'HIGHLIGHT',
    'CREATOR',
    'OFFICIAL'
);


--
-- Name: subscriber_owner_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscriber_owner_type AS ENUM (
    'PLAYER',
    'TEAM'
);


--
-- Name: subscription_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_status_type AS ENUM (
    'ACTIVE',
    'GRACE_PERIOD',
    'PAST_DUE',
    'EXPIRED',
    'CANCELLED'
);


--
-- Name: team_role_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.team_role_type AS ENUM (
    'OWNER',
    'CAPTAIN',
    'PLAYER',
    'SUBSTITUTE',
    'COACH',
    'MANAGER'
);


--
-- Name: user_role_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role_type AS ENUM (
    'ATHLETE',
    'TEAM_MANAGER',
    'ORG_OWNER',
    'CASTER',
    'REFEREE',
    'ADMIN',
    'SUPER_ADMIN',
    'MARKETPLACE_ADMIN'
);


--
-- Name: valorant_agent_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.valorant_agent_role_enum AS ENUM (
    'DUELIST',
    'INITIATOR',
    'CONTROLLER',
    'SENTINEL',
    'FLEX'
);


--
-- Name: verification_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.verification_status_type AS ENUM (
    'UNVERIFIED',
    'PENDING',
    'VERIFIED',
    'MANUAL_REVIEW',
    'REJECTED',
    'REVOKED'
);


--
-- Name: veto_action_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.veto_action_type AS ENUM (
    'BAN',
    'PICK',
    'DECIDER',
    'SIDE_PICK'
);


--
-- Name: win_condition_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.win_condition_enum AS ENUM (
    'elimination',
    'spike_detonate',
    'spike_defuse',
    'time_expire'
);


--
-- Name: admin_revert_prediction_pool(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_revert_prediction_pool(p_pool_id uuid, p_admin_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: admin_void_match_and_refund(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_void_match_and_refund(p_match_id uuid, p_admin_id uuid, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: advance_bracket_node(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.advance_bracket_node(p_match_id uuid, p_winner_team_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_current_node RECORD;
  v_next_node_id UUID;
BEGIN
  SELECT id, next_node_id, next_node_slot
  INTO v_current_node
  FROM public.bracket_nodes
  WHERE match_id = p_match_id
  LIMIT 1;

  IF NOT FOUND OR v_current_node.next_node_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No forward bracket node to advance'
    );
  END IF;

  v_next_node_id := v_current_node.next_node_id;

  IF v_current_node.next_node_slot = 'team_b' THEN
    UPDATE public.bracket_nodes
    SET team_b_id = p_winner_team_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_next_node_id;
  ELSE
    UPDATE public.bracket_nodes
    SET team_a_id = p_winner_team_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_next_node_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'advanced_to_node_id', v_next_node_id,
    'winner_team_id', p_winner_team_id
  );
END;
$$;


--
-- Name: approve_scrim_room(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_scrim_room(p_room_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: audit_stage_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_stage_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO public.audit_logs (
            actor_id, action, entity_type, entity_id,
            before_data, after_data, reason
        ) VALUES (
            public.current_player_id(), 'UPDATE', 'tournament_stages', NEW.id,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            'Stage status changed from ' || OLD.status || ' to ' || NEW.status
        );
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: buy_prediction_ticket(uuid, uuid, uuid, public.prediction_ticket_tier_type, bigint, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.buy_prediction_ticket(p_pool_id uuid, p_player_id uuid, p_predicted_team_id uuid, p_tier public.prediction_ticket_tier_type, p_ap_amount bigint, p_idempotency_key text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: buyout_athlete_listing(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.buyout_athlete_listing(p_listing_id uuid, p_buyer_player_id uuid, p_destination_team_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_listing RECORD;
    v_buyer_ap INT;
    v_fee INT;
    v_payout INT;
BEGIN
    SET LOCAL lock_timeout = '3s';

    SELECT * INTO v_listing
    FROM public.athlete_market_listings
    WHERE id = p_listing_id AND status = 'ACTIVE'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'LISTING_NOT_ACTIVE', 'message', 'รายการสัญญานี้ไม่พร้อมจำหน่ายหรือถูกปิดไปแล้ว');
    END IF;

    IF v_listing.buyout_price_ap IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'BUYOUT_NOT_SUPPORTED', 'message', 'รายการนี้เปิดเฉพาะประมูลราคาปิดเท่านั้น');
    END IF;

    IF public.check_athlete_roster_lock(v_listing.target_player_id) THEN
        RETURN jsonb_build_object('success', false, 'code', 'ROSTER_LOCKED', 'message', 'นักกีฬากำลังติด Roster Lock ในทัวร์นาเมนต์ที่กำลังแข่ง');
    END IF;

    SELECT ap_balance INTO v_buyer_ap
    FROM public.players
    WHERE id = p_buyer_player_id
    FOR UPDATE;

    IF v_buyer_ap < v_listing.buyout_price_ap THEN
        RETURN jsonb_build_object('success', false, 'code', 'INSUFFICIENT_AP_BALANCE', 'message', 'แต้ม AP ของท่านไม่เพียงพอสำหรับ Buyout');
    END IF;

    -- คำนวณ Platform Fee 5% และยอดโอนให้ผู้ขาย
    v_fee := FLOOR(v_listing.buyout_price_ap * 0.05);
    v_payout := v_listing.buyout_price_ap - v_fee;

    -- ตัดแต้ม AP ผู้ซื้อ และโอนให้ผู้ขาย
    UPDATE public.players SET ap_balance = ap_balance - v_listing.buyout_price_ap WHERE id = p_buyer_player_id;
    UPDATE public.players SET ap_balance = ap_balance + v_payout WHERE id = v_listing.seller_player_id;

    -- เผา Fee 5% เข้า Treasury Burn Ledger
    IF v_fee > 0 THEN
        INSERT INTO public.system_burn_ledger (source_module, burned_ap_amount, reference_id)
        VALUES ('TRANSFER_MARKET_FEE', v_fee, p_listing_id);
    END IF;

    -- คืนแต้มให้ผู้ยื่นประมูลราคาสูงสุดเดิม (ถ้ามี)
    IF v_listing.highest_bidder_id IS NOT NULL AND v_listing.current_highest_bid_ap > 0 THEN
        UPDATE public.players 
        SET ap_balance = ap_balance + v_listing.current_highest_bid_ap 
        WHERE id = v_listing.highest_bidder_id;

        UPDATE public.athlete_market_bids
        SET status = 'REFUNDED'
        WHERE listing_id = p_listing_id AND status = 'ACCEPTED';
    END IF;

    -- ย้ายสังกัดใน team_members
    UPDATE public.team_members
    SET team_id = p_destination_team_id,
        role = 'PLAYER',
        updated_at = NOW()
    WHERE player_id = v_listing.target_player_id AND status = 'ACTIVE';

    IF NOT FOUND THEN
        INSERT INTO public.team_members (team_id, player_id, role, status)
        VALUES (p_destination_team_id, v_listing.target_player_id, 'PLAYER', 'ACTIVE');
    END IF;

    UPDATE public.athlete_market_listings
    SET status = 'SOLD', updated_at = NOW()
    WHERE id = p_listing_id;

    INSERT INTO public.athlete_transfer_history (
        listing_id, player_id, from_team_id, to_team_id, deal_type, final_price_ap, platform_fee_ap, seller_payout_ap
    ) VALUES (
        p_listing_id, v_listing.target_player_id, v_listing.seller_team_id, p_destination_team_id, 'INSTANT_BUYOUT', v_listing.buyout_price_ap, v_fee, v_payout
    );

    RETURN jsonb_build_object(
        'success', true,
        'deal_type', 'INSTANT_BUYOUT',
        'deal_price', v_listing.buyout_price_ap,
        'fee_burned', v_fee,
        'seller_payout', v_payout,
        'message', 'ดำเนินการซื้อสัญญาตัวนักกีฬาสำเร็จเรียบร้อย'
    );
END;
$$;


--
-- Name: buyout_marketplace_item(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.buyout_marketplace_item(p_listing_id uuid, p_buyer_id uuid, p_idempotency_key text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_listing       RECORD;
    v_vendor        RECORD;
    v_prev_bidder   UUID;
    v_prev_amount   NUMERIC;
    v_debit         JSONB;
    v_refund        JSONB;
BEGIN
    SET LOCAL lock_timeout = '3s';

    SELECT * INTO v_listing FROM public.marketplace_listings WHERE id = p_listing_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'LISTING_NOT_FOUND');
    END IF;

    IF v_listing.status <> 'ACTIVE' THEN
        RETURN jsonb_build_object('success', false, 'error', 'ITEM_ALREADY_SOLD');
    END IF;

    IF v_listing.buyout_price IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'BUYOUT_NOT_AVAILABLE');
    END IF;

    SELECT * INTO v_vendor FROM public.vendors WHERE id = v_listing.vendor_id;
    IF v_vendor.player_id = p_buyer_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'SELF_BID_FORBIDDEN');
    END IF;

    v_prev_bidder := v_listing.highest_bidder_id;
    v_prev_amount := v_listing.current_highest_bid;

    IF v_prev_bidder IS NOT NULL THEN
        PERFORM 1 FROM public.players WHERE id = LEAST(p_buyer_id, v_prev_bidder) FOR UPDATE;
        PERFORM 1 FROM public.players WHERE id = GREATEST(p_buyer_id, v_prev_bidder) FOR UPDATE;
    ELSE
        PERFORM 1 FROM public.players WHERE id = p_buyer_id FOR UPDATE;
    END IF;

    v_debit := public.move_ap(p_buyer_id, -v_listing.buyout_price, 'MARKETPLACE_BID', p_idempotency_key, 'marketplace_listing', p_listing_id);
    IF (v_debit->>'success')::boolean IS NOT TRUE THEN
        IF v_debit->>'error' = 'DUPLICATE_KEY' THEN
            RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_KEY');
        END IF;
        RETURN jsonb_build_object('success', false, 'error', COALESCE(v_debit->>'error', 'INSUFFICIENT_AP_BALANCE'));
    END IF;

    IF v_prev_bidder IS NOT NULL AND v_prev_amount IS NOT NULL THEN
        v_refund := public.move_ap(v_prev_bidder, v_prev_amount, 'MARKETPLACE_REFUND', p_idempotency_key || '-refund', 'marketplace_listing', p_listing_id);
        IF (v_refund->>'success')::boolean IS NOT TRUE AND v_refund->>'error' <> 'DUPLICATE_KEY' THEN
            RAISE EXCEPTION 'OUTBID_REFUND_FAILED: %', v_refund->>'error';
        END IF;
    END IF;

    UPDATE public.marketplace_listings
    SET status = 'SOLD', current_highest_bid = v_listing.buyout_price, highest_bidder_id = p_buyer_id
    WHERE id = p_listing_id;

    PERFORM public.move_ap(v_vendor.player_id, v_listing.buyout_price, 'MARKETPLACE_SOLD', p_idempotency_key || '-sold', 'marketplace_listing', p_listing_id);

    INSERT INTO public.marketplace_trade_history (listing_id, item_title, seller_id, buyer_id, sold_price, currency_type)
    VALUES (p_listing_id, v_listing.item_title, v_vendor.player_id, p_buyer_id, v_listing.buyout_price, v_listing.currency_type);

    RETURN jsonb_build_object('success', true, 'matched', true, 'listing_id', p_listing_id);
END;
$$;


--
-- Name: check_athlete_roster_lock(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_athlete_roster_lock(p_player_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_active_match_count INT;
BEGIN
    SELECT COUNT(*) INTO v_active_match_count
    FROM public.team_members tm
    JOIN public.matches m ON (m.team_a_id = tm.team_id OR m.team_b_id = tm.team_id)
    WHERE tm.player_id = p_player_id
      AND tm.status = 'ACTIVE'
      AND m.status IN ('SCHEDULED', 'READY_CHECK', 'VETO', 'LIVE');

    RETURN v_active_match_count > 0;
END;
$$;


--
-- Name: check_receiver_status_on_escrow(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_receiver_status_on_escrow() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    r_escrow RECORD;
    v_refund JSONB;
BEGIN
    IF NEW.status IN ('BANNED', 'SUSPENDED') AND OLD.status IS DISTINCT FROM NEW.status THEN
        FOR r_escrow IN
            SELECT * FROM public.ap_escrow WHERE receiver_id = NEW.id AND status = 'PENDING' FOR UPDATE
        LOOP
            v_refund := public.move_ap(r_escrow.sender_id, r_escrow.amount_ap, 'ESCROW_SETTLED', r_escrow.id::text || '-banned-refund', 'ap_escrow', r_escrow.id);

            UPDATE public.ap_escrow
            SET status = 'CANCELLED_BANNED', cancelled_at = NOW()
            WHERE id = r_escrow.id;

            INSERT INTO public.audit_logs (action, entity_type, entity_id, before_data, after_data, reason)
            VALUES (
                'UPDATE', 'ap_escrow', r_escrow.id,
                jsonb_build_object('status', 'PENDING'),
                jsonb_build_object('status', 'CANCELLED_BANNED', 'refund_result', v_refund),
                'RECEIVER_BANNED_AUTO_REFUND'
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: checkout_order(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.checkout_order(p_order_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_player_id       UUID;
    v_status          VARCHAR;
    v_total_ap        INTEGER;
    v_expires_at      TIMESTAMPTZ;
    v_caller          UUID := public.current_player_id();
    v_move_result     JSONB;
    r_item            RECORD;
    v_store_type      VARCHAR;
    v_eq_type         VARCHAR;
    v_fulfilled_count INTEGER := 0;
    v_balance_after   NUMERIC;
BEGIN
    SELECT player_id, status, total_price_ap, expires_at
    INTO v_player_id, v_status, v_total_ap, v_expires_at
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND';
    END IF;

    -- v_caller IS NULL = ไม่มี auth session (เรียกจาก webhook/service-role) ปล่อยผ่าน
    IF v_caller IS NOT NULL AND v_caller IS DISTINCT FROM v_player_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    IF v_status <> 'PENDING' THEN
        RAISE EXCEPTION 'ORDER_NOT_PENDING';
    END IF;

    IF v_expires_at < NOW() THEN
        RAISE EXCEPTION 'ORDER_EXPIRED';
    END IF;

    IF v_total_ap > 0 THEN
        v_move_result := public.move_ap(
            v_player_id, -v_total_ap, 'STORE_REDEEM',
            'checkout-order-' || p_order_id::text, 'order', p_order_id
        );

        IF NOT (v_move_result->>'success')::boolean THEN
            IF v_move_result->>'error' = 'INSUFFICIENT_AP_BALANCE' THEN
                RAISE EXCEPTION 'INSUFFICIENT_AP';
            ELSIF v_move_result->>'error' = 'DUPLICATE_KEY' THEN
                RAISE EXCEPTION 'ORDER_NOT_PENDING';
            ELSE
                RAISE EXCEPTION '%', v_move_result->>'error';
            END IF;
        END IF;

        v_balance_after := (v_move_result->>'balance_after')::numeric;
    END IF;

    FOR r_item IN
        SELECT variant_id, quantity, name_at FROM public.order_items WHERE order_id = p_order_id
    LOOP
        UPDATE public.store_item_variants
        SET stock = stock - r_item.quantity,
            reserved_stock = reserved_stock - r_item.quantity
        WHERE id = r_item.variant_id;

        SELECT i.type INTO v_store_type
        FROM public.store_items i
        JOIN public.store_item_variants v ON v.item_id = i.id
        WHERE v.id = r_item.variant_id;

        IF v_store_type = 'DIGITAL' THEN
            v_eq_type := 'FRAME';
            IF POSITION('badge' IN LOWER(r_item.name_at)) > 0 THEN
                v_eq_type := 'BADGE';
            ELSIF POSITION('title' IN LOWER(r_item.name_at)) > 0 THEN
                v_eq_type := 'TITLE';
            END IF;

            INSERT INTO public.player_inventory (player_id, variant_id, item_type, is_equipped, quantity)
            VALUES (v_player_id, r_item.variant_id, v_eq_type, FALSE, r_item.quantity)
            ON CONFLICT (player_id, variant_id) DO UPDATE
                SET quantity = public.player_inventory.quantity + EXCLUDED.quantity;

        ELSIF v_store_type = 'PHYSICAL' THEN
            INSERT INTO public.shipments (order_id, status)
            VALUES (p_order_id, 'PENDING');
        END IF;

        v_fulfilled_count := v_fulfilled_count + 1;
    END LOOP;

    UPDATE public.orders SET status = 'PAID' WHERE id = p_order_id;

    IF v_balance_after IS NULL THEN
        SELECT ap_balance INTO v_balance_after FROM public.players WHERE id = v_player_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'status', 'PAID',
        'fulfilled_items_count', v_fulfilled_count,
        'ap_deducted', v_total_ap,
        'remaining_balance', COALESCE(v_balance_after, 0)
    );
END;
$$;


--
-- Name: claim_daily_quest_reward(uuid, character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_daily_quest_reward(p_player_id uuid, p_quest_id character varying, p_idempotency_key character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_quest RECORD;
    v_progress RECORD;
    v_daily_earned NUMERIC := 0.00;
    v_user_auth_id UUID;
    v_ledger_res JSONB;
BEGIN
    SET LOCAL lock_timeout = '3s';

    SELECT user_id INTO v_user_auth_id FROM public.players WHERE id = p_player_id;
    IF v_user_auth_id IS NULL OR (v_user_auth_id <> auth.uid() AND auth.role() <> 'service_role') THEN
        RAISE EXCEPTION 'UNAUTHORIZED_ACCESS: Cannot claim quest for another player' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_quest FROM public.daily_quests WHERE id = p_quest_id AND is_active = true;
    IF v_quest.id IS NULL THEN
        RAISE EXCEPTION 'QUEST_NOT_FOUND: Invalid or inactive quest' USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO v_progress FROM public.player_daily_quests
    WHERE player_id = p_player_id AND quest_id = p_quest_id AND quest_date = CURRENT_DATE
    FOR UPDATE;

    IF v_progress.id IS NULL OR NOT v_progress.is_completed THEN
        RAISE EXCEPTION 'QUEST_NOT_COMPLETED: Quest conditions not met' USING ERRCODE = 'P0002';
    END IF;

    IF v_progress.is_claimed THEN
        RAISE EXCEPTION 'ALREADY_CLAIMED: Reward already claimed for today' USING ERRCODE = 'P0003';
    END IF;

    SELECT COALESCE(ap_earned, 0) INTO v_daily_earned
    FROM public.ap_daily_limits
    WHERE player_id = p_player_id AND limit_date = CURRENT_DATE
    FOR UPDATE;

    IF (v_daily_earned + v_quest.reward_ap) > 100.00 THEN
        RAISE EXCEPTION 'DAILY_CAP_EXCEEDED: Daily limit of 100 AP reached' USING ERRCODE = 'P0004';
    END IF;

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

    INSERT INTO public.ap_daily_limits (player_id, limit_date, ap_earned)
    VALUES (p_player_id, CURRENT_DATE, v_quest.reward_ap)
    ON CONFLICT (player_id, limit_date)
    DO UPDATE SET ap_earned = public.ap_daily_limits.ap_earned + v_quest.reward_ap, updated_at = NOW();

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


--
-- Name: claim_mercy_sub_slot(uuid, uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_mercy_sub_slot(p_ticket_id uuid, p_ringer_player_id uuid, p_idempotency_key character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: claim_watch_reward(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_watch_reward(p_session_id uuid, p_idempotency_key text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
            COALESCE(p_idempotency_key, 'claim-session-' || p_session_id::text),
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


--
-- Name: clean_expired_orders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clean_expired_orders() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    r_order       RECORD;
    r_item        RECORD;
    v_clean_count INTEGER := 0;
BEGIN
    FOR r_order IN
        SELECT id FROM public.orders
        WHERE status = 'PENDING' AND expires_at < NOW()
        FOR UPDATE
    LOOP
        FOR r_item IN
            SELECT variant_id, quantity FROM public.order_items WHERE order_id = r_order.id
        LOOP
            UPDATE public.store_item_variants
            SET reserved_stock = GREATEST(reserved_stock - r_item.quantity, 0)
            WHERE id = r_item.variant_id;
        END LOOP;

        UPDATE public.orders SET status = 'EXPIRED' WHERE id = r_order.id;
        v_clean_count := v_clean_count + 1;
    END LOOP;

    RETURN v_clean_count;
END;
$$;


--
-- Name: clean_revoked_game_account(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clean_revoked_game_account() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF NEW.verification_status = 'REVOKED' AND OLD.verification_status IS DISTINCT FROM 'REVOKED' THEN
        NEW.rso_access_token := NULL;
        NEW.rso_refresh_token := NULL;
        NEW.rso_expires_at := NULL;
        NEW.rso_scopes := NULL;
        UPDATE public.players
        SET unverified_data = TRUE, updated_at = NOW()
        WHERE id = NEW.player_id;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: confirm_shelf_payment(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.confirm_shelf_payment(p_listing_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_listing RECORD;
BEGIN
    SELECT * INTO v_listing FROM public.marketplace_listings WHERE id = p_listing_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'LISTING_NOT_FOUND');
    END IF;

    IF v_listing.status <> 'PENDING_PAYMENT' THEN
        RETURN jsonb_build_object('success', false, 'error', 'LISTING_NOT_PENDING_PAYMENT');
    END IF;

    UPDATE public.marketplace_listings
    SET status = 'ACTIVE', shelf_billing_cycle_end = NOW() + INTERVAL '30 days'
    WHERE id = p_listing_id;

    RETURN jsonb_build_object('success', true, 'listing_id', p_listing_id, 'shelf_billing_cycle_end', NOW() + INTERVAL '30 days');
END;
$$;


--
-- Name: consume_p2p_transfer_token(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consume_p2p_transfer_token(p_jti text, p_sender_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    INSERT INTO public.p2p_transfer_used_tokens (jti, sender_id)
    VALUES (p_jti, p_sender_id);
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'TOKEN_ALREADY_USED');
END;
$$;


--
-- Name: create_marketplace_listing(uuid, text, text, jsonb, public.listing_currency_type, numeric, numeric, boolean, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_marketplace_listing(p_vendor_id uuid, p_item_title text, p_description text, p_image_urls jsonb, p_currency_type public.listing_currency_type, p_floor_price numeric, p_buyout_price numeric, p_is_paid_slot boolean, p_auction_ends_at timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_vendor        RECORD;
    v_active_count  INTEGER;
    v_needs_paid    BOOLEAN;
    v_listing_id    UUID;
    v_status        listing_status_type;
BEGIN
    SELECT * INTO v_vendor FROM public.vendors WHERE id = p_vendor_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'VENDOR_NOT_FOUND');
    END IF;

    -- Defensive monthly reset in case the pg_cron sweep hasn't fired yet.
    IF v_vendor.monthly_reset_at <= NOW() THEN
        UPDATE public.vendors
        SET monthly_listing_count = 0,
            monthly_reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
        WHERE id = p_vendor_id;
        v_vendor.monthly_listing_count := 0;
    END IF;

    SELECT COUNT(*) INTO v_active_count
    FROM public.marketplace_listings
    WHERE vendor_id = p_vendor_id AND status = 'ACTIVE';

    IF v_active_count >= v_vendor.concurrent_slot_limit THEN
        RETURN jsonb_build_object('success', false, 'error', 'CONCURRENT_SLOT_FULL');
    END IF;

    v_needs_paid := v_vendor.monthly_listing_count >= 30;
    IF v_needs_paid AND NOT p_is_paid_slot THEN
        RETURN jsonb_build_object('success', false, 'error', 'MONTHLY_CAP_REACHED');
    END IF;

    IF p_buyout_price IS NOT NULL AND p_buyout_price < p_floor_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'BUYOUT_BELOW_FLOOR');
    END IF;

    v_status := CASE WHEN p_is_paid_slot THEN 'PENDING_PAYMENT' ELSE 'ACTIVE' END;

    INSERT INTO public.marketplace_listings (
        vendor_id, item_title, description, image_urls, currency_type,
        floor_price, buyout_price, status, is_paid_slot, auction_ends_at
    )
    VALUES (
        p_vendor_id, p_item_title, p_description, COALESCE(p_image_urls, '[]'::jsonb), p_currency_type,
        p_floor_price, p_buyout_price, v_status, p_is_paid_slot, p_auction_ends_at
    )
    RETURNING id INTO v_listing_id;

    UPDATE public.vendors
    SET monthly_listing_count = monthly_listing_count + 1
    WHERE id = p_vendor_id;

    RETURN jsonb_build_object(
        'success', true,
        'listing_id', v_listing_id,
        'status', v_status,
        'is_paid_slot', p_is_paid_slot,
        'monthly_listing_count', v_vendor.monthly_listing_count + 1,
        'monthly_remaining_free', GREATEST(0, 30 - (v_vendor.monthly_listing_count + 1))
    );
END;
$$;


--
-- Name: create_scrim_room(character varying, uuid, timestamp with time zone, numeric, character varying, character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_scrim_room(p_title character varying, p_creator_player_id uuid, p_scheduled_at timestamp with time zone, p_min_ap_stake numeric, p_target_tier_min character varying DEFAULT 'GOLD'::character varying, p_target_tier_max character varying DEFAULT 'RADIANT'::character varying, p_idempotency_key character varying DEFAULT NULL::character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: create_store_order(jsonb, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_store_order(p_items_json jsonb, p_address_id uuid DEFAULT NULL::uuid, p_idempotency_key text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_player_id      UUID := public.current_player_id();
    v_existing_order UUID;
    v_order_id       UUID;
    v_variant_id     UUID;
    v_qty            INTEGER;
    v_variant        RECORD;
    v_total_ap       INTEGER := 0;
    v_total_thb      INTEGER := 0;
    v_owned_qty      INTEGER;
    v_pending_qty    INTEGER;
BEGIN
    IF v_player_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_order
        FROM public.orders
        WHERE idempotency_key = p_idempotency_key AND player_id = v_player_id;

        IF FOUND THEN
            RETURN v_existing_order;
        END IF;
    END IF;

    INSERT INTO public.orders (player_id, status, shipping_address_id, expires_at, idempotency_key)
    VALUES (v_player_id, 'PENDING', p_address_id, NOW() + INTERVAL '15 minutes', p_idempotency_key)
    RETURNING id INTO v_order_id;

    FOR v_variant_id, v_qty IN
        SELECT key::uuid, value::integer FROM jsonb_each_text(p_items_json)
    LOOP
        SELECT v.id, v.stock, v.reserved_stock, v.price_ap, v.price_thb, v.name,
               v.available_until, v.is_active AS variant_is_active,
               i.type AS item_type, i.max_per_player, i.name AS item_name, i.is_active AS item_is_active
        INTO v_variant
        FROM public.store_item_variants v
        JOIN public.store_items i ON i.id = v.item_id
        WHERE v.id = v_variant_id
        FOR UPDATE OF v;

        IF NOT FOUND OR NOT v_variant.variant_is_active OR NOT v_variant.item_is_active THEN
            RAISE EXCEPTION 'ITEM_NOT_AVAILABLE';
        END IF;

        IF v_variant.available_until IS NOT NULL AND v_variant.available_until < NOW() THEN
            RAISE EXCEPTION 'ITEM_NOT_AVAILABLE';
        END IF;

        IF v_variant.item_type = 'PHYSICAL' AND p_address_id IS NULL THEN
            RAISE EXCEPTION 'SHIPPING_ADDRESS_REQUIRED';
        END IF;

        IF (v_variant.stock - v_variant.reserved_stock) < v_qty THEN
            RAISE EXCEPTION 'OUT_OF_STOCK';
        END IF;

        IF v_variant.max_per_player IS NOT NULL THEN
            SELECT COALESCE(SUM(quantity), 0) INTO v_owned_qty
            FROM public.player_inventory
            WHERE player_id = v_player_id AND variant_id = v_variant_id;

            SELECT COALESCE(SUM(oi.quantity), 0) INTO v_pending_qty
            FROM public.order_items oi
            JOIN public.orders o ON o.id = oi.order_id
            WHERE oi.variant_id = v_variant_id
              AND o.player_id = v_player_id
              AND o.status = 'PENDING';

            IF v_owned_qty + v_pending_qty + v_qty > v_variant.max_per_player THEN
                RAISE EXCEPTION 'MAX_LIMIT_REACHED';
            END IF;
        END IF;

        UPDATE public.store_item_variants
        SET reserved_stock = reserved_stock + v_qty
        WHERE id = v_variant_id;

        INSERT INTO public.order_items (order_id, variant_id, name_at, unit_price_ap, unit_price_thb, quantity)
        VALUES (v_order_id, v_variant_id, v_variant.item_name || ' - ' || v_variant.name, v_variant.price_ap, v_variant.price_thb, v_qty);

        v_total_ap := v_total_ap + (v_variant.price_ap * v_qty);
        v_total_thb := v_total_thb + (v_variant.price_thb * v_qty);
    END LOOP;

    UPDATE public.orders
    SET total_price_ap = v_total_ap, total_price_thb = v_total_thb
    WHERE id = v_order_id;

    RETURN v_order_id;
END;
$$;


--
-- Name: create_subscription_invoice(text, public.subscriber_owner_type, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_subscription_invoice(p_plan_code text, p_subscriber_type public.subscriber_owner_type, p_subscriber_id uuid, p_idempotency_key text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_existing        RECORD;
    v_existing_sub    RECORD;
    v_amount_thb      NUMERIC(10,2);
    v_subscription_id UUID;
    v_invoice_id      UUID;
    v_expires_at      TIMESTAMPTZ;
BEGIN
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, expires_at INTO v_existing
        FROM public.subscription_invoices
        WHERE idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN jsonb_build_object('success', true, 'invoice_id', v_existing.id, 'expires_at', v_existing.expires_at, 'duplicate', true);
        END IF;
    END IF;

    v_amount_thb := CASE p_plan_code
        WHEN 'PRO_CLUB' THEN 2000.00
        WHEN 'VIP_CLUB' THEN 6000.00
        ELSE NULL
    END;

    IF v_amount_thb IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_PLAN');
    END IF;

    -- ห้ามมี subscription ACTIVE/GRACE_PERIOD ซ้ำสำหรับ subscriber เดียวกัน
    IF p_subscriber_type = 'TEAM' THEN
        SELECT id INTO v_existing_sub FROM public.subscriptions
        WHERE team_id = p_subscriber_id AND current_status IN ('ACTIVE', 'GRACE_PERIOD') LIMIT 1;
    ELSE
        SELECT id INTO v_existing_sub FROM public.subscriptions
        WHERE player_id = p_subscriber_id AND current_status IN ('ACTIVE', 'GRACE_PERIOD') LIMIT 1;
    END IF;

    IF FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_SUBSCRIBED', 'subscription_id', v_existing_sub.id);
    END IF;

    INSERT INTO public.subscriptions (subscriber_type, team_id, player_id, plan_code, current_status, valid_until)
    VALUES (
        p_subscriber_type,
        CASE WHEN p_subscriber_type = 'TEAM' THEN p_subscriber_id END,
        CASE WHEN p_subscriber_type = 'PLAYER' THEN p_subscriber_id END,
        p_plan_code,
        'PAST_DUE', -- ยังไม่ ACTIVE จนกว่าจะจ่าย invoice สำเร็จ (ดู mark_invoice_paid ด้านล่าง)
        NOW() -- placeholder, ปรับเป็นจริงตอน mark_invoice_paid
    )
    RETURNING id INTO v_subscription_id;

    v_expires_at := NOW() + INTERVAL '30 minutes';

    INSERT INTO public.subscription_invoices (
        subscription_id, subscriber_type, team_id, player_id,
        amount_thb, currency, status, expires_at, idempotency_key
    )
    VALUES (
        v_subscription_id, p_subscriber_type,
        CASE WHEN p_subscriber_type = 'TEAM' THEN p_subscriber_id END,
        CASE WHEN p_subscriber_type = 'PLAYER' THEN p_subscriber_id END,
        v_amount_thb, 'THB', 'PENDING', v_expires_at, p_idempotency_key
    )
    RETURNING id INTO v_invoice_id;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', v_invoice_id,
        'subscription_id', v_subscription_id,
        'amount', v_amount_thb,
        'currency', 'THB',
        'expires_at', v_expires_at
    );
END;
$$;


--
-- Name: credit_watch_v2_heartbeat(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.credit_watch_v2_heartbeat(p_session_id uuid, p_player_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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

    v_move := public.move_ap(p_player_id, v_award, 'WATCH_EARN', p_session_id::text || '-tick-' || extract(epoch from now())::bigint::text, 'watch_session', p_session_id);
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


--
-- Name: current_player_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_player_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT id FROM public.players WHERE user_id = auth.uid() LIMIT 1;
$$;


--
-- Name: deduct_player_ap_fine(uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deduct_player_ap_fine(p_player_id uuid, p_amount numeric, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_current_ap NUMERIC := 0;
  v_new_ap NUMERIC := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only Admin/Referee can deduct AP fine';
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'No fine applied (amount <= 0)');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'player_wallets') THEN
    SELECT ap_balance INTO v_current_ap 
    FROM public.player_wallets 
    WHERE player_id = p_player_id 
    FOR UPDATE;

    IF v_current_ap IS NULL THEN
      INSERT INTO public.player_wallets (player_id, ap_balance)
      VALUES (p_player_id, 0)
      RETURNING ap_balance INTO v_current_ap;
    END IF;

    v_new_ap := GREATEST(0, v_current_ap - p_amount);

    UPDATE public.player_wallets
    SET ap_balance = v_new_ap,
        updated_at = timezone('utc'::text, now())
    WHERE player_id = p_player_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    INSERT INTO public.audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      reason,
      after_data
    ) VALUES (
      (SELECT id FROM public.players WHERE user_id = auth.uid() LIMIT 1),
      'UPDATE',
      'player_ap_wallet',
      p_player_id,
      p_reason,
      jsonb_build_object('deducted', p_amount, 'new_balance', v_new_ap)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'player_id', p_player_id,
    'deducted_amount', p_amount,
    'new_balance', v_new_ap
  );
END;
$$;


--
-- Name: dispute_escrow_and_refund(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dispute_escrow_and_refund(p_escrow_id uuid, p_sender_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_escrow RECORD;
    v_refund JSONB;
BEGIN
    SELECT * INTO v_escrow FROM public.ap_escrow WHERE id = p_escrow_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ESCROW_NOT_FOUND');
    END IF;

    IF v_escrow.sender_id <> p_sender_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
    END IF;

    IF v_escrow.status <> 'PENDING' THEN
        RETURN jsonb_build_object('success', false, 'error', 'ESCROW_NOT_PENDING');
    END IF;

    v_refund := public.move_ap(v_escrow.sender_id, v_escrow.amount_ap, 'ESCROW_SETTLED', p_escrow_id::text || '-dispute-refund', 'ap_escrow', p_escrow_id);
    IF (v_refund->>'success')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'ESCROW_DISPUTE_REFUND_FAILED: %', v_refund->>'error';
    END IF;

    UPDATE public.ap_escrow SET status = 'DISPUTED', cancelled_at = NOW() WHERE id = p_escrow_id;

    RETURN jsonb_build_object('success', true, 'escrow_id', p_escrow_id, 'status', 'DISPUTED', 'refunded_ap', v_escrow.amount_ap);
END;
$$;


--
-- Name: enforce_listing_state_transition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_listing_state_transition() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_allowed BOOLEAN := FALSE;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    IF OLD.status IN ('SOLD', 'CANCELLED', 'EXPIRED') THEN
        RAISE EXCEPTION 'INVALID_LISTING_TRANSITION: Terminal status % cannot change to %', OLD.status, NEW.status;
    END IF;

    CASE OLD.status
        WHEN 'ACTIVE' THEN
            IF NEW.status IN ('SOLD', 'CANCELLED', 'EXPIRED', 'UNPUBLISHED_OVERDUE', 'PENDING_PAYMENT') THEN
                v_allowed := TRUE;
            END IF;
        WHEN 'PENDING_PAYMENT' THEN
            IF NEW.status IN ('ACTIVE', 'CANCELLED') THEN
                v_allowed := TRUE;
            END IF;
        WHEN 'UNPUBLISHED_OVERDUE' THEN
            IF NEW.status IN ('ACTIVE', 'CANCELLED') THEN
                v_allowed := TRUE;
            END IF;
        ELSE
            v_allowed := FALSE;
    END CASE;

    IF NOT v_allowed THEN
        RAISE EXCEPTION 'INVALID_LISTING_TRANSITION: Cannot transition listing % from % to %', OLD.id, OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: enforce_single_team_per_game(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_single_team_per_game() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  target_game_id UUID;
BEGIN
  -- ดึง game_id ของทีมที่กำลัง Join
  SELECT game_id INTO target_game_id
  FROM public.teams
  WHERE id = NEW.team_id;

  -- ตรวจว่า Player อยู่ทีมอื่นในเกมเดียวกันอยู่แล้วไหม
  IF EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.player_id = NEW.player_id
      AND t.game_id = target_game_id
      AND tm.status = 'ACTIVE'
      AND tm.team_id != NEW.team_id
  ) THEN
    RAISE EXCEPTION 'Player is already an ACTIVE member of another team in the same game';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: equip_inventory_item(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.equip_inventory_item(p_variant_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_player_id UUID := public.current_player_id();
    v_item      RECORD;
BEGIN
    IF v_player_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    SELECT id, item_type INTO v_item
    FROM public.player_inventory
    WHERE player_id = v_player_id AND variant_id = p_variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ITEM_NOT_OWNED');
    END IF;

    UPDATE public.player_inventory
    SET is_equipped = FALSE
    WHERE player_id = v_player_id AND item_type = v_item.item_type AND id <> v_item.id AND is_equipped = TRUE;

    UPDATE public.player_inventory
    SET is_equipped = TRUE
    WHERE id = v_item.id;

    RETURN jsonb_build_object('success', true, 'item_type', v_item.item_type, 'variant_id', p_variant_id);
END;
$$;


--
-- Name: generate_athlete_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_athlete_id() RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN 'ZA-' || LPAD(nextval('public.athlete_id_seq')::TEXT, 4, '0');
END;
$$;


--
-- Name: get_athlete_telemetry_dashboard(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_athlete_telemetry_dashboard(p_player_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_player RECORD;
    v_verification RECORD;
    v_stats RECORD;
    v_team RECORD;
    v_recent_20_outcomes JSONB;
    v_recent_matches JSONB;
BEGIN
    SET LOCAL lock_timeout = '3s';

    -- 1. Fetch Player Base Profile
    SELECT p.id, p.athlete_id, p.display_name, p.avatar_url, p.ap_balance
    INTO v_player
    FROM public.players p
    WHERE p.id = p_player_id;

    IF v_player.id IS NULL THEN
        RAISE EXCEPTION 'PLAYER_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    -- 2. Fetch Primary Game Account & Rank Snapshot
    SELECT game_name, tag_line, verification_status, rank_snapshot
    INTO v_verification
    FROM public.game_accounts
    WHERE player_id = p_player_id AND is_primary = true
    ORDER BY created_at DESC LIMIT 1;

    -- 3. Fetch Player Team Info & ZP Balance
    SELECT t.name AS team_name, t.total_zp, tm.role
    INTO v_team
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.player_id = p_player_id
    ORDER BY tm.created_at DESC LIMIT 1;

    -- 4. Fetch Aggregate Stats from player_stats
    SELECT matches_played, matches_won, matches_lost, win_rate,
           avg_acs, avg_kd, avg_kda, avg_adr, headshot_pct,
           agent_pool, map_performance
    INTO v_stats
    FROM public.player_stats
    WHERE player_id = p_player_id
    ORDER BY updated_at DESC LIMIT 1;

    -- 5. Aggregate Recent 20 Outcomes (W/L)
    SELECT COALESCE(jsonb_agg(
        CASE WHEN m.winner_team_id = mp.team_id THEN 'W' ELSE 'L' END
    ), '[]'::jsonb)
    INTO v_recent_20_outcomes
    FROM (
        SELECT match_id, team_id
        FROM public.match_participants
        WHERE player_id = p_player_id
        ORDER BY created_at DESC
        LIMIT 20
    ) mp
    JOIN public.matches m ON m.id = mp.match_id
    WHERE m.status = 'COMPLETED';

    -- 6. Fetch Last 3 Matches History
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'matchId', m.id,
            'result', CASE WHEN m.winner_team_id = mp.team_id THEN 'WIN' ELSE 'LOSS' END,
            'scoreSummary', COALESCE(m.rounds_won_a::text || ' - ' || m.rounds_won_b::text, '13 - 7'),
            'opponentTeamName', CASE WHEN mp.team_id = m.team_a_id THEN t_b.name ELSE t_a.name END,
            'acs', COALESCE(mp.acs, 250),
            'kd', ROUND((mp.kills::numeric / GREATEST(mp.deaths, 1)), 1)
        )
    ), '[]'::jsonb)
    INTO v_recent_matches
    FROM (
        SELECT match_id, team_id, kills, deaths, assists, acs
        FROM public.match_participants
        WHERE player_id = p_player_id
        ORDER BY created_at DESC
        LIMIT 3
    ) mp
    JOIN public.matches m ON m.id = mp.match_id
    LEFT JOIN public.teams t_a ON t_a.id = m.team_a_id
    LEFT JOIN public.teams t_b ON t_b.id = m.team_b_id
    WHERE m.status = 'COMPLETED';

    -- 7. Composite Return Payload
    RETURN jsonb_build_object(
        'profile', jsonb_build_object(
            'id', v_player.id,
            'displayName', COALESCE(v_player.display_name, 'NOVA_LEO'),
            'riotId', COALESCE(v_verification.game_name || '#' || v_verification.tag_line, 'ren george#333'),
            'isVerified', (COALESCE(v_verification.verification_status::text, 'UNVERIFIED') = 'VERIFIED'),
            'divisionTier', 'CELESTIAL',
            'zodiacSign', 'LEO',
            'role', COALESCE(v_team.role::text, 'DUELIST'),
            'teamName', COALESCE(v_team.team_name, 'ARIES ESPORTS'),
            'zpBalance', COALESCE(v_team.total_zp, 1450),
            'apBalance', COALESCE(v_player.ap_balance, 850)
        ),
        'kpi', jsonb_build_object(
            'acs', COALESCE(v_stats.avg_acs, 268),
            'kdRatio', COALESCE(v_stats.avg_kd, 1.45),
            'winRatePct', COALESCE(v_stats.win_rate, 68),
            'kastPct', 74.2,
            'headshotPct', COALESCE(v_stats.headshot_pct, 33.3),
            'adr', COALESCE(v_stats.avg_adr, 153.8),
            'recentRecord', COALESCE(v_stats.matches_won::text || 'W - ' || v_stats.matches_lost::text || 'L', '14W - 6L')
        ),
        'radar', jsonb_build_object(
            'aim', COALESCE(v_stats.headshot_pct, 85),
            'acs', 92,
            'firstKills', 84,
            'clutchPct', 78,
            'utility', 88
        ),
        'recentMatches', v_recent_matches
    );
END;
$$;


--
-- Name: get_athlete_telemetry_dashboard_v26(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_athlete_telemetry_dashboard_v26(p_player_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_player RECORD;
    v_owner_auth_id UUID;
    v_is_self BOOLEAN;
    v_verification RECORD;
    v_stats RECORD;
    v_zodiac_sign TEXT;
    v_dob_month INT;
    v_dob_day INT;
    v_recent_20_tiles JSONB;
    v_recent_20_matches JSONB;
    v_accuracy_anatomy JSONB;
    v_roles_breakdown JSONB;
    v_top_weapons JSONB;
    v_rolling20_wins INT;
    v_rolling20_count INT;
BEGIN
    SET LOCAL lock_timeout = '3s';

    IF auth.uid() IS NULL AND auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'UNAUTHORIZED_ACCESS: Sign in to view athlete telemetry.' USING ERRCODE = '42501';
    END IF;

    SELECT p.id, p.athlete_id, p.display_name, p.avatar_url, p.ap_balance, p.date_of_birth, p.user_id
    INTO v_player
    FROM public.players p
    WHERE p.id = p_player_id;

    IF v_player.id IS NULL THEN
        RAISE EXCEPTION 'PLAYER_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    v_owner_auth_id := v_player.user_id;
    v_is_self := (v_owner_auth_id = auth.uid()) OR (auth.role() = 'service_role');

    v_dob_month := EXTRACT(MONTH FROM v_player.date_of_birth);
    v_dob_day := EXTRACT(DAY FROM v_player.date_of_birth);
    v_zodiac_sign := CASE
        WHEN v_player.date_of_birth IS NULL THEN NULL
        WHEN (v_dob_month = 3 AND v_dob_day >= 21) OR (v_dob_month = 4 AND v_dob_day <= 19) THEN 'Aries'
        WHEN (v_dob_month = 4 AND v_dob_day >= 20) OR (v_dob_month = 5 AND v_dob_day <= 20) THEN 'Taurus'
        WHEN (v_dob_month = 5 AND v_dob_day >= 21) OR (v_dob_month = 6 AND v_dob_day <= 20) THEN 'Gemini'
        WHEN (v_dob_month = 6 AND v_dob_day >= 21) OR (v_dob_month = 7 AND v_dob_day <= 22) THEN 'Cancer'
        WHEN (v_dob_month = 7 AND v_dob_day >= 23) OR (v_dob_month = 8 AND v_dob_day <= 22) THEN 'Leo'
        WHEN (v_dob_month = 8 AND v_dob_day >= 23) OR (v_dob_month = 9 AND v_dob_day <= 22) THEN 'Virgo'
        WHEN (v_dob_month = 9 AND v_dob_day >= 23) OR (v_dob_month = 10 AND v_dob_day <= 22) THEN 'Libra'
        WHEN (v_dob_month = 10 AND v_dob_day >= 23) OR (v_dob_month = 11 AND v_dob_day <= 21) THEN 'Scorpio'
        WHEN (v_dob_month = 11 AND v_dob_day >= 22) OR (v_dob_month = 12 AND v_dob_day <= 21) THEN 'Sagittarius'
        WHEN (v_dob_month = 12 AND v_dob_day >= 22) OR (v_dob_month = 1 AND v_dob_day <= 19) THEN 'Capricorn'
        WHEN (v_dob_month = 1 AND v_dob_day >= 20) OR (v_dob_month = 2 AND v_dob_day <= 18) THEN 'Aquarius'
        ELSE 'Pisces'
    END;

    SELECT game_name, tag_line, verification_status, rank_snapshot
    INTO v_verification
    FROM public.game_accounts
    WHERE player_id = p_player_id AND is_primary = true
    ORDER BY created_at DESC LIMIT 1;

    SELECT matches_played, matches_won, matches_lost, win_rate,
           avg_acs, avg_kd, avg_kda, avg_adr, headshot_pct,
           agent_pool, map_performance
    INTO v_stats
    FROM public.player_stats
    WHERE player_id = p_player_id
    ORDER BY updated_at DESC LIMIT 1;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'matchId', m.id,
            'timeAgo', CASE
                WHEN EXTRACT(EPOCH FROM (NOW() - m.updated_at)) / 3600 < 1 THEN 'Just now'
                WHEN EXTRACT(EPOCH FROM (NOW() - m.updated_at)) / 3600 < 24 THEN ROUND(EXTRACT(EPOCH FROM (NOW() - m.updated_at)) / 3600)::text || 'h ago'
                ELSE ROUND(EXTRACT(EPOCH FROM (NOW() - m.updated_at)) / 86400)::text || 'd ago'
            END,
            'isWin', (m.winner_team_id = mp.team_id),
            'scoreSummary', mp.score_a::text || ' : ' || mp.score_b::text,
            'kdRatio', ROUND(mp.kills::numeric / GREATEST(1, mp.deaths), 1)
        )
    ), '[]'::jsonb)
    INTO v_recent_20_tiles
    FROM (
        SELECT mp.match_id, mp.team_id, mp.kills, mp.deaths, m2.score_a, m2.score_b
        FROM public.match_participants mp
        JOIN public.matches m2 ON m2.id = mp.match_id
        WHERE mp.player_id = p_player_id AND m2.status = 'COMPLETED'
        ORDER BY mp.created_at DESC
        LIMIT 20
    ) mp
    JOIN public.matches m ON m.id = mp.match_id;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'matchId', m.id,
            'playedAt', m.updated_at,
            'dateLabel', TO_CHAR(m.updated_at, 'Mon DD'),
            'mapName', COALESCE(mg.map_name, 'Unknown'),
            'agentPlayed', mp.agent_played,
            'agentCode', UPPER(LEFT(COALESCE(mp.agent_played, '???'), 3)),
            'roundLabel', COALESCE(m.round_label, 'Match'),
            'isWin', (m.winner_team_id = mp.team_id),
            'scoreSummary', m.score_a::text || ' : ' || m.score_b::text,
            'teamScore', m.score_a,
            'opponentScore', m.score_b,
            'kills', mp.kills,
            'deaths', mp.deaths,
            'assists', mp.assists,
            'kdRatio', ROUND(mp.kills::numeric / GREATEST(1, mp.deaths), 2),
            'acs', mp.acs,
            'adr', mp.adr,
            'headshotPct', mp.headshot_pct
        )
    ), '[]'::jsonb)
    INTO v_recent_20_matches
    FROM (
        SELECT id, match_id, match_game_id, team_id, kills, deaths, assists, acs, headshot_pct, adr, agent_played
        FROM public.match_participants
        WHERE player_id = p_player_id
        ORDER BY created_at DESC
        LIMIT 20
    ) mp
    JOIN public.matches m ON m.id = mp.match_id
    LEFT JOIN public.match_games mg ON mg.id = mp.match_game_id
    WHERE m.status = 'COMPLETED';

    SELECT CASE WHEN SUM(head_hits + body_hits + leg_hits) > 0 THEN
        jsonb_build_object(
            'headPct', ROUND(100.0 * SUM(head_hits) / SUM(head_hits + body_hits + leg_hits), 1),
            'headHits', SUM(head_hits),
            'bodyPct', ROUND(100.0 * SUM(body_hits) / SUM(head_hits + body_hits + leg_hits), 1),
            'bodyHits', SUM(body_hits),
            'legPct', ROUND(100.0 * SUM(leg_hits) / SUM(head_hits + body_hits + leg_hits), 1),
            'legHits', SUM(leg_hits)
        )
    ELSE NULL END
    INTO v_accuracy_anatomy
    FROM public.match_participant_hit_stats hs
    JOIN public.match_participants mp ON mp.id = hs.match_participant_id
    WHERE mp.player_id = p_player_id;

    -- แก้บั๊ก Aggregate ตรงนี้เรียบร้อยแล้ว
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'roleName', INITCAP(r.role_played),
            'roleKey', UPPER(r.role_played),
            'wins', r.wins,
            'losses', r.losses,
            'winRatePct', ROUND(100.0 * r.wins / GREATEST(1, r.wins + r.losses), 1),
            'kdaRatio', ROUND((r.kills + r.assists)::numeric / GREATEST(1, r.deaths), 2),
            'kills', r.kills,
            'deaths', r.deaths,
            'assists', r.assists
        )
    ), '[]'::jsonb)
    INTO v_roles_breakdown
    FROM (
        SELECT mp.role_played,
               COUNT(*) FILTER (WHERE m.winner_team_id = mp.team_id) AS wins,
               COUNT(*) FILTER (WHERE m.winner_team_id IS DISTINCT FROM mp.team_id) AS losses,
               SUM(mp.kills) AS kills,
               SUM(mp.deaths) AS deaths,
               SUM(mp.assists) AS assists
        FROM public.match_participants mp
        JOIN public.matches m ON m.id = mp.match_id
        WHERE mp.player_id = p_player_id AND mp.role_played IS NOT NULL AND m.status = 'COMPLETED'
        GROUP BY mp.role_played
    ) r;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'weaponName', w.weapon_name,
            'category', w.weapon_category,
            'kills', w.total_kills,
            'headPct', ROUND(100.0 * w.head_hits / GREATEST(1, w.head_hits + w.body_hits + w.leg_hits), 0),
            'bodyPct', ROUND(100.0 * w.body_hits / GREATEST(1, w.head_hits + w.body_hits + w.leg_hits), 0),
            'legPct', ROUND(100.0 * w.leg_hits / GREATEST(1, w.head_hits + w.body_hits + w.leg_hits), 0)
        ) ORDER BY w.total_kills DESC
    ), '[]'::jsonb)
    INTO v_top_weapons
    FROM (
        SELECT mw.weapon_name, mw.weapon_category,
               SUM(mw.kills) AS total_kills, SUM(mw.head_hits) AS head_hits,
               SUM(mw.body_hits) AS body_hits, SUM(mw.leg_hits) AS leg_hits
        FROM public.match_participant_weapons mw
        JOIN public.match_participants mp ON mp.id = mw.match_participant_id
        WHERE mp.player_id = p_player_id
        GROUP BY mw.weapon_name, mw.weapon_category
        ORDER BY SUM(mw.kills) DESC
        LIMIT 5
    ) w;

    SELECT COUNT(*) FILTER (WHERE (v->>'isWin')::boolean), COUNT(*)
    INTO v_rolling20_wins, v_rolling20_count
    FROM jsonb_array_elements(v_recent_20_tiles) v;

    RETURN jsonb_build_object(
        'overview', jsonb_build_object(
            'playerId', v_player.id,
            'athleteId', v_player.athlete_id,
            'displayName', v_player.display_name,
            'avatarUrl', v_player.avatar_url,
            'gameName', v_verification.game_name,
            'tagLine', v_verification.tag_line,
            'isVerified', (v_verification.verification_status = 'VERIFIED'),
            'zodiacSign', v_zodiac_sign,
            'isSelf', v_is_self,
            'apBalance', CASE WHEN v_is_self THEN v_player.ap_balance ELSE NULL END,
            'zpBalance', NULL,
            'zpBalanceAvailable', false,
            'currentRankTier', v_verification.rank_snapshot->>'tier',
            'currentRankRr', (v_verification.rank_snapshot->>'rr')::numeric,
            'peakRr', (v_verification.rank_snapshot->>'peakRr')::numeric,
            'peakSeason', v_verification.rank_snapshot->>'peakSeason',
            'metrics', jsonb_build_object(
                'acs', v_stats.avg_acs,
                'kdRatio', v_stats.avg_kd,
                'kdaRatio', v_stats.avg_kda,
                'adr', v_stats.avg_adr,
                'headshotPct', v_stats.headshot_pct,
                'winRatePct', v_stats.win_rate,
                'wins', v_stats.matches_won,
                'losses', v_stats.matches_lost
            ),
            'rolling20Record', COALESCE(v_rolling20_wins, 0)::text || 'W - ' || COALESCE(v_rolling20_count - v_rolling20_wins, 0)::text || 'L',
            'rolling20WinRatePct', CASE WHEN COALESCE(v_rolling20_count, 0) > 0 THEN ROUND(100.0 * v_rolling20_wins / v_rolling20_count, 1) ELSE NULL END
        ),
        'accuracyAnatomy', v_accuracy_anatomy,
        'rolesBreakdown', v_roles_breakdown,
        'topWeapons', v_top_weapons,
        'rolling20Tiles', v_recent_20_tiles,
        'recent20Matches', v_recent_20_matches,
        'lastUpdatedIso', NOW()
    );
END;
$$;


--
-- Name: get_daily_unverified_bid_total(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_daily_unverified_bid_total(p_player_id uuid) RETURNS integer
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_total INT;
BEGIN
    SELECT COALESCE(SUM(bid_amount_ap), 0) INTO v_total
    FROM public.athlete_market_bids
    WHERE bidder_player_id = p_player_id
      AND created_at >= NOW() - INTERVAL '24 hours'
      AND status IN ('PENDING', 'ACCEPTED');

    RETURN v_total;
END;
$$;


--
-- Name: get_plan_ap_cost(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_plan_ap_cost(p_plan_code text) RETURNS bigint
    LANGUAGE sql IMMUTABLE
    AS $$
    SELECT CASE p_plan_code
        WHEN 'PRO_CLUB'     THEN 200
        WHEN 'VIP_CLUB'     THEN 600
        WHEN 'ATHLETE_PASS' THEN 50
        ELSE NULL
    END;
$$;


--
-- Name: handle_affiliate_on_signup(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_affiliate_on_signup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_ref_code TEXT;
    v_referrer_id UUID;
    v_referee_player_id UUID;
BEGIN
    v_ref_code := NEW.raw_user_meta_data->>'referral_code';
    
    IF v_ref_code IS NOT NULL AND v_ref_code <> '' THEN
        SELECT player_id INTO v_referrer_id 
        FROM public.affiliate_codes 
        WHERE code = v_ref_code;

        SELECT id INTO v_referee_player_id
        FROM public.players
        WHERE user_id = NEW.id;

        IF v_referrer_id IS NOT NULL 
           AND v_referee_player_id IS NOT NULL 
           AND v_referrer_id <> v_referee_player_id THEN
           
            INSERT INTO public.affiliate_referrals (
                referrer_id, referee_id, affiliate_code, status
            ) VALUES (
                v_referrer_id, v_referee_player_id, v_ref_code, 'PENDING_KYC'
            ) ON CONFLICT (referee_id) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: handle_crypto_revert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_crypto_revert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_intent      RECORD;
    v_move_result JSONB;
BEGIN
    IF NEW.is_reverted = TRUE AND (OLD.is_reverted IS DISTINCT FROM TRUE) THEN
        SELECT * INTO v_intent FROM public.payment_intents WHERE id = NEW.payment_intent_id FOR UPDATE;

        IF FOUND AND v_intent.status = 'SUCCEEDED' AND v_intent.purpose = 'TOP_UP'
           AND v_intent.ap_amount IS NOT NULL AND v_intent.ap_amount > 0 THEN
            v_move_result := public.move_ap(
                v_intent.player_id, -v_intent.ap_amount, 'CLAWBACK',
                'crypto-revert-' || NEW.id::text, 'crypto_payment', NEW.id
            );

            UPDATE public.payment_intents
            SET status = 'FAILED', updated_at = NOW()
            WHERE id = v_intent.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: handle_new_user_signup(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_signup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_athlete_id TEXT;
    v_name       TEXT;
    v_slug       TEXT;
BEGIN
    v_athlete_id := public.generate_athlete_id();

    -- ยึด full_name/name จาก provider ก่อน, รองลงมาใช้ email local-part
    -- (พฤติกรรมเดิมของฟังก์ชันที่ deploy อยู่), สุดท้ายค่อย fallback เป็น PLAYER_xxxxxx
    v_name := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        NULLIF(split_part(NEW.email, '@', 1), ''),
        'PLAYER_' || SUBSTRING(NEW.id::TEXT, 1, 6)
    );

    v_slug := LOWER(v_athlete_id);

    INSERT INTO public.players (
        user_id, athlete_id, display_name, slug, email, avatar_url, status
    )
    VALUES (
        NEW.id,                -- <-- นี่คือค่าที่หายไปในเวอร์ชันที่พังอยู่ตอนนี้
        v_athlete_id,
        v_name,
        v_slug,
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url',
        CASE WHEN NEW.email_confirmed_at IS NOT NULL
             THEN 'ACTIVE'::account_status_type
             ELSE 'PENDING'::account_status_type
        END
    );

    INSERT INTO public.user_roles (player_id, role)
    SELECT id, 'ATHLETE' FROM public.players WHERE user_id = NEW.id;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- กันไว้อีกชั้น: ถ้ามีปัญหาอื่นที่คาดไม่ถึงใน insert profile ในอนาคต
    -- อย่าให้ signup ทั้งกระบวนการพังไปด้วย — log ไว้เป็น WARNING แทนที่จะ RAISE EXCEPTION
    -- (ดูได้ใน Supabase Dashboard > Logs > Postgres Logs)
    RAISE WARNING 'handle_new_user_signup failed for user %: % (SQLSTATE %)', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;


--
-- Name: increment_banner_click(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_banner_click(p_banner_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.sponsor_banners
  SET click_count = click_count + 1
  WHERE id = p_banner_id;
END;
$$;


--
-- Name: increment_banner_impression(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_banner_impression(p_banner_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.sponsor_banners
  SET impression_count = impression_count + 1
  WHERE id = p_banner_id;
END;
$$;


--
-- Name: increment_banner_metric(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_banner_metric(p_banner_id uuid, p_metric_type text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF p_metric_type = 'IMPRESSION' THEN
        UPDATE public.sponsor_banners
        SET impression_count = impression_count + 1, updated_at = NOW()
        WHERE id = p_banner_id;
    ELSIF p_metric_type = 'CLICK' THEN
        UPDATE public.sponsor_banners
        SET click_count = click_count + 1, updated_at = NOW()
        WHERE id = p_banner_id;
    END IF;
END;
$$;


--
-- Name: inject_jackpot_bonus(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inject_jackpot_bonus(p_pool_id uuid, p_season_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.players p ON p.id = ur.player_id
    WHERE p.user_id = auth.uid()
      AND ur.role IN ('ADMIN', 'SUPER_ADMIN', 'REFEREE')
      AND ur.revoked_at IS NULL
  );
$$;


--
-- Name: is_referee_of(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_referee_of(p_match_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.matches
        WHERE id = p_match_id
          AND referee_id = public.current_player_id()
    );
$$;


--
-- Name: is_team_leader(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_team_leader(p_team_id uuid) RETURNS boolean
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


--
-- Name: issue_p2p_otp_challenge(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.issue_p2p_otp_challenge(p_sender_id uuid, p_otp_code_hash text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_existing RECORD;
BEGIN
    SELECT * INTO v_existing FROM public.p2p_transfer_otp_challenges WHERE sender_id = p_sender_id FOR UPDATE;

    IF FOUND AND v_existing.locked_until IS NOT NULL AND v_existing.locked_until > NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'ACCOUNT_LOCKED', 'locked_until', v_existing.locked_until);
    END IF;

    INSERT INTO public.p2p_transfer_otp_challenges (sender_id, otp_code_hash, attempts, locked_until, expires_at)
    VALUES (p_sender_id, p_otp_code_hash, 0, NULL, NOW() + INTERVAL '5 minutes')
    ON CONFLICT (sender_id) DO UPDATE
        SET otp_code_hash = EXCLUDED.otp_code_hash, attempts = 0, locked_until = NULL, expires_at = EXCLUDED.expires_at, created_at = NOW();

    RETURN jsonb_build_object('success', true, 'expires_at', NOW() + INTERVAL '5 minutes');
END;
$$;


--
-- Name: lock_prediction_pool_on_match_live(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lock_prediction_pool_on_match_live() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: log_lobby_system_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_lobby_system_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_msg           TEXT;
    v_team_name     TEXT;
BEGIN
    IF TG_TABLE_NAME = 'matches' AND TG_OP = 'UPDATE' THEN

        IF OLD.team_a_ready_at IS NULL AND NEW.team_a_ready_at IS NOT NULL THEN
            SELECT name INTO v_team_name FROM public.teams WHERE id = NEW.team_a_id;
            INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
            VALUES (NEW.id, NULL, 'SYSTEM', '[SYSTEM] สโมสร ' || COALESCE(v_team_name, 'TEAM_A') || ' กดยืนยันความพร้อมแข่งขันแล้ว ✅', TRUE);
        END IF;

        IF OLD.team_b_ready_at IS NULL AND NEW.team_b_ready_at IS NOT NULL THEN
            SELECT name INTO v_team_name FROM public.teams WHERE id = NEW.team_b_id;
            INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
            VALUES (NEW.id, NULL, 'SYSTEM', '[SYSTEM] สโมสร ' || COALESCE(v_team_name, 'TEAM_B') || ' กดยืนยันความพร้อมแข่งขันแล้ว ✅', TRUE);
        END IF;

        IF OLD.status != 'VETO' AND NEW.status = 'VETO' THEN
            INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
            VALUES (NEW.id, NULL, 'SYSTEM', '[SYSTEM] เริ่มต้นขั้นตอนดราฟต์เลือกแผนที่แข่ง (Map Veto Phase Active)', TRUE);
        END IF;

        IF OLD.status != 'LIVE' AND NEW.status = 'LIVE' THEN
            INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
            VALUES (NEW.id, NULL, 'SYSTEM', '[SYSTEM] สัญญาณภาพพร้อมรบแล้ว! การแข่งขันนัดประวัติศาสตร์เริ่มต้นอย่างเป็นทางการ ⚔️', TRUE);
        END IF;

        -- Fix 4: lobby_code lives in format_config JSONB, not a flat column.
        IF (OLD.format_config->>'lobby_code' IS NULL AND NEW.format_config->>'lobby_code' IS NOT NULL)
           OR (OLD.format_config->>'lobby_code' IS DISTINCT FROM NEW.format_config->>'lobby_code') THEN
            INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
            VALUES (
                NEW.id,
                NULL,
                'SYSTEM',
                '[SYSTEM] ผู้ตัดสินได้กรอกรหัสพาสเวิร์ดล็อบบี้: ' || NEW.format_config->>'lobby_code',
                TRUE
            );
        END IF;

        IF OLD.status != 'WALKOVER' AND NEW.status = 'WALKOVER' THEN
            IF NEW.winner_team_id IS NOT NULL THEN
                SELECT name INTO v_team_name FROM public.teams WHERE id = NEW.winner_team_id;
                v_msg := '[SYSTEM] ขีดจำกัดเช็คอินหมดลง ยื่นโทษปรับแพ้บายให้แก่คู่แข่ง ปรับทีม ' || COALESCE(v_team_name, 'WINNER_TEAM') || ' ชนะบายสำเร็จ 🏆';
            ELSE
                v_msg := '[SYSTEM] ทั้งสองทีมไม่กดยืนยันความพร้อมแข่งขันตามเกณฑ์ 15 นาที ปรับแพ้บายทั้งคู่ (Dual Walkover) รอผู้ตัดสินตรวจสอบ';
            END IF;

            INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
            VALUES (NEW.id, NULL, 'SYSTEM', v_msg, TRUE);
        END IF;

    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: mark_subscription_invoice_paid(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_subscription_invoice_paid(p_invoice_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_invoice RECORD;
BEGIN
    SELECT * INTO v_invoice FROM public.subscription_invoices WHERE id = p_invoice_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVOICE_NOT_FOUND');
    END IF;

    IF v_invoice.status <> 'PENDING' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVOICE_NOT_PENDING', 'status', v_invoice.status);
    END IF;

    UPDATE public.subscription_invoices
    SET status = 'PAID', paid_at = NOW()
    WHERE id = p_invoice_id;

    UPDATE public.subscriptions
    SET current_status = 'ACTIVE',
        valid_until = NOW() + INTERVAL '30 days',
        grace_until = NULL
    WHERE id = v_invoice.subscription_id;

    RETURN jsonb_build_object('success', true, 'subscription_id', v_invoice.subscription_id);
END;
$$;


--
-- Name: match_ffxi_athlete_bid(uuid, uuid, uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_ffxi_athlete_bid(p_listing_id uuid, p_bidder_player_id uuid, p_destination_team_id uuid, p_bid_amount_ap integer, p_idempotency_key text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_listing RECORD;
    v_bidder_ap INT;
    v_fee INT;
    v_payout INT;
BEGIN
    SET LOCAL lock_timeout = '3s';

    SELECT * INTO v_listing
    FROM public.athlete_market_listings
    WHERE id = p_listing_id AND status = 'ACTIVE'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'LISTING_NOT_ACTIVE', 'message', 'รายการสัญญานี้ปิดไปแล้วหรือไม่มีอยู่จริง');
    END IF;

    IF p_bidder_player_id = v_listing.seller_player_id THEN
        RETURN jsonb_build_object('success', false, 'code', 'SELF_BID_FORBIDDEN', 'message', 'ไม่สามารถยื่นประมูลสัญญาของตนเองได้');
    END IF;

    SELECT ap_balance INTO v_bidder_ap
    FROM public.players
    WHERE id = p_bidder_player_id
    FOR UPDATE;

    IF v_bidder_ap < p_bid_amount_ap THEN
        RETURN jsonb_build_object('success', false, 'code', 'INSUFFICIENT_AP_BALANCE', 'message', 'แต้ม AP ของท่านไม่พอสำหรับยื่น Bid นี้');
    END IF;

    -- กรณี Bid >= floor_price_ap ปิดดีลทันที
    IF p_bid_amount_ap >= v_listing.floor_price_ap THEN
        v_fee := FLOOR(p_bid_amount_ap * 0.05);
        v_payout := p_bid_amount_ap - v_fee;

        IF v_listing.highest_bidder_id IS NOT NULL AND v_listing.current_highest_bid_ap > 0 THEN
            UPDATE public.players 
            SET ap_balance = ap_balance + v_listing.current_highest_bid_ap 
            WHERE id = v_listing.highest_bidder_id;

            UPDATE public.athlete_market_bids
            SET status = 'OUTBID'
            WHERE listing_id = p_listing_id AND status = 'ACCEPTED';
        END IF;

        UPDATE public.players SET ap_balance = ap_balance - p_bid_amount_ap WHERE id = p_bidder_player_id;
        UPDATE public.players SET ap_balance = ap_balance + v_payout WHERE id = v_listing.seller_player_id;

        IF v_fee > 0 THEN
            INSERT INTO public.system_burn_ledger (source_module, burned_ap_amount, reference_id)
            VALUES ('TRANSFER_MARKET_FEE', v_fee, p_listing_id);
        END IF;

        UPDATE public.team_members
        SET team_id = p_destination_team_id, role = 'PLAYER', updated_at = NOW()
        WHERE player_id = v_listing.target_player_id AND status = 'ACTIVE';

        IF NOT FOUND THEN
            INSERT INTO public.team_members (team_id, player_id, role, status)
            VALUES (p_destination_team_id, v_listing.target_player_id, 'PLAYER', 'ACTIVE');
        END IF;

        UPDATE public.athlete_market_listings
        SET status = 'SOLD', current_highest_bid_ap = p_bid_amount_ap, highest_bidder_id = p_bidder_player_id, updated_at = NOW()
        WHERE id = p_listing_id;

        INSERT INTO public.athlete_transfer_history (
            listing_id, player_id, from_team_id, to_team_id, deal_type, final_price_ap, platform_fee_ap, seller_payout_ap
        ) VALUES (
            p_listing_id, v_listing.target_player_id, v_listing.seller_team_id, p_destination_team_id, 'AUCTION_WIN', p_bid_amount_ap, v_fee, v_payout
        );

        INSERT INTO public.athlete_market_bids (listing_id, bidder_player_id, destination_team_id, bid_amount_ap, status)
        VALUES (p_listing_id, p_bidder_player_id, p_destination_team_id, p_bid_amount_ap, 'ACCEPTED');

        RETURN jsonb_build_object('success', true, 'matched', true, 'message', 'ราคาประมูลทะลุ Floor Price! สัญญาถูกจับคู่และโอนย้ายสำเร็จทันที');

    -- กรณี Bid < floor_price_ap บันทึกราคาและ Escrow แต้ม AP
    ELSIF p_bid_amount_ap > v_listing.current_highest_bid_ap THEN
        IF v_listing.highest_bidder_id IS NOT NULL AND v_listing.current_highest_bid_ap > 0 THEN
            UPDATE public.players 
            SET ap_balance = ap_balance + v_listing.current_highest_bid_ap 
            WHERE id = v_listing.highest_bidder_id;

            UPDATE public.athlete_market_bids
            SET status = 'OUTBID'
            WHERE listing_id = p_listing_id AND status = 'ACCEPTED';
        END IF;

        UPDATE public.players SET ap_balance = ap_balance - p_bid_amount_ap WHERE id = p_bidder_player_id;

        UPDATE public.athlete_market_listings
        SET current_highest_bid_ap = p_bid_amount_ap, highest_bidder_id = p_bidder_player_id, updated_at = NOW()
        WHERE id = p_listing_id;

        INSERT INTO public.athlete_market_bids (listing_id, bidder_player_id, destination_team_id, bid_amount_ap, status)
        VALUES (p_listing_id, p_bidder_player_id, p_destination_team_id, p_bid_amount_ap, 'ACCEPTED');

        RETURN jsonb_build_object('success', true, 'matched', false, 'message', 'บันทึกราคาเสนอประมูลเรียบร้อยแล้ว');
    ELSE
        RETURN jsonb_build_object('success', false, 'code', 'BID_TOO_LOW', 'message', 'ราคาเสนอประมูลต้องสูงกว่าราคาเสนอสูงสุดปัจจุบัน');
    END IF;
END;
$$;


--
-- Name: match_ffxi_blind_bid(uuid, uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_ffxi_blind_bid(p_listing_id uuid, p_bidder_id uuid, p_bid_amount numeric, p_idempotency_key text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_listing       RECORD;
    v_vendor        RECORD;
    v_prev_bidder   UUID;
    v_prev_amount   NUMERIC;
    v_first_id      UUID;
    v_second_id     UUID;
    v_debit         JSONB;
    v_refund        JSONB;
    v_matched       BOOLEAN := FALSE;
BEGIN
    SET LOCAL lock_timeout = '3s';

    SELECT * INTO v_listing FROM public.marketplace_listings WHERE id = p_listing_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'LISTING_NOT_FOUND');
    END IF;

    IF v_listing.status <> 'ACTIVE' THEN
        RETURN jsonb_build_object('success', false, 'error', 'ITEM_ALREADY_SOLD');
    END IF;

    IF v_listing.auction_ends_at IS NOT NULL AND v_listing.auction_ends_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'AUCTION_ENDED');
    END IF;

    SELECT * INTO v_vendor FROM public.vendors WHERE id = v_listing.vendor_id;
    IF v_vendor.player_id = p_bidder_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'SELF_BID_FORBIDDEN');
    END IF;

    IF v_listing.current_highest_bid IS NOT NULL AND p_bid_amount <= v_listing.current_highest_bid THEN
        RETURN jsonb_build_object('success', false, 'error', 'BID_TOO_LOW');
    END IF;

    v_prev_bidder := v_listing.highest_bidder_id;
    v_prev_amount := v_listing.current_highest_bid;

    -- Lock both players rows in ascending id order (deadlock-safe across concurrent bids).
    IF v_prev_bidder IS NOT NULL THEN
        v_first_id := LEAST(p_bidder_id, v_prev_bidder);
        v_second_id := GREATEST(p_bidder_id, v_prev_bidder);
        PERFORM 1 FROM public.players WHERE id = v_first_id FOR UPDATE;
        PERFORM 1 FROM public.players WHERE id = v_second_id FOR UPDATE;
    ELSE
        PERFORM 1 FROM public.players WHERE id = p_bidder_id FOR UPDATE;
    END IF;

    -- Debit the new bidder's full bid amount (held) — move_ap itself re-locks
    -- the players row internally, which is safe/idempotent given it's already
    -- locked by this same transaction above.
    v_debit := public.move_ap(p_bidder_id, -p_bid_amount, 'MARKETPLACE_BID', p_idempotency_key, 'marketplace_listing', p_listing_id);
    IF (v_debit->>'success')::boolean IS NOT TRUE THEN
        IF v_debit->>'error' = 'DUPLICATE_KEY' THEN
            RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_KEY');
        END IF;
        RETURN jsonb_build_object('success', false, 'error', COALESCE(v_debit->>'error', 'INSUFFICIENT_AP_BALANCE'));
    END IF;

    -- Refund the previous highest bidder's held amount immediately (atomic,
    -- same transaction — QA Case 8).
    IF v_prev_bidder IS NOT NULL AND v_prev_amount IS NOT NULL THEN
        v_refund := public.move_ap(v_prev_bidder, v_prev_amount, 'MARKETPLACE_REFUND', p_idempotency_key || '-refund', 'marketplace_listing', p_listing_id);
        IF (v_refund->>'success')::boolean IS NOT TRUE AND v_refund->>'error' <> 'DUPLICATE_KEY' THEN
            RAISE EXCEPTION 'OUTBID_REFUND_FAILED: %', v_refund->>'error';
        END IF;
    END IF;

    v_matched := p_bid_amount >= v_listing.floor_price;

    IF v_matched THEN
        UPDATE public.marketplace_listings
        SET status = 'SOLD', current_highest_bid = p_bid_amount, highest_bidder_id = p_bidder_id
        WHERE id = p_listing_id;

        -- Credit the seller — the buyer's AP is already held from the debit above.
        PERFORM public.move_ap(v_vendor.player_id, p_bid_amount, 'MARKETPLACE_SOLD', p_idempotency_key || '-sold', 'marketplace_listing', p_listing_id);

        INSERT INTO public.marketplace_trade_history (listing_id, item_title, seller_id, buyer_id, sold_price, currency_type)
        VALUES (p_listing_id, v_listing.item_title, v_vendor.player_id, p_bidder_id, p_bid_amount, v_listing.currency_type);

        RETURN jsonb_build_object('success', true, 'matched', true, 'listing_id', p_listing_id);
    ELSE
        UPDATE public.marketplace_listings
        SET current_highest_bid = p_bid_amount, highest_bidder_id = p_bidder_id
        WHERE id = p_listing_id;

        RETURN jsonb_build_object('success', true, 'matched', false);
    END IF;
END;
$$;


--
-- Name: move_ap(uuid, numeric, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.move_ap(p_player_id uuid, p_amount numeric, p_reason text, p_idempotency_key text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
    v_existing_ledger_id UUID;
BEGIN
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_ledger_id 
        FROM public.ap_ledger 
        WHERE idempotency_key = p_idempotency_key;

        IF v_existing_ledger_id IS NOT NULL THEN
            SELECT ap_balance INTO v_current_balance FROM public.players WHERE id = p_player_id;
            RETURN v_current_balance;
        END IF;
    END IF;

    SELECT ap_balance INTO v_current_balance
    FROM public.players
    WHERE id = p_player_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'PLAYER_NOT_FOUND' USING HINT = 'Player ID does not exist in database.';
    END IF;

    IF p_amount > 0 AND v_current_balance < p_amount THEN
        RAISE EXCEPTION 'INSUFFICIENT_AP_BALANCE' USING HINT = 'Player does not have enough AP for this transaction.';
    END IF;

    v_new_balance := GREATEST(0, v_current_balance - p_amount);

    UPDATE public.players
    SET ap_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_player_id;

    INSERT INTO public.ap_ledger (
        player_id, delta, reason, idempotency_key, metadata, created_at
    ) VALUES (
        p_player_id, -p_amount, p_reason, p_idempotency_key, p_metadata, NOW()
    );

    RETURN v_new_balance;
END;
$$;


--
-- Name: move_ap(uuid, numeric, text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.move_ap(p_player_id uuid, p_amount numeric, p_reason text, p_idempotency_key text DEFAULT NULL::text, p_reference_type text DEFAULT NULL::text, p_reference_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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

    -- players.ap_balance คือ source of truth ตัวจริง — ล็อกแถวนี้แทน advisory lock
    SELECT ap_balance INTO v_current_balance
    FROM public.players
    WHERE id = p_player_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PLAYER_NOT_FOUND');
    END IF;

    v_new_balance := v_current_balance + p_amount;

    IF v_new_balance < 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_AP_BALANCE',
            'current_balance', v_current_balance,
            'requested', p_amount
        );
    END IF;

    UPDATE public.players
    SET ap_balance = v_new_balance, updated_at = NOW()
    WHERE id = p_player_id;

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


--
-- Name: notify_match_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_match_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_member RECORD;
    v_title VARCHAR;
    v_body TEXT;
    v_type VARCHAR;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    IF NEW.status = 'READY_CHECK' THEN
        v_type := 'MATCH_READY_CHECK';
        v_title := 'ถึงเวลา Check-in!';
        v_body := 'แมตช์ของคุณพร้อมให้กด Ready แล้ว กรุณากดพร้อมภายในเวลาที่กำหนด';
    ELSIF NEW.status = 'VETO' THEN
        v_type := 'MATCH_VETO';
        v_title := 'เริ่มช่วง Veto แล้ว';
        v_body := 'กรุณาทำการแบน/เลือกแมปสำหรับแมตช์ของคุณ';
    ELSIF NEW.status = 'COMPLETED' THEN
        v_type := 'MATCH_RESULT';
        v_title := 'ผลการแข่งขันได้รับการยืนยัน';
        v_body := 'ผลการแข่งขันแมตช์ของคุณถูกบันทึกเข้าระบบเรียบร้อยแล้ว';
    ELSE
        RETURN NEW;
    END IF;

    FOR v_member IN
        SELECT player_id FROM public.team_members
        WHERE team_id IN (NEW.team_a_id, NEW.team_b_id) AND status = 'ACTIVE'
    LOOP
        INSERT INTO public.notifications (
            player_id, type, title, body, action_url
        ) VALUES (
            v_member.player_id, v_type, v_title, v_body, '/match-result/' || NEW.id
        );
    END LOOP;

    RETURN NEW;
END;
$$;


--
-- Name: open_prediction_pool(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.open_prediction_pool(p_match_id uuid, p_house_fee_percent numeric DEFAULT 5.00) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: prevent_audit_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_audit_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only — ห้ามแก้ไขหรือลบ'
        USING ERRCODE = 'restrict_violation';
END;
$$;


--
-- Name: process_affiliate_kyc_bonus(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_affiliate_kyc_bonus(p_referee_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: process_affiliate_spend_cashback(uuid, numeric, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_affiliate_spend_cashback(p_buyer_id uuid, p_spend_amount_ap numeric, p_reference_tx_id character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: record_match_round_event(uuid, integer, integer, uuid, public.win_condition_enum, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_match_round_event(p_match_id uuid, p_game_number integer, p_round_number integer, p_winner_team_id uuid, p_win_condition public.win_condition_enum, p_idempotency_key text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_match RECORD;
    v_existing_round_id UUID;
    v_new_round_id UUID;
BEGIN
    SET LOCAL lock_timeout = '3s';

    SELECT * INTO v_match
    FROM public.matches
    WHERE id = p_match_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'MATCH_NOT_FOUND');
    END IF;

    SELECT id INTO v_existing_round_id
    FROM public.match_rounds
    WHERE match_id = p_match_id
      AND game_number = p_game_number
      AND round_number = p_round_number;

    IF v_existing_round_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'ROUND_ALREADY_RECORDED',
            'round_id', v_existing_round_id,
            'is_duplicate', true
        );
    END IF;

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


--
-- Name: redeem_sponsor_perk(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.redeem_sponsor_perk(p_redemption_id uuid, p_redeemed_amount numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_redemption RECORD;
    v_perk       RECORD;
BEGIN
    SELECT * INTO v_redemption FROM public.perk_redemptions WHERE id = p_redemption_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'REDEMPTION_NOT_FOUND');
    END IF;

    IF v_redemption.is_redeemed THEN
        RETURN jsonb_build_object('success', false, 'error', 'TOKEN_ALREADY_USED');
    END IF;

    IF p_redeemed_amount > v_redemption.redeemed_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'AMOUNT_EXCEEDS_RESERVED');
    END IF;

    SELECT * INTO v_perk FROM public.sponsor_perks WHERE id = v_redemption.perk_id FOR UPDATE;

    IF NOT FOUND OR NOT v_perk.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'PERK_INACTIVE');
    END IF;

    IF v_perk.amount_used + p_redeemed_amount > v_perk.max_quota_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'QUOTA_EXCEEDED', 'remaining_quota', v_perk.max_quota_amount - v_perk.amount_used);
    END IF;

    UPDATE public.perk_redemptions
    SET is_redeemed = TRUE, redeemed_at = NOW(), redeemed_amount = p_redeemed_amount
    WHERE id = p_redemption_id;

    UPDATE public.sponsor_perks
    SET amount_used = amount_used + p_redeemed_amount
    WHERE id = v_perk.id;

    RETURN jsonb_build_object(
        'success', true,
        'redemption_id', p_redemption_id,
        'redeemed_amount', p_redeemed_amount,
        'remaining_quota', v_perk.max_quota_amount - (v_perk.amount_used + p_redeemed_amount),
        'redeemed_at', NOW()
    );
END;
$$;


--
-- Name: refresh_team_analytics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_team_analytics() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_team_analytics;
END;
$$;


--
-- Name: release_escrow_to_receiver(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_escrow_to_receiver(p_escrow_id uuid, p_auto boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_escrow RECORD;
    v_credit JSONB;
BEGIN
    SELECT * INTO v_escrow FROM public.ap_escrow WHERE id = p_escrow_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ESCROW_NOT_FOUND');
    END IF;

    IF v_escrow.status <> 'PENDING' THEN
        RETURN jsonb_build_object('success', false, 'error', 'ESCROW_NOT_PENDING');
    END IF;

    v_credit := public.move_ap(v_escrow.receiver_id, v_escrow.amount_ap, CASE WHEN p_auto THEN 'ESCROW_AUTO_RELEASE' ELSE 'ESCROW_SETTLED' END, p_escrow_id::text || '-release', 'ap_escrow', p_escrow_id);
    IF (v_credit->>'success')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'ESCROW_RELEASE_FAILED: %', v_credit->>'error';
    END IF;

    UPDATE public.ap_escrow
    SET status = CASE WHEN p_auto THEN 'AUTO_RELEASED' ELSE 'COMPLETED' END,
        completed_at = CASE WHEN NOT p_auto THEN NOW() END,
        auto_released_at = CASE WHEN p_auto THEN NOW() END
    WHERE id = p_escrow_id;

    RETURN jsonb_build_object('success', true, 'escrow_id', p_escrow_id, 'status', CASE WHEN p_auto THEN 'AUTO_RELEASED' ELSE 'COMPLETED' END, 'ap_received', v_escrow.amount_ap);
END;
$$;


--
-- Name: renew_subscription_with_ap(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.renew_subscription_with_ap(p_subscription_id uuid, p_player_id uuid, p_idempotency_key text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_sub        RECORD;
    v_ap_cost    BIGINT;
    v_move       JSONB;
    v_new_valid  TIMESTAMPTZ;
BEGIN
    SET LOCAL lock_timeout = '3s';

    -- 1. Lock subscriptions row FIRST (FIFO order — never lock players before this)
    SELECT * INTO v_sub
    FROM public.subscriptions
    WHERE id = p_subscription_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SUBSCRIPTION_NOT_FOUND');
    END IF;

    IF v_sub.current_status = 'CANCELLED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'SUBSCRIPTION_CANCELLED');
    END IF;

    v_ap_cost := public.get_plan_ap_cost(v_sub.plan_code);
    IF v_ap_cost IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_PLAN');
    END IF;

    -- 2. move_ap() locks the players row internally (SELECT ... FOR UPDATE) —
    --    this is the "players lock second" half of the required FIFO order.
    --    Idempotency-Key is forwarded as-is so a retried request never double-charges.
    v_move := public.move_ap(
        p_player_id,
        -v_ap_cost,
        'SUBSCRIPTION_RENEWAL',
        p_idempotency_key,
        'subscription',
        p_subscription_id
    );

    IF (v_move->>'success')::boolean IS NOT TRUE THEN
        IF v_move->>'error' = 'DUPLICATE_KEY' THEN
            RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_KEY');
        END IF;
        -- INSUFFICIENT_AP_BALANCE or any other move_ap failure → zero partial
        -- deduction, subscription row lock is released on rollback, nothing changes.
        RETURN jsonb_build_object(
            'success', false,
            'error', COALESCE(v_move->>'error', 'AP_DEDUCTION_FAILED'),
            'current_balance', v_move->'current_balance',
            'requested', v_ap_cost
        );
    END IF;

    v_new_valid := GREATEST(v_sub.valid_until, NOW()) + INTERVAL '30 days';

    UPDATE public.subscriptions
    SET current_status = 'ACTIVE',
        valid_until = v_new_valid,
        grace_until = NULL
    WHERE id = p_subscription_id;

    -- Quota reset per spec (Sprint 5.3 rule): renew สำเร็จ → amount_used = 0
    IF v_sub.subscriber_type = 'TEAM' THEN
        UPDATE public.sponsor_perks
        SET amount_used = 0.00
        WHERE subscription_id = p_subscription_id AND is_active = TRUE;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'subscription_id', p_subscription_id,
        'new_valid_until', v_new_valid,
        'ap_deducted', v_ap_cost,
        'current_status', 'ACTIVE'
    );
END;
$$;


--
-- Name: request_perk_redemption(uuid, uuid, numeric, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_perk_redemption(p_perk_id uuid, p_redeemed_by_player_id uuid, p_amount numeric, p_perk_token text, p_redemption_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_perk         RECORD;
    v_redemption_id UUID;
BEGIN
    SELECT * INTO v_perk FROM public.sponsor_perks WHERE id = p_perk_id FOR UPDATE;

    IF NOT FOUND OR NOT v_perk.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'PERK_INACTIVE');
    END IF;

    IF v_perk.amount_used + p_amount > v_perk.max_quota_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'QUOTA_EXCEEDED', 'remaining_quota', v_perk.max_quota_amount - v_perk.amount_used);
    END IF;

    INSERT INTO public.perk_redemptions (id, perk_id, redeemed_by_player_id, redeemed_amount, perk_token, is_redeemed)
    VALUES (p_redemption_id, p_perk_id, p_redeemed_by_player_id, p_amount, p_perk_token, FALSE)
    RETURNING id INTO v_redemption_id;

    RETURN jsonb_build_object(
        'success', true,
        'redemption_id', v_redemption_id,
        'remaining_quota', v_perk.max_quota_amount - v_perk.amount_used
    );
END;
$$;


--
-- Name: resolve_expired_ready_checks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_expired_ready_checks() RETURNS TABLE(resolved_match_id uuid, winner_team_id uuid, final_status character varying)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    r_match RECORD;
    v_winner UUID;
BEGIN
    FOR r_match IN
        SELECT id, team_a_id, team_b_id, team_a_ready_at, team_b_ready_at, referee_id
        FROM public.matches
        WHERE status IN ('SCHEDULED', 'READY_CHECK')
          AND forfeit_deadline_at IS NOT NULL
          AND forfeit_deadline_at < NOW()
        FOR UPDATE
    LOOP
        resolved_match_id := r_match.id;

        IF r_match.team_a_ready_at IS NOT NULL AND r_match.team_b_ready_at IS NULL THEN
            v_winner := r_match.team_a_id;
        ELSIF r_match.team_b_ready_at IS NOT NULL AND r_match.team_a_ready_at IS NULL THEN
            v_winner := r_match.team_b_id;
        ELSE
            -- Fix 2: dual no-show (neither ready) is STILL a WALKOVER with a
            -- NULL winner, not a DISPUTED/ADMIN_REFERRAL branch — that path is
            -- deferred to Sprint 2.4 per the correction brief.
            v_winner := NULL;
        END IF;

        winner_team_id := v_winner;
        final_status := 'WALKOVER';

        UPDATE public.matches
        SET status = 'WALKOVER',
            winner_team_id = v_winner,
            outcome = 'WALKOVER',
            ended_at = NOW(),
            updated_at = NOW()
        WHERE id = r_match.id;

        -- Fix 1: audit_logs uses the REAL production schema.
        INSERT INTO public.audit_logs (action, entity_type, entity_id, before_data, after_data, reason)
        VALUES (
            'UPDATE',
            'matches',
            r_match.id,
            jsonb_build_object('team_a_ready_at', r_match.team_a_ready_at, 'team_b_ready_at', r_match.team_b_ready_at),
            jsonb_build_object('status', 'WALKOVER', 'winner_team_id', v_winner, 'outcome', 'WALKOVER'),
            'AUTO_WALKOVER_RESOLVE'
        );

        -- Fix 2: notify the referee, whichever branch fired (single no-show or
        -- dual no-show), so the assignment stays visible in-app on top of the
        -- realtime broadcast fired by the cron route.
        IF r_match.referee_id IS NOT NULL THEN
            INSERT INTO public.notifications (player_id, type, title, body, action_url)
            VALUES (
                r_match.referee_id,
                'MATCH_WALKOVER_REVIEW',
                'แมตช์ถูกปรับแพ้บายอัตโนมัติ',
                CASE
                    WHEN v_winner IS NOT NULL THEN 'ทีมคู่แข่งไม่เช็คอินภายในเวลา ระบบปรับแพ้บายให้อัตโนมัติแล้ว โปรดตรวจสอบ'
                    ELSE 'ทั้งสองทีมไม่เช็คอินภายในเวลา ระบบปรับแพ้บายทั้งคู่ (ไม่มีผู้ชนะ) โปรดตรวจสอบหน้างาน'
                END,
                '/matches/' || r_match.id::text || '/lobby'
            );
        END IF;

        RETURN NEXT;
    END LOOP;
END;
$$;


--
-- Name: resolve_match_season_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_match_season_id(p_match_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT t.season_id
    FROM public.matches m
    JOIN public.tournament_stages ts ON ts.id = m.stage_id
    JOIN public.tournaments t ON t.id = ts.tournament_id
    WHERE m.id = p_match_id;
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: settle_payment_intent(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.settle_payment_intent(p_payment_intent_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_intent          RECORD;
    v_move_result     JSONB;
    v_checkout_result JSONB;
BEGIN
    SELECT * INTO v_intent
    FROM public.payment_intents
    WHERE id = p_payment_intent_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'INTENT_NOT_FOUND');
    END IF;

    IF v_intent.status = 'SUCCEEDED' THEN
        RETURN jsonb_build_object('success', true, 'already_settled', true);
    END IF;

    IF v_intent.status <> 'PENDING' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INTENT_NOT_PENDING');
    END IF;

    UPDATE public.payment_intents SET status = 'SUCCEEDED', updated_at = NOW() WHERE id = p_payment_intent_id;

    IF v_intent.purpose = 'TOP_UP' THEN
        v_move_result := public.move_ap(
            v_intent.player_id, v_intent.ap_amount, 'TOP_UP',
            'topup-intent-' || p_payment_intent_id::text, 'payment_intent', p_payment_intent_id
        );

        IF NOT (v_move_result->>'success')::boolean AND v_move_result->>'error' <> 'DUPLICATE_KEY' THEN
            RETURN jsonb_build_object('success', false, 'error', COALESCE(v_move_result->>'error', 'TOP_UP_FAILED'));
        END IF;
    ELSIF v_intent.purpose = 'ORDER' THEN
        BEGIN
            v_checkout_result := public.checkout_order(v_intent.order_id);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('success', false, 'error', SQLERRM);
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'purpose', v_intent.purpose,
        'move_ap', v_move_result,
        'checkout', v_checkout_result
    );
END;
$$;


--
-- Name: settle_prediction_pool(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.settle_prediction_pool(p_pool_id uuid, p_winning_team_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: settle_scrim_escrow(uuid, character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.settle_scrim_escrow(p_room_id uuid, p_winner_team_side character varying DEFAULT NULL::character varying, p_idempotency_key character varying DEFAULT NULL::character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: sweep_subscription_lifecycle(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sweep_subscription_lifecycle() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    UPDATE public.subscriptions
    SET current_status = 'GRACE_PERIOD',
        grace_until = valid_until + INTERVAL '3 days'
    WHERE current_status = 'ACTIVE' AND valid_until < NOW();
    GET DIAGNOSTICS v_count = ROW_COUNT;

    UPDATE public.subscriptions
    SET current_status = 'PAST_DUE'
    WHERE current_status = 'GRACE_PERIOD' AND grace_until < NOW();

    RETURN v_count;
END;
$$;


--
-- Name: transfer_ap_to_escrow(uuid, uuid, bigint, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transfer_ap_to_escrow(p_sender_id uuid, p_receiver_id uuid, p_amount_ap bigint, p_idempotency_key text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_sender            RECORD;
    v_receiver          RECORD;
    v_daily_transferred BIGINT;
    v_debit             JSONB;
    v_escrow_id         UUID;
    v_deadline          TIMESTAMPTZ;
BEGIN
    IF p_sender_id = p_receiver_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'SELF_TRANSFER_FORBIDDEN');
    END IF;

    IF p_idempotency_key IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.ap_escrow WHERE idempotency_key = p_idempotency_key
    ) THEN
        SELECT id INTO v_escrow_id FROM public.ap_escrow WHERE idempotency_key = p_idempotency_key;
        RETURN jsonb_build_object('success', true, 'escrow_id', v_escrow_id, 'duplicate', true);
    END IF;

    -- Lock sender row (Anti-Sybil check + debit both happen under this lock).
    SELECT id, kyc_verified_at, status INTO v_sender FROM public.players WHERE id = p_sender_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SENDER_NOT_FOUND');
    END IF;

    SELECT id, status INTO v_receiver FROM public.players WHERE id = p_receiver_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'RECEIVER_NOT_FOUND');
    END IF;

    IF v_receiver.status IN ('BANNED', 'SUSPENDED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'RECEIVER_BANNED');
    END IF;

    IF v_sender.kyc_verified_at IS NULL THEN
        SELECT COALESCE(SUM(amount_ap), 0) INTO v_daily_transferred
        FROM public.ap_escrow
        WHERE sender_id = p_sender_id AND created_at >= NOW() - INTERVAL '24 hours';

        IF v_daily_transferred + p_amount_ap > 500 THEN
            RETURN jsonb_build_object('success', false, 'error', 'DAILY_UNVERIFIED_LIMIT_EXCEEDED');
        END IF;
    END IF;

    v_debit := public.move_ap(p_sender_id, -p_amount_ap, 'ESCROW_LOCK', p_idempotency_key, 'ap_escrow', NULL);
    IF (v_debit->>'success')::boolean IS NOT TRUE THEN
        IF v_debit->>'error' = 'DUPLICATE_KEY' THEN
            RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_KEY');
        END IF;
        RETURN jsonb_build_object('success', false, 'error', COALESCE(v_debit->>'error', 'INSUFFICIENT_AP_BALANCE'));
    END IF;

    v_deadline := NOW() + INTERVAL '24 hours';

    INSERT INTO public.ap_escrow (sender_id, receiver_id, amount_ap, status, sender_2fa_verified, approval_deadline, idempotency_key)
    VALUES (p_sender_id, p_receiver_id, p_amount_ap, 'PENDING', TRUE, v_deadline, p_idempotency_key)
    RETURNING id INTO v_escrow_id;

    RETURN jsonb_build_object('success', true, 'escrow_id', v_escrow_id, 'amount_ap', p_amount_ap, 'status', 'PENDING', 'approval_deadline', v_deadline);
END;
$$;


--
-- Name: trg_auto_create_match_from_bracket(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_auto_create_match_from_bracket() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_tournament_id UUID;
    v_start_at TIMESTAMPTZ;
    v_scheduled_at TIMESTAMPTZ;
    v_new_match_id UUID;
    v_new_status public.match_status_type;
BEGIN
    -- 1. ทำงานเฉพาะเมื่อ bracket node status เปลี่ยนเป็น READY
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status = NEW.status OR NEW.status <> 'READY' THEN
            RETURN NEW;
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        IF NEW.status <> 'READY' THEN
            RETURN NEW;
        END IF;
    END IF;

    -- 2. ป้องกันการสร้างซ้ำซ้อน
    IF EXISTS (SELECT 1 FROM public.matches WHERE bracket_node_id = NEW.id) THEN
        RETURN NEW;
    END IF;

    -- 3. ดึง config จาก tournament_stages (เอา start_at มาใช้)
    SELECT tournament_id, start_at
    INTO v_tournament_id, v_start_at
    FROM public.tournament_stages
    WHERE id = NEW.stage_id;

    -- 4. คำนวณเวลาเริ่มแข่ง (ตั้งต้นจาก start_at ของ stage + ชดเชยเวลาตาม round_number)
    IF v_start_at IS NOT NULL THEN
        -- ตัวอย่าง: ขยับรอบละ 1 ชั่วโมง (สามารถปรับจูนตาม format ทัวร์ได้)
        v_scheduled_at := v_start_at + ((NEW.round_number - 1) * interval '1 hour');
    ELSE
        v_scheduled_at := NOW() + interval '1 hour';
    END IF;

    -- 5. สร้าง Match
    INSERT INTO public.matches (
        tournament_id,
        stage_id,
        bracket_node_id,
        round_label,
        team_a_id,
        team_b_id,
        best_of,
        status,
        scheduled_at
    ) VALUES (
        v_tournament_id,
        NEW.stage_id,
        NEW.id,
        NEW.label,
        NEW.team_a_id,
        NEW.team_b_id,
        COALESCE(NEW.best_of, 1),
        'SCHEDULED',
        v_scheduled_at
    ) RETURNING id, status INTO v_new_match_id, v_new_status;

    -- 6. [Audit Log] บันทึก State Transition ทันทีที่ระบบสร้าง[cite: 8]
    INSERT INTO public.match_state_transitions (
        match_id, from_status, to_status, trigger_source, reason
    ) VALUES (
        v_new_match_id, NULL, v_new_status, 'SYSTEM', 'Auto-created from bracket node reaching READY status'
    );

    RETURN NEW;
END;
$$;


--
-- Name: trg_enforce_athlete_roster_lock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_enforce_athlete_roster_lock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF public.check_athlete_roster_lock(NEW.target_player_id) THEN
        RAISE EXCEPTION 'ROSTER_LOCKED: นักกีฬากำลังอยู่ในระหว่างแข่งขัน ไม่สามารถวางขายสัญญาได้'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: trigger_mercy_beacon(uuid, character varying, public.valorant_agent_role_enum); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_mercy_beacon(p_room_id uuid, p_missing_team_side character varying, p_required_role public.valorant_agent_role_enum DEFAULT 'FLEX'::public.valorant_agent_role_enum) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: unequip_inventory_item(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unequip_inventory_item(p_variant_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_player_id UUID := public.current_player_id();
    v_updated   INTEGER;
BEGIN
    IF v_player_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    UPDATE public.player_inventory
    SET is_equipped = FALSE
    WHERE player_id = v_player_id AND variant_id = p_variant_id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'ITEM_NOT_OWNED');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: validate_match_transition_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_match_transition_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_allowed       BOOLEAN := FALSE;
    v_has_veto      BOOLEAN := FALSE;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Terminal states are locked. (FORFEITED / DISPUTED are valid enum values
    -- but are out of scope for this sprint per the correction brief — Fix 2 —
    -- and are intentionally NOT treated as terminal here.)
    IF OLD.status IN ('COMPLETED', 'WALKOVER', 'BYE', 'CANCELLED') THEN
        RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Terminal status % cannot be updated to %', OLD.status, NEW.status;
    END IF;

    CASE OLD.status
        WHEN 'SCHEDULED' THEN
            IF NEW.status IN ('READY_CHECK', 'WALKOVER', 'BYE', 'CANCELLED') THEN
                v_allowed := TRUE;
            END IF;

        WHEN 'READY_CHECK' THEN
            IF NEW.status = 'WALKOVER' THEN
                v_allowed := TRUE;
            ELSIF NEW.status IN ('VETO', 'LIVE') THEN
                SELECT (veto_format IS NOT NULL AND veto_format != '{}'::jsonb) INTO v_has_veto
                FROM public.tournament_stages s
                WHERE s.id = OLD.stage_id;

                IF NEW.status = 'VETO' AND v_has_veto THEN
                    v_allowed := TRUE;
                ELSIF NEW.status = 'LIVE' AND NOT v_has_veto THEN
                    v_allowed := TRUE;
                END IF;
            END IF;

        WHEN 'VETO' THEN
            IF NEW.status IN ('LIVE', 'CANCELLED') THEN
                v_allowed := TRUE;
            END IF;

        WHEN 'LIVE' THEN
            IF NEW.status IN ('PAUSED', 'AWAITING_RESULT') THEN
                v_allowed := TRUE;
            END IF;

        WHEN 'PAUSED' THEN
            IF NEW.status = 'LIVE' THEN
                v_allowed := TRUE;
            END IF;

        WHEN 'AWAITING_RESULT' THEN
            IF NEW.status = 'COMPLETED' THEN
                v_allowed := TRUE;
            END IF;

        ELSE
            v_allowed := FALSE;
    END CASE;

    IF NOT v_allowed THEN
        RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Cannot transition match % from % to %', OLD.id, OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: verify_and_redeem_partner_coupon(uuid, character varying, integer, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_and_redeem_partner_coupon(p_player_id uuid, p_coupon_code character varying, p_purchase_amount_ap integer, p_idempotency_key character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_coupon              RECORD;
    v_sponsor             RECORD;
    v_player_uses         INT;
    v_discount_ap         INT;
    v_existing_redemption RECORD;
BEGIN
    SET LOCAL lock_timeout = '3s';

    -- Anti-BOLA Check: p_player_id ต้องเป็นของผู้ใช้ที่ล็อกอินอยู่จริง
    IF p_player_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.players WHERE id = p_player_id AND user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED_BOLA_VIOLATION');
    END IF;

    -- Idempotency Check
    SELECT * INTO v_existing_redemption
    FROM public.partner_coupon_redemptions
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'discount_applied_ap', v_existing_redemption.discount_applied_ap,
            'message', 'IDEMPOTENT_REPLAY_SUCCESS'
        );
    END IF;

    -- Fetch and Lock Coupon Row
    SELECT * INTO v_coupon
    FROM public.partner_coupons
    WHERE code = UPPER(p_coupon_code)
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'COUPON_NOT_FOUND');
    END IF;

    IF NOT v_coupon.is_active OR v_coupon.expires_at <= NOW() THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'COUPON_EXPIRED_OR_INACTIVE');
    END IF;

    IF v_coupon.current_uses >= v_coupon.max_total_uses THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'COUPON_MAX_USES_REACHED');
    END IF;

    IF p_purchase_amount_ap < v_coupon.min_purchase_ap THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'MINIMUM_AP_PURCHASE_NOT_MET');
    END IF;

    -- Fetch Sponsor Tier & Status
    SELECT * INTO v_sponsor
    FROM public.sponsors
    WHERE id = v_coupon.sponsor_id;

    IF NOT FOUND OR v_sponsor.status <> 'APPROVED' OR NOT v_sponsor.is_active THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'SPONSOR_SUSPENDED_OR_INACTIVE');
    END IF;

    IF v_sponsor.tier <> 'PARTNER_COOP' THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_SPONSOR_TIER_FOR_COUPON');
    END IF;

    -- Check Per-User Limit
    SELECT COUNT(*) INTO v_player_uses
    FROM public.partner_coupon_redemptions
    WHERE coupon_id = v_coupon.id AND player_id = p_player_id;

    IF v_player_uses >= v_coupon.per_user_limit THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'USER_REACHED_PER_USER_LIMIT');
    END IF;

    -- Calculate Discount, Floor at 0 AP
    v_discount_ap := LEAST(v_coupon.ap_discount_amount, p_purchase_amount_ap);
    IF v_discount_ap < 0 THEN
        v_discount_ap := 0;
    END IF;

    UPDATE public.partner_coupons
    SET current_uses = current_uses + 1,
        updated_at = NOW()
    WHERE id = v_coupon.id;

    INSERT INTO public.partner_coupon_redemptions (
        coupon_id, player_id, discount_applied_ap, idempotency_key
    ) VALUES (
        v_coupon.id, p_player_id, v_discount_ap, p_idempotency_key
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'coupon_id', v_coupon.id,
        'code', v_coupon.code,
        'discount_applied_ap', v_discount_ap,
        'final_price_ap', p_purchase_amount_ap - v_discount_ap
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;


--
-- Name: verify_p2p_otp_challenge(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_p2p_otp_challenge(p_sender_id uuid, p_otp_code_hash text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_challenge RECORD;
BEGIN
    SELECT * INTO v_challenge FROM public.p2p_transfer_otp_challenges WHERE sender_id = p_sender_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'OTP_INVALID');
    END IF;

    IF v_challenge.locked_until IS NOT NULL AND v_challenge.locked_until > NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'ACCOUNT_LOCKED', 'locked_until', v_challenge.locked_until);
    END IF;

    IF v_challenge.expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'OTP_EXPIRED');
    END IF;

    IF v_challenge.otp_code_hash <> p_otp_code_hash THEN
        UPDATE public.p2p_transfer_otp_challenges
        SET attempts = attempts + 1,
            locked_until = CASE WHEN attempts + 1 >= 5 THEN NOW() + INTERVAL '1 hour' ELSE NULL END
        WHERE sender_id = p_sender_id;

        IF v_challenge.attempts + 1 >= 5 THEN
            INSERT INTO public.notifications (player_id, type, title, body, action_url)
            VALUES (p_sender_id, 'P2P_TRANSFER_LOCKED', 'บัญชีถูกล็อกการโอน AP ชั่วคราว', 'ป้อนรหัส OTP ผิดครบ 5 ครั้ง ระบบล็อกฟังก์ชันโอน AP เป็นเวลา 1 ชั่วโมง', NULL);
            RETURN jsonb_build_object('success', false, 'error', 'ACCOUNT_LOCKED', 'locked_until', NOW() + INTERVAL '1 hour');
        END IF;

        RETURN jsonb_build_object('success', false, 'error', 'OTP_INVALID', 'attempts', v_challenge.attempts + 1);
    END IF;

    DELETE FROM public.p2p_transfer_otp_challenges WHERE sender_id = p_sender_id;

    RETURN jsonb_build_object('success', true);
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: abuse_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.abuse_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    flag_type text NOT NULL,
    severity text DEFAULT 'MEDIUM'::text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    clawback_amount numeric(10,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    CONSTRAINT abuse_flags_flag_type_check CHECK ((flag_type = ANY (ARRAY['DEVICE_MULTI_ACCOUNT'::text, 'IP_CLUSTER'::text, 'BOT_PATTERN'::text]))),
    CONSTRAINT abuse_flags_severity_check CHECK ((severity = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text]))),
    CONSTRAINT abuse_flags_status_check CHECK ((status = ANY (ARRAY['OPEN'::text, 'REVIEWED'::text, 'CLAWED_BACK'::text, 'DISMISSED'::text])))
);


--
-- Name: affiliate_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.affiliate_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    code character varying(32) NOT NULL,
    total_referrals integer DEFAULT 0 NOT NULL,
    total_ap_earned numeric(12,2) DEFAULT 0.00 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT affiliate_codes_total_ap_earned_check CHECK ((total_ap_earned >= (0)::numeric)),
    CONSTRAINT affiliate_codes_total_referrals_check CHECK ((total_referrals >= 0))
);


--
-- Name: affiliate_referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.affiliate_referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    referee_id uuid NOT NULL,
    affiliate_code character varying(32) NOT NULL,
    status public.affiliate_status_enum DEFAULT 'PENDING_KYC'::public.affiliate_status_enum NOT NULL,
    flag_reason text,
    kyc_reward_claimed boolean DEFAULT false NOT NULL,
    device_id_hash character varying(128),
    ip_address_hash character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_no_self_referral CHECK ((referrer_id <> referee_id))
);


--
-- Name: affiliate_rewards_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.affiliate_rewards_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    referee_id uuid NOT NULL,
    tier_level integer NOT NULL,
    reward_type public.affiliate_reward_type_enum NOT NULL,
    amount_ap numeric(12,2) NOT NULL,
    reference_tx_id character varying(128),
    idempotency_key character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT affiliate_rewards_ledger_amount_ap_check CHECK ((amount_ap > (0)::numeric)),
    CONSTRAINT affiliate_rewards_ledger_tier_level_check CHECK ((tier_level = ANY (ARRAY[1, 2])))
);


--
-- Name: ap_daily_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ap_daily_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    limit_date date NOT NULL,
    ap_earned numeric(10,2) DEFAULT 0 NOT NULL,
    daily_cap numeric(10,2) DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ap_earning_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ap_earning_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    reason public.ap_reason_type DEFAULT 'WATCH_EARN'::public.ap_reason_type NOT NULL,
    stream_type public.stream_type_type,
    min_watch_seconds integer DEFAULT 0 NOT NULL,
    min_watch_percent numeric(5,2) DEFAULT 0.00 NOT NULL,
    ap_amount bigint NOT NULL,
    max_per_day integer,
    max_per_stream integer DEFAULT 1 NOT NULL,
    cooldown_seconds integer DEFAULT 0 NOT NULL,
    valid_from timestamp with time zone,
    valid_until timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ap_earning_rules_ap_amount_check CHECK ((ap_amount > 0)),
    CONSTRAINT ap_earning_rules_cooldown_seconds_check CHECK ((cooldown_seconds >= 0)),
    CONSTRAINT ap_earning_rules_max_per_day_check CHECK ((max_per_day > 0)),
    CONSTRAINT ap_earning_rules_max_per_stream_check CHECK ((max_per_stream > 0)),
    CONSTRAINT ap_earning_rules_min_watch_percent_check CHECK (((min_watch_percent >= 0.00) AND (min_watch_percent <= 100.00))),
    CONSTRAINT ap_earning_rules_min_watch_seconds_check CHECK ((min_watch_seconds >= 0)),
    CONSTRAINT chk_rule_time_window CHECK (((valid_until IS NULL) OR (valid_from IS NULL) OR (valid_until > valid_from)))
);


--
-- Name: ap_escrow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ap_escrow (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    amount_ap bigint NOT NULL,
    status public.escrow_status_type DEFAULT 'PENDING'::public.escrow_status_type NOT NULL,
    sender_2fa_verified boolean DEFAULT false NOT NULL,
    approval_deadline timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL,
    auto_released_at timestamp with time zone,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    idempotency_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ap_escrow_amount_ap_check CHECK ((amount_ap > 0)),
    CONSTRAINT chk_2fa_before_escrow CHECK ((sender_2fa_verified = true)),
    CONSTRAINT chk_no_self_transfer CHECK ((sender_id <> receiver_id))
);


--
-- Name: COLUMN ap_escrow.sender_2fa_verified; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ap_escrow.sender_2fa_verified IS '2FA บังคับที่ Sender ก่อน INSERT — ผ่าน API route เท่านั้น';


--
-- Name: COLUMN ap_escrow.approval_deadline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ap_escrow.approval_deadline IS '24 ชม. — ไม่กด Accept + ไม่มี Dispute = Auto-Release';


--
-- Name: ap_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ap_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    reason text NOT NULL,
    reference_type text,
    reference_id uuid,
    idempotency_key text,
    balance_after numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ap_ledger_reason_check CHECK ((reason = ANY (ARRAY['WATCH_REWARD'::text, 'CLAWBACK'::text, 'ADMIN_ADJUSTMENT'::text, 'STORE_REDEEM'::text, 'TOP_UP'::text, 'REFUND_AP_CREDIT'::text, 'PENALTY_FINE'::text, 'SUBSCRIPTION_RENEWAL'::text, 'MARKETPLACE_BID'::text, 'MARKETPLACE_REFUND'::text, 'MARKETPLACE_SOLD'::text, 'ESCROW_LOCK'::text, 'ESCROW_SETTLED'::text, 'ESCROW_AUTO_RELEASE'::text, 'PREDICTION_BUY'::text, 'PREDICTION_PAYOUT'::text, 'PREDICTION_REFUND_VOID'::text, 'PREDICTION_HOUSE_FEE_BURN'::text, 'WATCH_EARN'::text, 'PREDICTION_JACKPOT_PAYOUT'::text, 'SCRIM_ESCROW_LOCK'::text, 'SCRIM_MERCY_RINGER_STAKE'::text, 'QUEST_REWARD'::text, 'REFERRAL'::text, 'SCRIM_VICTORY_PAYOUT'::text, 'SCRIM_REFUND'::text, 'COUPON_REDEEM'::text, 'TOURNAMENT_ENTRY_FEE'::text])))
);


--
-- Name: athlete_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.athlete_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: athlete_market_bids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athlete_market_bids (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    bidder_player_id uuid NOT NULL,
    destination_team_id uuid,
    bid_amount_ap integer NOT NULL,
    status public.athlete_bid_status DEFAULT 'PENDING'::public.athlete_bid_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT athlete_market_bids_bid_amount_ap_check CHECK ((bid_amount_ap > 0))
);


--
-- Name: athlete_market_listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athlete_market_listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_player_id uuid NOT NULL,
    seller_team_id uuid,
    target_player_id uuid NOT NULL,
    listing_type public.athlete_listing_type DEFAULT 'DUAL_MODE'::public.athlete_listing_type NOT NULL,
    floor_price_ap integer NOT NULL,
    buyout_price_ap integer,
    current_highest_bid_ap integer DEFAULT 0 NOT NULL,
    highest_bidder_id uuid,
    status public.athlete_listing_status DEFAULT 'ACTIVE'::public.athlete_listing_status NOT NULL,
    contract_note text,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT athlete_market_listings_check CHECK (((buyout_price_ap IS NULL) OR (buyout_price_ap >= floor_price_ap))),
    CONSTRAINT athlete_market_listings_floor_price_ap_check CHECK ((floor_price_ap > 0))
);


--
-- Name: athlete_transfer_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athlete_transfer_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid,
    player_id uuid NOT NULL,
    from_team_id uuid,
    to_team_id uuid NOT NULL,
    deal_type character varying(32) NOT NULL,
    final_price_ap integer NOT NULL,
    platform_fee_ap integer NOT NULL,
    seller_payout_ap integer NOT NULL,
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT athlete_transfer_history_deal_type_check CHECK (((deal_type)::text = ANY ((ARRAY['AUCTION_WIN'::character varying, 'INSTANT_BUYOUT'::character varying])::text[]))),
    CONSTRAINT athlete_transfer_history_final_price_ap_check CHECK ((final_price_ap > 0)),
    CONSTRAINT athlete_transfer_history_platform_fee_ap_check CHECK ((platform_fee_ap >= 0)),
    CONSTRAINT athlete_transfer_history_seller_payout_ap_check CHECK ((seller_payout_ap >= 0))
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    actor_id uuid,
    actor_role public.user_role_type,
    impersonated_by uuid,
    action public.audit_action_type NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid,
    before_data jsonb,
    after_data jsonb,
    diff jsonb,
    reason text,
    ip_address inet,
    user_agent text,
    request_id uuid,
    session_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: bracket_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bracket_nodes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stage_id uuid NOT NULL,
    bracket_type character varying(20) DEFAULT 'MAIN'::character varying NOT NULL,
    round_number smallint NOT NULL,
    position_in_round smallint NOT NULL,
    label character varying(50),
    team_a_id uuid,
    team_b_id uuid,
    source_a_node_id uuid,
    source_a_outcome character varying(10),
    source_b_node_id uuid,
    source_b_outcome character varying(10),
    winner_to_node_id uuid,
    winner_to_slot character(1),
    loser_to_node_id uuid,
    loser_to_slot character(1),
    status public.bracket_node_status_type DEFAULT 'PENDING'::public.bracket_node_status_type NOT NULL,
    voided_reason text,
    reset_from_node_id uuid,
    is_bye boolean DEFAULT false NOT NULL,
    best_of smallint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bracket_nodes_best_of_check CHECK (((((best_of)::integer % 2) = 1) OR (best_of = 2))),
    CONSTRAINT bracket_nodes_loser_to_slot_check CHECK ((loser_to_slot = ANY (ARRAY['A'::bpchar, 'B'::bpchar]))),
    CONSTRAINT bracket_nodes_position_in_round_check CHECK ((position_in_round > 0)),
    CONSTRAINT bracket_nodes_round_number_check CHECK ((round_number > 0)),
    CONSTRAINT bracket_nodes_winner_to_slot_check CHECK ((winner_to_slot = ANY (ARRAY['A'::bpchar, 'B'::bpchar]))),
    CONSTRAINT chk_different_teams CHECK (((team_a_id IS NULL) OR (team_b_id IS NULL) OR (team_a_id <> team_b_id))),
    CONSTRAINT chk_no_self_ref CHECK (((id <> winner_to_node_id) AND (id <> loser_to_node_id))),
    CONSTRAINT chk_ready_has_teams CHECK (((status <> 'READY'::public.bracket_node_status_type) OR (is_bye = true) OR ((team_a_id IS NOT NULL) AND (team_b_id IS NOT NULL)))),
    CONSTRAINT chk_void_reason CHECK (((status <> 'VOID'::public.bracket_node_status_type) OR (voided_reason IS NOT NULL)))
);


--
-- Name: brand_themes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_themes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    scope_type character varying(30) NOT NULL,
    scope_id uuid,
    colors jsonb DEFAULT '{}'::jsonb NOT NULL,
    typography jsonb DEFAULT '{}'::jsonb,
    assets jsonb DEFAULT '{}'::jsonb,
    custom_css_vars jsonb DEFAULT '{}'::jsonb,
    active_from timestamp with time zone,
    active_until timestamp with time zone,
    priority smallint DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT brand_themes_scope_type_check CHECK (((scope_type)::text = ANY ((ARRAY['GLOBAL'::character varying, 'SEASON'::character varying, 'TOURNAMENT'::character varying, 'ORGANIZATION'::character varying, 'TEAM'::character varying])::text[]))),
    CONSTRAINT chk_theme_scope CHECK (((((scope_type)::text = 'GLOBAL'::text) AND (scope_id IS NULL)) OR (((scope_type)::text <> 'GLOBAL'::text) AND (scope_id IS NOT NULL)))),
    CONSTRAINT chk_theme_window CHECK (((active_until IS NULL) OR (active_from IS NULL) OR (active_until > active_from)))
);


--
-- Name: circuit_standings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.circuit_standings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    circuit_id uuid NOT NULL,
    team_id uuid NOT NULL,
    spring_zp bigint DEFAULT 0 NOT NULL,
    summer_zp bigint DEFAULT 0 NOT NULL,
    fall_zp bigint DEFAULT 0 NOT NULL,
    winter_zp bigint DEFAULT 0 NOT NULL,
    bonus_zp bigint DEFAULT 0 NOT NULL,
    penalty_zp bigint DEFAULT 0 NOT NULL,
    total_zp bigint DEFAULT 0 NOT NULL,
    counted_zp bigint DEFAULT 0 NOT NULL,
    rank integer,
    tiebreaker_applied jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_finals_qualified boolean DEFAULT false NOT NULL,
    finals_seed smallint,
    qualified_at timestamp with time zone,
    last_calculated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT circuit_standings_bonus_zp_check CHECK ((bonus_zp >= 0)),
    CONSTRAINT circuit_standings_counted_zp_check CHECK ((counted_zp >= 0)),
    CONSTRAINT circuit_standings_fall_zp_check CHECK ((fall_zp >= 0)),
    CONSTRAINT circuit_standings_finals_seed_check CHECK (((finals_seed >= 1) AND (finals_seed <= 12))),
    CONSTRAINT circuit_standings_penalty_zp_check CHECK ((penalty_zp <= 0)),
    CONSTRAINT circuit_standings_rank_check CHECK ((rank > 0)),
    CONSTRAINT circuit_standings_spring_zp_check CHECK ((spring_zp >= 0)),
    CONSTRAINT circuit_standings_summer_zp_check CHECK ((summer_zp >= 0)),
    CONSTRAINT circuit_standings_total_zp_check CHECK ((total_zp >= 0)),
    CONSTRAINT circuit_standings_winter_zp_check CHECK ((winter_zp >= 0))
);


--
-- Name: circuits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.circuits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    season_order integer NOT NULL,
    game_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: crypto_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crypto_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_intent_id uuid NOT NULL,
    token_symbol text NOT NULL,
    to_address text NOT NULL,
    amount_token numeric(30,8) NOT NULL,
    rate_to_thb numeric(18,8) NOT NULL,
    rate_locked_at timestamp with time zone NOT NULL,
    tx_hash text,
    block_number bigint,
    confirmations integer DEFAULT 0 NOT NULL,
    required_confirms integer DEFAULT 15 NOT NULL,
    is_confirmed boolean DEFAULT false NOT NULL,
    is_reverted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT crypto_payments_amount_token_check CHECK ((amount_token > (0)::numeric)),
    CONSTRAINT crypto_payments_rate_to_thb_check CHECK ((rate_to_thb > (0)::numeric))
);


--
-- Name: daily_quests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_quests (
    id character varying(64) NOT NULL,
    title character varying(100) NOT NULL,
    description text NOT NULL,
    reward_ap numeric(12,2) NOT NULL,
    quest_type public.quest_type_enum NOT NULL,
    target_count integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT daily_quests_reward_ap_check CHECK ((reward_ap > (0)::numeric)),
    CONSTRAINT daily_quests_target_count_check CHECK ((target_count > 0))
);


--
-- Name: disputes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disputes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dispute_number character varying(50),
    match_id uuid NOT NULL,
    filed_by uuid NOT NULL,
    category character varying(50) DEFAULT 'MATCH_RESULT'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'MEDIUM'::character varying NOT NULL,
    status character varying(50) DEFAULT 'OPEN'::character varying NOT NULL,
    reason text NOT NULL,
    evidence_urls text[] DEFAULT '{}'::text[],
    resolution text,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    deadline_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: game_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    game_id uuid,
    external_id text NOT NULL,
    game_name character varying(50),
    tag_line character varying(10),
    region character varying(10) DEFAULT 'ap'::character varying,
    verification_status public.verification_status_type DEFAULT 'UNVERIFIED'::public.verification_status_type NOT NULL,
    verified_at timestamp with time zone,
    verified_by uuid,
    rejection_reason text,
    rso_access_token text,
    rso_refresh_token text,
    rso_expires_at timestamp with time zone,
    rso_scopes text[],
    rank_snapshot jsonb DEFAULT '{}'::jsonb,
    last_synced_at timestamp with time zone,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    evidence_url text,
    reviewed_at timestamp with time zone,
    CONSTRAINT chk_verified CHECK (((verification_status <> 'VERIFIED'::public.verification_status_type) OR (verified_at IS NOT NULL)))
);


--
-- Name: games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.games (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code public.game_code_type NOT NULL,
    name character varying(100) NOT NULL,
    publisher character varying(100),
    icon_url text,
    team_size smallint DEFAULT 5 NOT NULL,
    max_substitutes smallint DEFAULT 2 NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT games_max_substitutes_check CHECK ((max_substitutes >= 0)),
    CONSTRAINT games_team_size_check CHECK (((team_size >= 1) AND (team_size <= 10)))
);


--
-- Name: TABLE games; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.games IS 'ทะเบียนเกมที่ platform รองรับ — เพิ่มเกมใหม่โดยไม่ต้องแก้ schema';


--
-- Name: COLUMN games.config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.games.config IS 'เก็บ metadata เฉพาะเกม เช่น {"maps":["Ascent"],"roles":["Duelist"]}';


--
-- Name: map_vetoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.map_vetoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    step_order smallint NOT NULL,
    action public.veto_action_type NOT NULL,
    team_id uuid,
    map_name character varying(50) NOT NULL,
    side_choice character varying(20),
    deadline_at timestamp with time zone,
    was_auto boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_id uuid,
    CONSTRAINT map_vetoes_step_order_check CHECK ((step_order > 0))
);


--
-- Name: marketplace_listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    item_title text NOT NULL,
    description text,
    image_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    currency_type public.listing_currency_type DEFAULT 'AP'::public.listing_currency_type NOT NULL,
    floor_price numeric(12,2) NOT NULL,
    current_highest_bid numeric(12,2),
    highest_bidder_id uuid,
    buyout_price numeric(12,2),
    status public.listing_status_type DEFAULT 'ACTIVE'::public.listing_status_type NOT NULL,
    is_paid_slot boolean DEFAULT false NOT NULL,
    shelf_billing_cycle_end timestamp with time zone,
    auction_ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_buyout_vs_floor CHECK (((buyout_price IS NULL) OR (buyout_price >= floor_price))),
    CONSTRAINT marketplace_listings_floor_price_check CHECK ((floor_price > (0)::numeric))
);


--
-- Name: COLUMN marketplace_listings.floor_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marketplace_listings.floor_price IS 'ซ่อนจาก buyer — ไม่แจ้งตัวเลข ป้องกัน trial-and-error';


--
-- Name: COLUMN marketplace_listings.is_paid_slot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marketplace_listings.is_paid_slot IS 'TRUE = Paid Shelf $5/slot, Unlimited Monthly Creations';


--
-- Name: marketplace_trade_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_trade_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    item_title text NOT NULL,
    seller_id uuid NOT NULL,
    buyer_id uuid NOT NULL,
    sold_price numeric(12,2) NOT NULL,
    currency_type public.listing_currency_type NOT NULL,
    sold_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE marketplace_trade_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.marketplace_trade_history IS 'Append-only trade log — โปร่งใส ห้ามแก้';


--
-- Name: match_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    dispute_id uuid,
    decision_type character varying(50) DEFAULT 'PENALTY'::character varying NOT NULL,
    decided_by uuid NOT NULL,
    reason text NOT NULL,
    effects jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: match_games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_games (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    game_number smallint NOT NULL,
    map_name character varying(50),
    team_a_side_start character varying(20),
    team_b_side_start character varying(20),
    score_a smallint DEFAULT 0 NOT NULL,
    score_b smallint DEFAULT 0 NOT NULL,
    winner_team_id uuid,
    went_overtime boolean DEFAULT false NOT NULL,
    status text DEFAULT 'UPCOMING'::text NOT NULL,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    duration_seconds integer,
    external_game_id text,
    raw_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT match_games_duration_seconds_check CHECK ((duration_seconds >= 0)),
    CONSTRAINT match_games_game_number_check CHECK ((game_number > 0)),
    CONSTRAINT match_games_score_a_check CHECK ((score_a >= 0)),
    CONSTRAINT match_games_score_b_check CHECK ((score_b >= 0)),
    CONSTRAINT match_games_status_check CHECK ((status = ANY (ARRAY['UPCOMING'::text, 'LIVE'::text, 'COMPLETED'::text, 'CANCELLED'::text])))
);


--
-- Name: match_lobby_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_lobby_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    sender_id uuid,
    sender_role character varying(20) NOT NULL,
    message text NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_msg_length CHECK ((char_length(message) <= 500)),
    CONSTRAINT chk_sender_role CHECK (((sender_role)::text = ANY ((ARRAY['TEAM_A'::character varying, 'TEAM_B'::character varying, 'REFEREE'::character varying, 'SYSTEM'::character varying])::text[])))
);


--
-- Name: match_participant_hit_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_participant_hit_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_participant_id uuid NOT NULL,
    head_hits integer DEFAULT 0 NOT NULL,
    body_hits integer DEFAULT 0 NOT NULL,
    leg_hits integer DEFAULT 0 NOT NULL,
    entered_by uuid,
    is_verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT match_participant_hit_stats_body_hits_check CHECK ((body_hits >= 0)),
    CONSTRAINT match_participant_hit_stats_head_hits_check CHECK ((head_hits >= 0)),
    CONSTRAINT match_participant_hit_stats_leg_hits_check CHECK ((leg_hits >= 0))
);


--
-- Name: match_participant_weapons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_participant_weapons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_participant_id uuid NOT NULL,
    weapon_name character varying(50) NOT NULL,
    weapon_category character varying(30) DEFAULT 'Other'::character varying NOT NULL,
    kills integer DEFAULT 0 NOT NULL,
    head_hits integer DEFAULT 0 NOT NULL,
    body_hits integer DEFAULT 0 NOT NULL,
    leg_hits integer DEFAULT 0 NOT NULL,
    entered_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT match_participant_weapons_body_hits_check CHECK ((body_hits >= 0)),
    CONSTRAINT match_participant_weapons_head_hits_check CHECK ((head_hits >= 0)),
    CONSTRAINT match_participant_weapons_kills_check CHECK ((kills >= 0)),
    CONSTRAINT match_participant_weapons_leg_hits_check CHECK ((leg_hits >= 0))
);


--
-- Name: match_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_game_id uuid NOT NULL,
    match_id uuid NOT NULL,
    team_id uuid NOT NULL,
    player_id uuid NOT NULL,
    game_account_id uuid,
    is_substitute boolean DEFAULT false NOT NULL,
    role_played character varying(30),
    agent_played character varying(50),
    kills smallint DEFAULT 0 NOT NULL,
    deaths smallint DEFAULT 0 NOT NULL,
    assists smallint DEFAULT 0 NOT NULL,
    acs numeric(6,2),
    adr numeric(6,2),
    first_bloods smallint DEFAULT 0 NOT NULL,
    first_deaths smallint DEFAULT 0 NOT NULL,
    headshot_pct numeric(5,2),
    rounds_played smallint DEFAULT 0 NOT NULL,
    eligibility_checked boolean DEFAULT false NOT NULL,
    eligibility_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT match_participants_assists_check CHECK ((assists >= 0)),
    CONSTRAINT match_participants_deaths_check CHECK ((deaths >= 0)),
    CONSTRAINT match_participants_headshot_pct_check CHECK (((headshot_pct >= (0)::numeric) AND (headshot_pct <= (100)::numeric))),
    CONSTRAINT match_participants_kills_check CHECK ((kills >= 0))
);


--
-- Name: match_replays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_replays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    player_id uuid,
    created_by uuid,
    title character varying(255) NOT NULL,
    clip_url text NOT NULL,
    thumbnail_url text,
    start_time_seconds integer DEFAULT 0 NOT NULL,
    duration_seconds integer DEFAULT 0 NOT NULL,
    is_official boolean DEFAULT false NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT match_replays_duration_seconds_check CHECK ((duration_seconds >= 0)),
    CONSTRAINT match_replays_start_time_seconds_check CHECK ((start_time_seconds >= 0))
);


--
-- Name: match_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    reported_by_team uuid NOT NULL,
    reported_by_user uuid NOT NULL,
    winner_team_id uuid NOT NULL,
    score_a smallint NOT NULL,
    score_b smallint NOT NULL,
    evidence_urls text[] DEFAULT ARRAY[]::text[] NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT match_reports_score_a_check CHECK ((score_a >= 0)),
    CONSTRAINT match_reports_score_b_check CHECK ((score_b >= 0))
);


--
-- Name: match_room_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_room_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    sender_id uuid,
    sender_role character varying(20) NOT NULL,
    message text NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT match_room_messages_message_check CHECK ((char_length(message) <= 500)),
    CONSTRAINT match_room_messages_sender_role_check CHECK (((sender_role)::text = ANY ((ARRAY['TEAM_A'::character varying, 'TEAM_B'::character varying, 'REFEREE'::character varying, 'SYSTEM'::character varying])::text[])))
);


--
-- Name: match_room_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_room_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    player_id uuid NOT NULL,
    team_side character varying(10) NOT NULL,
    role_type public.scrim_participant_role_enum DEFAULT 'TEAM_A_STARTER'::public.scrim_participant_role_enum NOT NULL,
    agent_role_preference public.valorant_agent_role_enum DEFAULT 'FLEX'::public.valorant_agent_role_enum,
    ap_staked numeric(12,2) DEFAULT 0.00 NOT NULL,
    has_paid_escrow boolean DEFAULT false NOT NULL,
    is_ready_confirmed boolean DEFAULT false NOT NULL,
    is_mercy_ringer boolean DEFAULT false NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT match_room_participants_ap_staked_check CHECK ((ap_staked >= (0)::numeric)),
    CONSTRAINT match_room_participants_team_side_check CHECK (((team_side)::text = ANY ((ARRAY['TEAM_A'::character varying, 'TEAM_B'::character varying, 'SPECTATOR'::character varying])::text[])))
);


--
-- Name: match_room_staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_room_staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    staff_player_id uuid NOT NULL,
    staff_role character varying(32) DEFAULT 'REFEREE'::character varying NOT NULL,
    is_active_monitoring boolean DEFAULT true NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT match_room_staff_staff_role_check CHECK (((staff_role)::text = ANY ((ARRAY['REFEREE'::character varying, 'OBSERVER'::character varying, 'ADMIN'::character varying, 'CASTER'::character varying])::text[])))
);


--
-- Name: match_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(128) NOT NULL,
    creator_player_id uuid NOT NULL,
    team_a_id uuid,
    team_b_id uuid,
    scheduled_at timestamp with time zone NOT NULL,
    min_ap_stake numeric(12,2) DEFAULT 100.00 NOT NULL,
    total_escrow_ap numeric(12,2) DEFAULT 0.00 NOT NULL,
    status public.scrim_room_status_enum DEFAULT 'PENDING_APPROVAL'::public.scrim_room_status_enum NOT NULL,
    target_tier_min character varying(32) DEFAULT 'GOLD'::character varying,
    target_tier_max character varying(32) DEFAULT 'RADIANT'::character varying,
    riot_lobby_code character varying(128),
    auto_audit_approved boolean DEFAULT false NOT NULL,
    mercy_beacon_active boolean DEFAULT false NOT NULL,
    mercy_beacon_triggered_at timestamp with time zone,
    forfeit_deadline_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    match_mode character varying(32) DEFAULT 'SCRIM_5V5'::character varying,
    team_size integer DEFAULT 5,
    map_selection_mode character varying(32) DEFAULT 'VETO'::character varying,
    room_access character varying(32) DEFAULT 'PUBLIC_OPEN'::character varying,
    is_private boolean DEFAULT false,
    passcode character varying(64) DEFAULT NULL::character varying,
    CONSTRAINT match_rooms_min_ap_stake_check CHECK ((min_ap_stake >= (0)::numeric)),
    CONSTRAINT match_rooms_total_escrow_ap_check CHECK ((total_escrow_ap >= (0)::numeric))
);


--
-- Name: match_rounds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_rounds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    game_number integer DEFAULT 1 NOT NULL,
    round_number integer NOT NULL,
    winner_team_id uuid,
    win_condition public.win_condition_enum DEFAULT 'elimination'::public.win_condition_enum NOT NULL,
    idempotency_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_match_rounds_positive CHECK (((game_number > 0) AND (round_number > 0)))
);


--
-- Name: match_state_transitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_state_transitions (
    id bigint NOT NULL,
    match_id uuid NOT NULL,
    from_status public.match_status_type,
    to_status public.match_status_type NOT NULL,
    trigger_source character varying(30) NOT NULL,
    actor_id uuid,
    reason text,
    state_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: match_state_transitions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.match_state_transitions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: match_state_transitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.match_state_transitions_id_seq OWNED BY public.match_state_transitions.id;


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stage_id uuid NOT NULL,
    team_a_id uuid,
    team_b_id uuid,
    score_a integer,
    score_b integer,
    status public.match_status_type DEFAULT 'SCHEDULED'::public.match_status_type NOT NULL,
    scheduled_at timestamp with time zone,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    tournament_id uuid,
    bracket_node_id uuid,
    match_number integer,
    round_label character varying(50),
    best_of smallint DEFAULT 1 NOT NULL,
    winner_team_id uuid,
    outcome public.match_outcome_type,
    rounds_won_a smallint DEFAULT 0 NOT NULL,
    rounds_won_b smallint DEFAULT 0 NOT NULL,
    rescheduled_from timestamp with time zone,
    reschedule_reason text,
    team_a_ready_at timestamp with time zone,
    team_b_ready_at timestamp with time zone,
    forfeit_deadline_at timestamp with time zone,
    referee_id uuid,
    result_source public.result_source_type,
    result_reported_by uuid,
    result_confirmed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    format_config jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: mercy_fill_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mercy_fill_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    missing_team_side character varying(10) NOT NULL,
    required_role public.valorant_agent_role_enum DEFAULT 'FLEX'::public.valorant_agent_role_enum NOT NULL,
    status character varying(20) DEFAULT 'OPEN'::character varying NOT NULL,
    filled_by_player_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mercy_fill_tickets_missing_team_side_check CHECK (((missing_team_side)::text = ANY ((ARRAY['TEAM_A'::character varying, 'TEAM_B'::character varying])::text[]))),
    CONSTRAINT mercy_fill_tickets_status_check CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'FILLED'::character varying, 'EXPIRED'::character varying, 'CANCELLED'::character varying])::text[])))
);


--
-- Name: mercy_sub_pool; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mercy_sub_pool (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    preferred_role public.valorant_agent_role_enum DEFAULT 'FLEX'::public.valorant_agent_role_enum NOT NULL,
    rank_tier character varying(32) DEFAULT 'DIAMOND'::character varying NOT NULL,
    is_on_call boolean DEFAULT true NOT NULL,
    ap_stake_budget numeric(12,2) DEFAULT 100.00 NOT NULL,
    last_beacon_notified_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mercy_sub_pool_ap_stake_budget_check CHECK ((ap_stake_budget >= (0)::numeric))
);


--
-- Name: mv_team_analytics; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_team_analytics AS
 SELECT team_id,
    count(DISTINCT match_game_id) AS games_played,
    round(avg(kills), 2) AS avg_kills,
    round(avg(deaths), 2) AS avg_deaths,
    round(avg(assists), 2) AS avg_assists,
    round(avg(acs), 2) AS avg_acs,
    round(avg(adr), 2) AS adr_metrics,
    round(avg(headshot_pct), 2) AS avg_headshot_pct,
    NULL::jsonb AS heatmap_data,
    NULL::numeric AS first_blood_pct,
    NULL::jsonb AS economy_breakdown,
    now() AS data_as_of
   FROM public.match_participants mp
  WHERE (team_id IS NOT NULL)
  GROUP BY team_id
  WITH NO DATA;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    body text,
    action_url text,
    metadata jsonb DEFAULT '{}'::jsonb,
    channels public.notification_channel_type[] DEFAULT '{IN_APP}'::public.notification_channel_type[] NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    sent_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    variant_id uuid NOT NULL,
    name_at character varying(200) NOT NULL,
    unit_price_ap integer NOT NULL,
    unit_price_thb integer NOT NULL,
    quantity integer NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_items_unit_price_ap_check CHECK ((unit_price_ap >= 0)),
    CONSTRAINT order_items_unit_price_thb_check CHECK ((unit_price_thb >= 0))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    shipping_address_id uuid,
    total_price_ap integer DEFAULT 0 NOT NULL,
    total_price_thb integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    idempotency_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'PAID'::character varying, 'EXPIRED'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT orders_total_price_ap_check CHECK ((total_price_ap >= 0)),
    CONSTRAINT orders_total_price_thb_check CHECK ((total_price_thb >= 0))
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(60) NOT NULL,
    tag character varying(10) NOT NULL,
    description text,
    logo_url text,
    banner_url text,
    brand_colors jsonb DEFAULT '{}'::jsonb,
    website_url text,
    social_links jsonb DEFAULT '{}'::jsonb,
    country_code character(2),
    owner_id uuid NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: p2p_transfer_otp_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.p2p_transfer_otp_challenges (
    sender_id uuid NOT NULL,
    otp_code_hash text NOT NULL,
    attempts smallint DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: p2p_transfer_used_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.p2p_transfer_used_tokens (
    jti text NOT NULL,
    sender_id uuid NOT NULL,
    used_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: partner_coupon_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_coupon_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coupon_id uuid NOT NULL,
    player_id uuid NOT NULL,
    discount_applied_ap integer NOT NULL,
    idempotency_key character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT partner_coupon_redemptions_discount_applied_ap_check CHECK ((discount_applied_ap >= 0))
);


--
-- Name: partner_coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sponsor_id uuid NOT NULL,
    code character varying(50) NOT NULL,
    title text NOT NULL,
    description text,
    ap_discount_amount integer NOT NULL,
    min_purchase_ap integer DEFAULT 0 NOT NULL,
    max_total_uses integer DEFAULT 1000 NOT NULL,
    current_uses integer DEFAULT 0 NOT NULL,
    per_user_limit integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT partner_coupons_ap_discount_amount_check CHECK ((ap_discount_amount >= 0)),
    CONSTRAINT partner_coupons_check CHECK ((current_uses <= max_total_uses)),
    CONSTRAINT partner_coupons_max_total_uses_check CHECK ((max_total_uses > 0)),
    CONSTRAINT partner_coupons_min_purchase_ap_check CHECK ((min_purchase_ap >= 0)),
    CONSTRAINT partner_coupons_per_user_limit_check CHECK ((per_user_limit > 0))
);


--
-- Name: payment_intents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_intents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    purpose text NOT NULL,
    order_id uuid,
    channel text NOT NULL,
    method text,
    amount_thb integer,
    ap_amount integer,
    status text DEFAULT 'PENDING'::text NOT NULL,
    provider text,
    provider_intent_id text,
    checkout_url text,
    idempotency_key text,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_purpose_target CHECK ((((purpose = 'TOP_UP'::text) AND (ap_amount IS NOT NULL)) OR ((purpose = 'ORDER'::text) AND (order_id IS NOT NULL)))),
    CONSTRAINT payment_intents_amount_thb_check CHECK ((amount_thb >= 0)),
    CONSTRAINT payment_intents_ap_amount_check CHECK ((ap_amount >= 0)),
    CONSTRAINT payment_intents_channel_check CHECK ((channel = ANY (ARRAY['FIAT'::text, 'CRYPTO'::text]))),
    CONSTRAINT payment_intents_method_check CHECK ((method = ANY (ARRAY['PROMPTPAY'::text, 'CREDIT_CARD'::text, 'BANK_TRANSFER'::text, 'TRUE_MONEY'::text]))),
    CONSTRAINT payment_intents_purpose_check CHECK ((purpose = ANY (ARRAY['TOP_UP'::text, 'ORDER'::text]))),
    CONSTRAINT payment_intents_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'SUCCEEDED'::text, 'FAILED'::text, 'EXPIRED'::text])))
);


--
-- Name: perk_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.perk_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    perk_id uuid NOT NULL,
    redeemed_by_player_id uuid NOT NULL,
    redeemed_amount numeric(10,2) NOT NULL,
    perk_token text NOT NULL,
    is_redeemed boolean DEFAULT false NOT NULL,
    redeemed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_redeemed_at CHECK (((is_redeemed = false) OR (redeemed_at IS NOT NULL))),
    CONSTRAINT perk_redemptions_redeemed_amount_check CHECK ((redeemed_amount > (0)::numeric))
);


--
-- Name: COLUMN perk_redemptions.perk_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.perk_redemptions.perk_token IS 'Dynamic QR JWT — expire 5 นาที, one-time use';


--
-- Name: player_daily_quests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_daily_quests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    quest_id character varying(64) NOT NULL,
    quest_date date DEFAULT CURRENT_DATE NOT NULL,
    current_count integer DEFAULT 0 NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    is_claimed boolean DEFAULT false NOT NULL,
    claimed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT player_daily_quests_current_count_check CHECK ((current_count >= 0))
);


--
-- Name: player_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    variant_id uuid NOT NULL,
    item_type character varying(30) NOT NULL,
    is_equipped boolean DEFAULT false NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'ACTIVE'::text,
    redeemed_at timestamp with time zone,
    CONSTRAINT player_inventory_item_type_check CHECK (((item_type)::text = ANY ((ARRAY['FRAME'::character varying, 'BADGE'::character varying, 'TITLE'::character varying])::text[]))),
    CONSTRAINT player_inventory_quantity_check CHECK ((quantity >= 0)),
    CONSTRAINT player_inventory_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'REDEEMED'::text, 'EXPIRED'::text])))
);


--
-- Name: player_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    game_id uuid NOT NULL,
    season_id uuid,
    matches_played integer DEFAULT 0 NOT NULL,
    games_played integer DEFAULT 0 NOT NULL,
    matches_won integer DEFAULT 0 NOT NULL,
    matches_lost integer DEFAULT 0 NOT NULL,
    total_kills integer DEFAULT 0 NOT NULL,
    total_deaths integer DEFAULT 0 NOT NULL,
    total_assists integer DEFAULT 0 NOT NULL,
    total_first_bloods integer DEFAULT 0 NOT NULL,
    avg_acs numeric(8,2),
    avg_adr numeric(8,2),
    avg_kd numeric(5,2),
    avg_kda numeric(5,2),
    headshot_pct numeric(5,2),
    win_rate numeric(5,2),
    agent_pool jsonb DEFAULT '{}'::jsonb NOT NULL,
    map_performance jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_match_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.players (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    athlete_id character varying(20) NOT NULL,
    display_name character varying(50) DEFAULT 'ATHLETE_RECRUIT'::character varying NOT NULL,
    slug character varying(60),
    bio text,
    avatar_url text,
    banner_url text,
    country_code character(2),
    email public.citext,
    phone character varying(20),
    date_of_birth date,
    real_name character varying(120),
    kyc_verified_at timestamp with time zone,
    ap_balance bigint DEFAULT 0 NOT NULL,
    status public.account_status_type DEFAULT 'PENDING'::public.account_status_type NOT NULL,
    suspended_until timestamp with time zone,
    ban_reason text,
    last_login_at timestamp with time zone,
    last_login_ip inet,
    locale character varying(10) DEFAULT 'th-TH'::character varying NOT NULL,
    timezone character varying(50) DEFAULT 'Asia/Bangkok'::character varying NOT NULL,
    notification_prefs jsonb DEFAULT '{"push": false, "email": true, "in_app": true}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    unverified_data boolean DEFAULT false NOT NULL,
    CONSTRAINT chk_ban_reason CHECK (((status <> 'BANNED'::public.account_status_type) OR (ban_reason IS NOT NULL))),
    CONSTRAINT chk_suspension CHECK (((status <> 'SUSPENDED'::public.account_status_type) OR (suspended_until IS NOT NULL))),
    CONSTRAINT players_ap_balance_check CHECK ((ap_balance >= 0)),
    CONSTRAINT players_bio_check CHECK ((char_length(bio) <= 500))
);


--
-- Name: prediction_pools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prediction_pools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    house_fee_percent numeric(4,2) DEFAULT 5.00 NOT NULL,
    total_ap_pool_a bigint DEFAULT 0 NOT NULL,
    total_ap_pool_b bigint DEFAULT 0 NOT NULL,
    bonus_pool_ap bigint DEFAULT 0 NOT NULL,
    status public.prediction_pool_status_type DEFAULT 'OPEN'::public.prediction_pool_status_type NOT NULL,
    winning_team_id uuid,
    settled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_match_prediction_state CHECK (true),
    CONSTRAINT prediction_pools_bonus_pool_ap_check CHECK ((bonus_pool_ap >= 0)),
    CONSTRAINT prediction_pools_house_fee_percent_check CHECK (((house_fee_percent >= (0)::numeric) AND (house_fee_percent <= (10)::numeric))),
    CONSTRAINT prediction_pools_total_ap_pool_a_check CHECK ((total_ap_pool_a >= 0)),
    CONSTRAINT prediction_pools_total_ap_pool_b_check CHECK ((total_ap_pool_b >= 0))
);


--
-- Name: COLUMN prediction_pools.house_fee_percent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prediction_pools.house_fee_percent IS 'Admin ปรับได้ตามความสำคัญแมตช์ 5–10%';


--
-- Name: COLUMN prediction_pools.bonus_pool_ap; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prediction_pools.bonus_pool_ap IS 'Q3: inject จาก season_jackpot_pools ผ่าน RPC inject_jackpot_bonus() — แยกจาก user AP ไม่กระทบ House Fee';


--
-- Name: prediction_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prediction_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pool_id uuid NOT NULL,
    player_id uuid NOT NULL,
    predicted_team_id uuid NOT NULL,
    tier public.prediction_ticket_tier_type DEFAULT 'BRONZE'::public.prediction_ticket_tier_type NOT NULL,
    ap_amount bigint NOT NULL,
    payout_ap bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prediction_tickets_ap_amount_check CHECK ((ap_amount > 0))
);


--
-- Name: TABLE prediction_tickets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.prediction_tickets IS 'player_id REFERENCES players(id) — ห้ามสร้าง user table แยก';


--
-- Name: prize_payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prize_payouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id uuid NOT NULL,
    player_id uuid NOT NULL,
    gross integer NOT NULL,
    tax_withheld integer DEFAULT 0 NOT NULL,
    net integer NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    idempotency_key text,
    approved_by uuid,
    approved_at timestamp with time zone,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_net_math CHECK ((net = (gross - tax_withheld))),
    CONSTRAINT prize_payouts_gross_check CHECK ((gross >= 0)),
    CONSTRAINT prize_payouts_net_check CHECK ((net >= 0)),
    CONSTRAINT prize_payouts_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'PROCESSING'::text, 'PAID'::text]))),
    CONSTRAINT prize_payouts_tax_withheld_check CHECK ((tax_withheld >= 0))
);


--
-- Name: refunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_intent_id uuid NOT NULL,
    requested_by uuid,
    channel text NOT NULL,
    amount_thb integer,
    ap_amount integer,
    status text DEFAULT 'PENDING'::text NOT NULL,
    provider_refund_id text,
    reason text,
    idempotency_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT refunds_amount_thb_check CHECK ((amount_thb >= 0)),
    CONSTRAINT refunds_ap_amount_check CHECK ((ap_amount >= 0)),
    CONSTRAINT refunds_channel_check CHECK ((channel = ANY (ARRAY['FIAT'::text, 'CRYPTO'::text]))),
    CONSTRAINT refunds_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'PROCESSING'::text, 'SUCCEEDED'::text, 'FAILED'::text])))
);


--
-- Name: roster_snapshot_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roster_snapshot_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snapshot_id uuid NOT NULL,
    player_id uuid NOT NULL,
    role text NOT NULL
);


--
-- Name: roster_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roster_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    tournament_id uuid,
    locked_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: season_jackpot_pools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.season_jackpot_pools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season_id uuid NOT NULL,
    accumulated_ap bigint DEFAULT 0 NOT NULL,
    status public.jackpot_pool_status_type DEFAULT 'ACCUMULATING'::public.jackpot_pool_status_type NOT NULL,
    injected_at timestamp with time zone,
    carried_over_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT season_jackpot_pools_accumulated_ap_check CHECK ((accumulated_ap >= 0))
);


--
-- Name: TABLE season_jackpot_pools; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.season_jackpot_pools IS 'Q3: Jackpot แยก table — Grand Final VOID → Rollback กลับมาที่นี่ ยกยอด Season ถัดไป';


--
-- Name: season_standings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.season_standings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season_id uuid NOT NULL,
    team_id uuid NOT NULL,
    total_zp integer DEFAULT 0 NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: seasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    circuit_id uuid NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'UPCOMING'::text NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT seasons_status_check CHECK ((status = ANY (ARRAY['UPCOMING'::text, 'ACTIVE'::text, 'CONCLUDED'::text])))
);


--
-- Name: shipments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    tracking_number character varying(100),
    carrier character varying(50),
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    shipped_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shipments_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'SHIPPED'::character varying, 'DELIVERED'::character varying])::text[])))
);


--
-- Name: shipping_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    recipient_name character varying(100) NOT NULL,
    phone character varying(20) NOT NULL,
    address_line1 text NOT NULL,
    address_line2 text,
    province character varying(100) NOT NULL,
    postal_code character varying(10) NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sponsor_banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sponsor_banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    slot_position character varying(50) NOT NULL,
    image_url text NOT NULL,
    target_url text NOT NULL,
    brand_name character varying(100),
    priority integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    ends_at timestamp with time zone,
    impression_count bigint DEFAULT 0 NOT NULL,
    click_count bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sponsor_id uuid,
    tier public.sponsor_tier,
    CONSTRAINT chk_flight_dates CHECK (((ends_at IS NULL) OR (ends_at >= starts_at))),
    CONSTRAINT chk_slot_position CHECK (((slot_position)::text = ANY ((ARRAY['TOP_LEADERBOARD'::character varying, 'LEFT_TOWER'::character varying, 'RIGHT_TOWER'::character varying])::text[])))
);


--
-- Name: sponsor_perks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sponsor_perks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    subscription_id uuid NOT NULL,
    perk_type public.perk_type DEFAULT 'HEALTH_WELLNESS_CHECK'::public.perk_type NOT NULL,
    max_quota_amount numeric(10,2) DEFAULT 2000.00 NOT NULL,
    amount_used numeric(10,2) DEFAULT 0.00 NOT NULL,
    valid_until timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_perk_quota CHECK ((amount_used <= max_quota_amount))
);


--
-- Name: TABLE sponsor_perks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sponsor_perks IS 'VIP Club Health Perk — โควตา 2,000 บาท/เดือน ระดับสโมสร';


--
-- Name: sponsors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sponsors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name text NOT NULL,
    brand_logo_url text NOT NULL,
    contact_email text NOT NULL,
    partner_player_id uuid,
    tier public.sponsor_tier DEFAULT 'SPONSOR'::public.sponsor_tier NOT NULL,
    status public.sponsor_status DEFAULT 'PENDING'::public.sponsor_status NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    approved_by uuid,
    rejection_reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: store_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    parent_id uuid,
    partner_brand text,
    icon_url text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: store_item_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_item_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    price_ap integer DEFAULT 0 NOT NULL,
    price_thb integer DEFAULT 0 NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    reserved_stock integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    available_until timestamp with time zone,
    CONSTRAINT chk_stock_capacity CHECK ((reserved_stock <= stock)),
    CONSTRAINT store_item_variants_price_ap_check CHECK ((price_ap >= 0)),
    CONSTRAINT store_item_variants_price_thb_check CHECK ((price_thb >= 0)),
    CONSTRAINT store_item_variants_reserved_stock_check CHECK ((reserved_stock >= 0)),
    CONSTRAINT store_item_variants_stock_check CHECK ((stock >= 0))
);


--
-- Name: store_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    type character varying(20) NOT NULL,
    description text,
    max_per_player integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    price_ap integer DEFAULT 0,
    price_thb_est integer DEFAULT 0,
    stock_quantity integer DEFAULT 0,
    item_type text DEFAULT 'PHYSICAL'::text,
    partner_brand text,
    category_id uuid,
    CONSTRAINT store_items_item_type_check CHECK ((item_type = ANY (ARRAY['PHYSICAL'::text, 'DIGITAL'::text, 'VOUCHER'::text]))),
    CONSTRAINT store_items_max_per_player_check CHECK ((max_per_player > 0)),
    CONSTRAINT store_items_type_check CHECK (((type)::text = ANY ((ARRAY['DIGITAL'::character varying, 'PHYSICAL'::character varying])::text[])))
);


--
-- Name: stream_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stream_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stream_id uuid NOT NULL,
    session_uid text,
    ingest_server text DEFAULT 'srt://ingest.zodiacleague.com:7000'::text NOT NULL,
    stream_key text NOT NULL,
    is_connected boolean DEFAULT false NOT NULL,
    current_fps smallint,
    current_bitrate_kbps integer,
    frame_drop_ratio numeric(5,2),
    health_status character varying(30) DEFAULT 'OFFLINE'::character varying NOT NULL,
    connected_at timestamp with time zone,
    disconnected_at timestamp with time zone,
    ended_at timestamp with time zone,
    disconnect_reason text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stream_sessions_current_bitrate_kbps_check CHECK ((current_bitrate_kbps >= 0)),
    CONSTRAINT stream_sessions_current_fps_check CHECK ((current_fps >= 0)),
    CONSTRAINT stream_sessions_frame_drop_ratio_check CHECK (((frame_drop_ratio >= 0.00) AND (frame_drop_ratio <= 100.00)))
);


--
-- Name: streams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.streams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    type public.stream_type_type DEFAULT 'LIVE_MATCH'::public.stream_type_type NOT NULL,
    status public.stream_status_type DEFAULT 'SCHEDULED'::public.stream_status_type NOT NULL,
    tournament_id uuid,
    match_id uuid,
    creator_id uuid,
    platform character varying(30) DEFAULT 'self'::character varying NOT NULL,
    external_id text,
    stream_url text NOT NULL,
    embed_url text,
    thumbnail_url text,
    duration_seconds integer,
    is_earn_eligible boolean DEFAULT false NOT NULL,
    earning_rule_id uuid,
    ap_budget_total bigint,
    ap_budget_spent bigint DEFAULT 0 NOT NULL,
    view_count bigint DEFAULT 0 NOT NULL,
    peak_viewers integer DEFAULT 0 NOT NULL,
    unique_viewers bigint DEFAULT 0 NOT NULL,
    scheduled_at timestamp with time zone,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    available_until timestamp with time zone,
    is_public boolean DEFAULT true NOT NULL,
    language character varying(10) DEFAULT 'th'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_budget CHECK (((ap_budget_total IS NULL) OR (ap_budget_spent <= ap_budget_total))),
    CONSTRAINT chk_earn_needs_rule CHECK (((is_earn_eligible = false) OR (earning_rule_id IS NOT NULL))),
    CONSTRAINT streams_ap_budget_spent_check CHECK ((ap_budget_spent >= 0)),
    CONSTRAINT streams_ap_budget_total_check CHECK ((ap_budget_total >= 0)),
    CONSTRAINT streams_duration_seconds_check CHECK ((duration_seconds > 0)),
    CONSTRAINT streams_peak_viewers_check CHECK ((peak_viewers >= 0)),
    CONSTRAINT streams_unique_viewers_check CHECK ((unique_viewers >= 0)),
    CONSTRAINT streams_view_count_check CHECK ((view_count >= 0))
);


--
-- Name: subscription_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id uuid NOT NULL,
    subscriber_type public.subscriber_owner_type NOT NULL,
    team_id uuid,
    player_id uuid,
    amount_thb numeric(10,2),
    amount_ap bigint,
    currency text NOT NULL,
    status public.invoice_status_type DEFAULT 'PENDING'::public.invoice_status_type NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:30:00'::interval) NOT NULL,
    paid_at timestamp with time zone,
    idempotency_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_invoice_owner CHECK ((((subscriber_type = 'TEAM'::public.subscriber_owner_type) AND (team_id IS NOT NULL)) OR ((subscriber_type = 'PLAYER'::public.subscriber_owner_type) AND (player_id IS NOT NULL)))),
    CONSTRAINT subscription_invoices_currency_check CHECK ((currency = ANY (ARRAY['THB'::text, 'AP'::text])))
);


--
-- Name: COLUMN subscription_invoices.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_invoices.expires_at IS 'PENDING หมดอายุใน 30 นาที — pg_cron sweep ทุก 10 นาที';


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscriber_type public.subscriber_owner_type DEFAULT 'TEAM'::public.subscriber_owner_type NOT NULL,
    team_id uuid,
    player_id uuid,
    plan_code text NOT NULL,
    current_status public.subscription_status_type DEFAULT 'ACTIVE'::public.subscription_status_type NOT NULL,
    valid_until timestamp with time zone NOT NULL,
    grace_until timestamp with time zone,
    auto_renew_with_ap boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_grace_period CHECK (((grace_until IS NULL) OR (grace_until > valid_until))),
    CONSTRAINT chk_subscriber_target CHECK ((((subscriber_type = 'TEAM'::public.subscriber_owner_type) AND (team_id IS NOT NULL) AND (player_id IS NULL)) OR ((subscriber_type = 'PLAYER'::public.subscriber_owner_type) AND (player_id IS NOT NULL) AND (team_id IS NULL)))),
    CONSTRAINT subscriptions_plan_code_check CHECK ((plan_code = ANY (ARRAY['PRO_CLUB'::text, 'VIP_CLUB'::text, 'ATHLETE_PASS'::text])))
);


--
-- Name: TABLE subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.subscriptions IS 'Pro/VIP Club subscriptions — สนับสนุนทั้ง PLAYER และ TEAM level';


--
-- Name: COLUMN subscriptions.grace_until; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscriptions.grace_until IS 'Grace Period 3 วันหลัง valid_until — สิทธิ์ Read-Only ระหว่าง grace';


--
-- Name: system_burn_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_burn_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_module text NOT NULL,
    burned_ap_amount bigint NOT NULL,
    reference_id uuid,
    burned_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT system_burn_ledger_burned_ap_amount_check CHECK ((burned_ap_amount > 0))
);


--
-- Name: TABLE system_burn_ledger; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_burn_ledger IS 'Append-only AP burn record — House Fee + Jackpot carry เข้าที่นี่';


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    player_id uuid NOT NULL,
    role public.team_role_type DEFAULT 'PLAYER'::public.team_role_type NOT NULL,
    jersey_number smallint,
    status public.membership_status_type DEFAULT 'INVITED'::public.membership_status_type NOT NULL,
    joined_at timestamp with time zone,
    left_at timestamp with time zone,
    invited_by uuid,
    invited_at timestamp with time zone,
    responded_at timestamp with time zone,
    removal_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_left_after_joined CHECK (((left_at IS NULL) OR (joined_at IS NULL) OR (left_at >= joined_at))),
    CONSTRAINT team_members_jersey_number_check CHECK (((jersey_number >= 0) AND (jersey_number <= 99)))
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    organization_id uuid,
    name character varying(100) NOT NULL,
    slug character varying(60) NOT NULL,
    tag character varying(10) NOT NULL,
    logo_url text,
    brand_colors jsonb DEFAULT '{}'::jsonb,
    description text,
    country_code character(2),
    captain_id uuid,
    is_locked boolean DEFAULT false NOT NULL,
    locked_until timestamp with time zone,
    total_zp bigint DEFAULT 0 NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    is_roster_locked boolean DEFAULT false,
    CONSTRAINT teams_losses_check CHECK ((losses >= 0)),
    CONSTRAINT teams_total_zp_check CHECK ((total_zp >= 0)),
    CONSTRAINT teams_wins_check CHECK ((wins >= 0))
);


--
-- Name: tournament_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournament_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id uuid NOT NULL,
    team_id uuid NOT NULL,
    roster_snapshot_id uuid,
    status text DEFAULT 'PENDING'::text NOT NULL,
    ap_deducted integer,
    idempotency_key uuid NOT NULL,
    registered_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tournament_registrations_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'ELIGIBLE'::text, 'APPROVED'::text, 'REJECTED'::text])))
);


--
-- Name: tournament_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournament_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id uuid NOT NULL,
    name text NOT NULL,
    stage_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    format public.stage_format_type NOT NULL,
    status public.stage_status_type DEFAULT 'PENDING'::public.stage_status_type NOT NULL,
    teams_in integer,
    teams_advancing integer,
    format_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    best_of_config jsonb DEFAULT '{"default": 1}'::jsonb NOT NULL,
    map_pool text[],
    veto_format jsonb DEFAULT '{}'::jsonb,
    start_at timestamp with time zone,
    end_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_advancing CHECK (((teams_advancing IS NULL) OR (teams_in IS NULL) OR (teams_advancing <= teams_in))),
    CONSTRAINT tournament_stages_teams_advancing_check CHECK ((teams_advancing > 0)),
    CONSTRAINT tournament_stages_teams_in_check CHECK ((teams_in > 0))
);


--
-- Name: tournaments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournaments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season_id uuid NOT NULL,
    name text NOT NULL,
    format text NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    max_teams integer DEFAULT 8 NOT NULL,
    entry_fee_ap integer DEFAULT 50 NOT NULL,
    prize_zp integer DEFAULT 1000 NOT NULL,
    registration_opens_at timestamp with time zone,
    registration_closes_at timestamp with time zone,
    starts_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tournaments_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'OPEN'::text, 'ONGOING'::text, 'CONCLUDED'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    role public.user_role_type NOT NULL,
    scope_type character varying(30),
    scope_id uuid,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    revoke_reason text,
    CONSTRAINT chk_scope CHECK ((((scope_type IS NULL) AND (scope_id IS NULL)) OR ((scope_type IS NOT NULL) AND (scope_id IS NOT NULL))))
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    team_id uuid,
    shop_name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    concurrent_slot_limit smallint DEFAULT 10 NOT NULL,
    monthly_listing_count smallint DEFAULT 0 NOT NULL,
    monthly_reset_at timestamp with time zone DEFAULT (date_trunc('month'::text, now()) + '1 mon'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_monthly_cap CHECK ((monthly_listing_count >= 0))
);


--
-- Name: COLUMN vendors.monthly_listing_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.monthly_listing_count IS 'Free Tier cap: 30 creations/month — SOLD ไม่รีเซ็ต, Paid Shelf ไม่มีลิมิต';


--
-- Name: COLUMN vendors.monthly_reset_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.monthly_reset_at IS 'รีเซ็ต monthly_listing_count ทุกต้นเดือนปฏิทิน';


--
-- Name: watch_heartbeats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.watch_heartbeats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    position_sec numeric(10,2) NOT NULL,
    playback_rate numeric(4,2) DEFAULT 1 NOT NULL,
    delta_sec numeric(10,2) NOT NULL,
    watched_seconds numeric(10,2) NOT NULL,
    is_anomalous boolean DEFAULT false NOT NULL,
    anomaly_reason text,
    risk_score_delta numeric(5,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cap_reached_at timestamp with time zone
);


--
-- Name: COLUMN watch_heartbeats.cap_reached_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.watch_heartbeats.cap_reached_at IS 'Q4: timestamp ที่ player ชน 100 AP cap — ส่งกลับเป็น next_reset_at ให้ client clearInterval';


--
-- Name: watch_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.watch_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stream_id uuid NOT NULL,
    player_id uuid NOT NULL,
    earning_rule_id uuid,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    last_heartbeat_at timestamp with time zone,
    position_sec numeric(10,2) DEFAULT 0 NOT NULL,
    watched_seconds numeric(10,2) DEFAULT 0 NOT NULL,
    risk_score numeric(5,2) DEFAULT 0 NOT NULL,
    is_anomalous boolean DEFAULT false NOT NULL,
    anomaly_note text,
    claimed_at timestamp with time zone,
    ap_awarded numeric(10,2),
    start_idempotency_key text,
    device_id text,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT watch_sessions_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'CLAIMED'::text, 'EXPIRED'::text, 'ABANDONED'::text])))
);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: match_state_transitions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_state_transitions ALTER COLUMN id SET DEFAULT nextval('public.match_state_transitions_id_seq'::regclass);


--
-- Name: abuse_flags abuse_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abuse_flags
    ADD CONSTRAINT abuse_flags_pkey PRIMARY KEY (id);


--
-- Name: affiliate_codes affiliate_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_codes
    ADD CONSTRAINT affiliate_codes_code_key UNIQUE (code);


--
-- Name: affiliate_codes affiliate_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_codes
    ADD CONSTRAINT affiliate_codes_pkey PRIMARY KEY (id);


--
-- Name: affiliate_codes affiliate_codes_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_codes
    ADD CONSTRAINT affiliate_codes_player_id_key UNIQUE (player_id);


--
-- Name: affiliate_referrals affiliate_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_referrals
    ADD CONSTRAINT affiliate_referrals_pkey PRIMARY KEY (id);


--
-- Name: affiliate_referrals affiliate_referrals_referee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_referrals
    ADD CONSTRAINT affiliate_referrals_referee_id_key UNIQUE (referee_id);


--
-- Name: affiliate_rewards_ledger affiliate_rewards_ledger_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_rewards_ledger
    ADD CONSTRAINT affiliate_rewards_ledger_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: affiliate_rewards_ledger affiliate_rewards_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_rewards_ledger
    ADD CONSTRAINT affiliate_rewards_ledger_pkey PRIMARY KEY (id);


--
-- Name: ap_daily_limits ap_daily_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_daily_limits
    ADD CONSTRAINT ap_daily_limits_pkey PRIMARY KEY (id);


--
-- Name: ap_earning_rules ap_earning_rules_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_earning_rules
    ADD CONSTRAINT ap_earning_rules_code_key UNIQUE (code);


--
-- Name: ap_earning_rules ap_earning_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_earning_rules
    ADD CONSTRAINT ap_earning_rules_pkey PRIMARY KEY (id);


--
-- Name: ap_escrow ap_escrow_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_escrow
    ADD CONSTRAINT ap_escrow_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: ap_escrow ap_escrow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_escrow
    ADD CONSTRAINT ap_escrow_pkey PRIMARY KEY (id);


--
-- Name: ap_ledger ap_ledger_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_ledger
    ADD CONSTRAINT ap_ledger_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: ap_ledger ap_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_ledger
    ADD CONSTRAINT ap_ledger_pkey PRIMARY KEY (id);


--
-- Name: athlete_market_bids athlete_market_bids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_market_bids
    ADD CONSTRAINT athlete_market_bids_pkey PRIMARY KEY (id);


--
-- Name: athlete_market_listings athlete_market_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_market_listings
    ADD CONSTRAINT athlete_market_listings_pkey PRIMARY KEY (id);


--
-- Name: athlete_transfer_history athlete_transfer_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_transfer_history
    ADD CONSTRAINT athlete_transfer_history_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bracket_nodes bracket_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bracket_nodes
    ADD CONSTRAINT bracket_nodes_pkey PRIMARY KEY (id);


--
-- Name: brand_themes brand_themes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_themes
    ADD CONSTRAINT brand_themes_code_key UNIQUE (code);


--
-- Name: brand_themes brand_themes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_themes
    ADD CONSTRAINT brand_themes_pkey PRIMARY KEY (id);


--
-- Name: season_jackpot_pools chk_one_jackpot_per_season; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_jackpot_pools
    ADD CONSTRAINT chk_one_jackpot_per_season UNIQUE (season_id);


--
-- Name: prediction_pools chk_one_pool_per_match; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prediction_pools
    ADD CONSTRAINT chk_one_pool_per_match UNIQUE (match_id);


--
-- Name: prediction_tickets chk_one_ticket_per_player_per_pool; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prediction_tickets
    ADD CONSTRAINT chk_one_ticket_per_player_per_pool UNIQUE (pool_id, player_id);


--
-- Name: circuit_standings circuit_standings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circuit_standings
    ADD CONSTRAINT circuit_standings_pkey PRIMARY KEY (id);


--
-- Name: circuits circuits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circuits
    ADD CONSTRAINT circuits_pkey PRIMARY KEY (id);


--
-- Name: crypto_payments crypto_payments_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crypto_payments
    ADD CONSTRAINT crypto_payments_payment_intent_id_key UNIQUE (payment_intent_id);


--
-- Name: crypto_payments crypto_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crypto_payments
    ADD CONSTRAINT crypto_payments_pkey PRIMARY KEY (id);


--
-- Name: crypto_payments crypto_payments_tx_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crypto_payments
    ADD CONSTRAINT crypto_payments_tx_hash_key UNIQUE (tx_hash);


--
-- Name: daily_quests daily_quests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_quests
    ADD CONSTRAINT daily_quests_pkey PRIMARY KEY (id);


--
-- Name: disputes disputes_dispute_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_dispute_number_key UNIQUE (dispute_number);


--
-- Name: disputes disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_pkey PRIMARY KEY (id);


--
-- Name: game_accounts game_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_accounts
    ADD CONSTRAINT game_accounts_pkey PRIMARY KEY (id);


--
-- Name: games games_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_code_key UNIQUE (code);


--
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- Name: map_vetoes map_vetoes_match_id_step_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_vetoes
    ADD CONSTRAINT map_vetoes_match_id_step_order_key UNIQUE (match_id, step_order);


--
-- Name: map_vetoes map_vetoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_vetoes
    ADD CONSTRAINT map_vetoes_pkey PRIMARY KEY (id);


--
-- Name: marketplace_listings marketplace_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_listings
    ADD CONSTRAINT marketplace_listings_pkey PRIMARY KEY (id);


--
-- Name: marketplace_trade_history marketplace_trade_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_trade_history
    ADD CONSTRAINT marketplace_trade_history_pkey PRIMARY KEY (id);


--
-- Name: match_decisions match_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_decisions
    ADD CONSTRAINT match_decisions_pkey PRIMARY KEY (id);


--
-- Name: match_games match_games_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_games
    ADD CONSTRAINT match_games_pkey PRIMARY KEY (id);


--
-- Name: match_lobby_messages match_lobby_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_lobby_messages
    ADD CONSTRAINT match_lobby_messages_pkey PRIMARY KEY (id);


--
-- Name: match_participant_hit_stats match_participant_hit_stats_match_participant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participant_hit_stats
    ADD CONSTRAINT match_participant_hit_stats_match_participant_id_key UNIQUE (match_participant_id);


--
-- Name: match_participant_hit_stats match_participant_hit_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participant_hit_stats
    ADD CONSTRAINT match_participant_hit_stats_pkey PRIMARY KEY (id);


--
-- Name: match_participant_weapons match_participant_weapons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participant_weapons
    ADD CONSTRAINT match_participant_weapons_pkey PRIMARY KEY (id);


--
-- Name: match_participants match_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_pkey PRIMARY KEY (id);


--
-- Name: match_replays match_replays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_replays
    ADD CONSTRAINT match_replays_pkey PRIMARY KEY (id);


--
-- Name: match_reports match_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_reports
    ADD CONSTRAINT match_reports_pkey PRIMARY KEY (id);


--
-- Name: match_room_messages match_room_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_room_messages
    ADD CONSTRAINT match_room_messages_pkey PRIMARY KEY (id);


--
-- Name: match_room_participants match_room_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_room_participants
    ADD CONSTRAINT match_room_participants_pkey PRIMARY KEY (id);


--
-- Name: match_room_staff match_room_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_room_staff
    ADD CONSTRAINT match_room_staff_pkey PRIMARY KEY (id);


--
-- Name: match_rooms match_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_rooms
    ADD CONSTRAINT match_rooms_pkey PRIMARY KEY (id);


--
-- Name: match_rounds match_rounds_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_rounds
    ADD CONSTRAINT match_rounds_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: match_rounds match_rounds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_rounds
    ADD CONSTRAINT match_rounds_pkey PRIMARY KEY (id);


--
-- Name: match_state_transitions match_state_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_state_transitions
    ADD CONSTRAINT match_state_transitions_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: mercy_fill_tickets mercy_fill_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mercy_fill_tickets
    ADD CONSTRAINT mercy_fill_tickets_pkey PRIMARY KEY (id);


--
-- Name: mercy_sub_pool mercy_sub_pool_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mercy_sub_pool
    ADD CONSTRAINT mercy_sub_pool_pkey PRIMARY KEY (id);


--
-- Name: mercy_sub_pool mercy_sub_pool_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mercy_sub_pool
    ADD CONSTRAINT mercy_sub_pool_player_id_key UNIQUE (player_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: organizations organizations_tag_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_tag_key UNIQUE (tag);


--
-- Name: p2p_transfer_otp_challenges p2p_transfer_otp_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.p2p_transfer_otp_challenges
    ADD CONSTRAINT p2p_transfer_otp_challenges_pkey PRIMARY KEY (sender_id);


--
-- Name: p2p_transfer_used_tokens p2p_transfer_used_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.p2p_transfer_used_tokens
    ADD CONSTRAINT p2p_transfer_used_tokens_pkey PRIMARY KEY (jti);


--
-- Name: partner_coupon_redemptions partner_coupon_redemptions_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_coupon_redemptions
    ADD CONSTRAINT partner_coupon_redemptions_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: partner_coupon_redemptions partner_coupon_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_coupon_redemptions
    ADD CONSTRAINT partner_coupon_redemptions_pkey PRIMARY KEY (id);


--
-- Name: partner_coupons partner_coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_coupons
    ADD CONSTRAINT partner_coupons_code_key UNIQUE (code);


--
-- Name: partner_coupons partner_coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_coupons
    ADD CONSTRAINT partner_coupons_pkey PRIMARY KEY (id);


--
-- Name: payment_intents payment_intents_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT payment_intents_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: payment_intents payment_intents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT payment_intents_pkey PRIMARY KEY (id);


--
-- Name: perk_redemptions perk_redemptions_perk_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perk_redemptions
    ADD CONSTRAINT perk_redemptions_perk_token_key UNIQUE (perk_token);


--
-- Name: perk_redemptions perk_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perk_redemptions
    ADD CONSTRAINT perk_redemptions_pkey PRIMARY KEY (id);


--
-- Name: player_daily_quests player_daily_quests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_daily_quests
    ADD CONSTRAINT player_daily_quests_pkey PRIMARY KEY (id);


--
-- Name: player_inventory player_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_inventory
    ADD CONSTRAINT player_inventory_pkey PRIMARY KEY (id);


--
-- Name: player_stats player_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_pkey PRIMARY KEY (id);


--
-- Name: players players_athlete_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_athlete_id_key UNIQUE (athlete_id);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: players players_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_slug_key UNIQUE (slug);


--
-- Name: players players_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_user_id_key UNIQUE (user_id);


--
-- Name: prediction_pools prediction_pools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prediction_pools
    ADD CONSTRAINT prediction_pools_pkey PRIMARY KEY (id);


--
-- Name: prediction_tickets prediction_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prediction_tickets
    ADD CONSTRAINT prediction_tickets_pkey PRIMARY KEY (id);


--
-- Name: prize_payouts prize_payouts_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prize_payouts
    ADD CONSTRAINT prize_payouts_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: prize_payouts prize_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prize_payouts
    ADD CONSTRAINT prize_payouts_pkey PRIMARY KEY (id);


--
-- Name: refunds refunds_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: refunds refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);


--
-- Name: roster_snapshot_members roster_snapshot_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roster_snapshot_members
    ADD CONSTRAINT roster_snapshot_members_pkey PRIMARY KEY (id);


--
-- Name: roster_snapshots roster_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roster_snapshots
    ADD CONSTRAINT roster_snapshots_pkey PRIMARY KEY (id);


--
-- Name: season_jackpot_pools season_jackpot_pools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_jackpot_pools
    ADD CONSTRAINT season_jackpot_pools_pkey PRIMARY KEY (id);


--
-- Name: season_standings season_standings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_standings
    ADD CONSTRAINT season_standings_pkey PRIMARY KEY (id);


--
-- Name: season_standings season_standings_season_id_team_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_standings
    ADD CONSTRAINT season_standings_season_id_team_id_key UNIQUE (season_id, team_id);


--
-- Name: seasons seasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_pkey PRIMARY KEY (id);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- Name: shipping_addresses shipping_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_addresses
    ADD CONSTRAINT shipping_addresses_pkey PRIMARY KEY (id);


--
-- Name: sponsor_banners sponsor_banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsor_banners
    ADD CONSTRAINT sponsor_banners_pkey PRIMARY KEY (id);


--
-- Name: sponsor_perks sponsor_perks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsor_perks
    ADD CONSTRAINT sponsor_perks_pkey PRIMARY KEY (id);


--
-- Name: sponsors sponsors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_pkey PRIMARY KEY (id);


--
-- Name: store_categories store_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_categories
    ADD CONSTRAINT store_categories_pkey PRIMARY KEY (id);


--
-- Name: store_categories store_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_categories
    ADD CONSTRAINT store_categories_slug_key UNIQUE (slug);


--
-- Name: store_item_variants store_item_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_item_variants
    ADD CONSTRAINT store_item_variants_pkey PRIMARY KEY (id);


--
-- Name: store_items store_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_items
    ADD CONSTRAINT store_items_pkey PRIMARY KEY (id);


--
-- Name: stream_sessions stream_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_sessions
    ADD CONSTRAINT stream_sessions_pkey PRIMARY KEY (id);


--
-- Name: stream_sessions stream_sessions_session_uid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_sessions
    ADD CONSTRAINT stream_sessions_session_uid_key UNIQUE (session_uid);


--
-- Name: streams streams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_pkey PRIMARY KEY (id);


--
-- Name: streams streams_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_slug_key UNIQUE (slug);


--
-- Name: subscription_invoices subscription_invoices_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoices
    ADD CONSTRAINT subscription_invoices_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: subscription_invoices subscription_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoices
    ADD CONSTRAINT subscription_invoices_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: system_burn_ledger system_burn_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_burn_ledger
    ADD CONSTRAINT system_burn_ledger_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: teams teams_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_slug_key UNIQUE (slug);


--
-- Name: tournament_registrations tournament_registrations_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: tournament_registrations tournament_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_pkey PRIMARY KEY (id);


--
-- Name: tournament_registrations tournament_registrations_tournament_id_team_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_tournament_id_team_id_key UNIQUE (tournament_id, team_id);


--
-- Name: tournament_stages tournament_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_stages
    ADD CONSTRAINT tournament_stages_pkey PRIMARY KEY (id);


--
-- Name: tournaments tournaments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_pkey PRIMARY KEY (id);


--
-- Name: athlete_market_listings uq_active_target_player; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_market_listings
    ADD CONSTRAINT uq_active_target_player UNIQUE (target_player_id, status) DEFERRABLE;


--
-- Name: bracket_nodes uq_bracket_position; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bracket_nodes
    ADD CONSTRAINT uq_bracket_position UNIQUE (stage_id, bracket_type, round_number, position_in_round);


--
-- Name: circuit_standings uq_circuit_standing; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circuit_standings
    ADD CONSTRAINT uq_circuit_standing UNIQUE (circuit_id, team_id);


--
-- Name: game_accounts uq_game_account; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_accounts
    ADD CONSTRAINT uq_game_account UNIQUE (game_id, external_id);


--
-- Name: game_accounts uq_game_name_tag_region_per_game; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_accounts
    ADD CONSTRAINT uq_game_name_tag_region_per_game UNIQUE (game_id, game_name, tag_line, region);


--
-- Name: match_games uq_match_game; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_games
    ADD CONSTRAINT uq_match_game UNIQUE (match_id, game_number);


--
-- Name: match_rounds uq_match_game_round; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_rounds
    ADD CONSTRAINT uq_match_game_round UNIQUE (match_id, game_number, round_number);


--
-- Name: match_reports uq_match_report_per_team; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_reports
    ADD CONSTRAINT uq_match_report_per_team UNIQUE (match_id, reported_by_team);


--
-- Name: match_participants uq_participant; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT uq_participant UNIQUE (match_game_id, player_id);


--
-- Name: match_participant_weapons uq_participant_weapon; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participant_weapons
    ADD CONSTRAINT uq_participant_weapon UNIQUE (match_participant_id, weapon_name);


--
-- Name: player_inventory uq_player_inventory_variant; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_inventory
    ADD CONSTRAINT uq_player_inventory_variant UNIQUE (player_id, variant_id);


--
-- Name: player_daily_quests uq_player_quest_date; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_daily_quests
    ADD CONSTRAINT uq_player_quest_date UNIQUE (player_id, quest_id, quest_date);


--
-- Name: match_room_participants uq_room_player; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_room_participants
    ADD CONSTRAINT uq_room_player UNIQUE (room_id, player_id);


--
-- Name: match_room_staff uq_room_staff; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_room_staff
    ADD CONSTRAINT uq_room_staff UNIQUE (room_id, staff_player_id);


--
-- Name: tournament_stages uq_stage_order; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_stages
    ADD CONSTRAINT uq_stage_order UNIQUE (tournament_id, stage_order);


--
-- Name: teams uq_team_tag_per_game; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT uq_team_tag_per_game UNIQUE (game_id, tag);


--
-- Name: map_vetoes uq_veto_map; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_vetoes
    ADD CONSTRAINT uq_veto_map UNIQUE (match_id, map_name);


--
-- Name: map_vetoes uq_veto_step; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_vetoes
    ADD CONSTRAINT uq_veto_step UNIQUE (match_id, step_order);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: watch_heartbeats watch_heartbeats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_heartbeats
    ADD CONSTRAINT watch_heartbeats_pkey PRIMARY KEY (id);


--
-- Name: watch_sessions watch_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_sessions
    ADD CONSTRAINT watch_sessions_pkey PRIMARY KEY (id);


--
-- Name: idx_abuse_flags_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abuse_flags_player ON public.abuse_flags USING btree (player_id);


--
-- Name: idx_abuse_flags_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abuse_flags_status ON public.abuse_flags USING btree (status);


--
-- Name: idx_affiliate_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_affiliate_codes_code ON public.affiliate_codes USING btree (code);


--
-- Name: idx_affiliate_referrals_referee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_affiliate_referrals_referee ON public.affiliate_referrals USING btree (referee_id);


--
-- Name: idx_affiliate_referrals_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_affiliate_referrals_referrer ON public.affiliate_referrals USING btree (referrer_id, status);


--
-- Name: idx_affiliate_rewards_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_affiliate_rewards_referrer ON public.affiliate_rewards_ledger USING btree (referrer_id, created_at DESC);


--
-- Name: idx_ap_ledger_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ap_ledger_player ON public.ap_ledger USING btree (player_id, created_at DESC);


--
-- Name: idx_athlete_bids_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_athlete_bids_lookup ON public.athlete_market_bids USING btree (listing_id, bid_amount_ap DESC, created_at);


--
-- Name: idx_athlete_listings_active_exp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_athlete_listings_active_exp ON public.athlete_market_listings USING btree (status, expires_at) WHERE (status = 'ACTIVE'::public.athlete_listing_status);


--
-- Name: idx_athlete_listings_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_athlete_listings_target ON public.athlete_market_listings USING btree (target_player_id);


--
-- Name: idx_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_action ON public.audit_logs USING btree (action, created_at DESC);


--
-- Name: idx_audit_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_actor ON public.audit_logs USING btree (actor_id, created_at DESC);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_entity ON public.audit_logs USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: idx_audit_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_request ON public.audit_logs USING btree (request_id);


--
-- Name: idx_bracket_loser_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bracket_loser_to ON public.bracket_nodes USING btree (loser_to_node_id);


--
-- Name: idx_bracket_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bracket_stage ON public.bracket_nodes USING btree (stage_id, bracket_type, round_number);


--
-- Name: idx_bracket_winner_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bracket_winner_to ON public.bracket_nodes USING btree (winner_to_node_id);


--
-- Name: idx_brand_themes_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_themes_active ON public.brand_themes USING btree (priority DESC, active_from DESC) WHERE (is_active = true);


--
-- Name: idx_brand_themes_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_themes_scope ON public.brand_themes USING btree (scope_type, scope_id) WHERE (is_active = true);


--
-- Name: idx_burn_ledger_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_burn_ledger_module ON public.system_burn_ledger USING btree (source_module);


--
-- Name: idx_burn_ledger_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_burn_ledger_reference ON public.system_burn_ledger USING btree (reference_id) WHERE (reference_id IS NOT NULL);


--
-- Name: idx_circuit_standings_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_circuit_standings_rank ON public.circuit_standings USING btree (circuit_id, counted_zp DESC, rank);


--
-- Name: idx_coupon_redemptions_player_coupon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupon_redemptions_player_coupon ON public.partner_coupon_redemptions USING btree (player_id, coupon_id);


--
-- Name: idx_crypto_payments_tx_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crypto_payments_tx_hash ON public.crypto_payments USING btree (tx_hash);


--
-- Name: idx_disputes_filed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_disputes_filed_by ON public.disputes USING btree (filed_by);


--
-- Name: idx_disputes_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_disputes_match_id ON public.disputes USING btree (match_id);


--
-- Name: idx_disputes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_disputes_status ON public.disputes USING btree (status);


--
-- Name: idx_earning_rules_active_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_earning_rules_active_lookup ON public.ap_earning_rules USING btree (is_active, stream_type) WHERE (is_active = true);


--
-- Name: idx_escrow_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_escrow_pending ON public.ap_escrow USING btree (status, approval_deadline) WHERE (status = 'PENDING'::public.escrow_status_type);


--
-- Name: idx_escrow_receiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_escrow_receiver ON public.ap_escrow USING btree (receiver_id);


--
-- Name: idx_escrow_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_escrow_sender ON public.ap_escrow USING btree (sender_id);


--
-- Name: idx_game_accounts_pending_verifications; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_game_accounts_pending_verifications ON public.game_accounts USING btree (created_at) WHERE (verification_status = 'PENDING'::public.verification_status_type);


--
-- Name: idx_game_accounts_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_game_accounts_player ON public.game_accounts USING btree (player_id);


--
-- Name: idx_game_accounts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_game_accounts_status ON public.game_accounts USING btree (verification_status);


--
-- Name: idx_game_accounts_sync; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_game_accounts_sync ON public.game_accounts USING btree (last_synced_at NULLS FIRST);


--
-- Name: idx_invoices_status_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_status_expires ON public.subscription_invoices USING btree (status, expires_at) WHERE (status = 'PENDING'::public.invoice_status_type);


--
-- Name: idx_invoices_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_subscription_id ON public.subscription_invoices USING btree (subscription_id);


--
-- Name: idx_jackpot_pools_season_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jackpot_pools_season_id ON public.season_jackpot_pools USING btree (season_id);


--
-- Name: idx_jackpot_pools_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jackpot_pools_status ON public.season_jackpot_pools USING btree (status);


--
-- Name: idx_listings_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_active ON public.marketplace_listings USING btree (status) WHERE (status = 'ACTIVE'::public.listing_status_type);


--
-- Name: idx_listings_auction_ends; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_auction_ends ON public.marketplace_listings USING btree (auction_ends_at) WHERE (auction_ends_at IS NOT NULL);


--
-- Name: idx_listings_overdue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_overdue ON public.marketplace_listings USING btree (shelf_billing_cycle_end) WHERE ((status = 'ACTIVE'::public.listing_status_type) AND (is_paid_slot = true));


--
-- Name: idx_listings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_status ON public.marketplace_listings USING btree (status);


--
-- Name: idx_listings_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_vendor_id ON public.marketplace_listings USING btree (vendor_id);


--
-- Name: idx_lobby_messages_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lobby_messages_match ON public.match_lobby_messages USING btree (match_id, created_at DESC);


--
-- Name: idx_map_vetoes_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_map_vetoes_match ON public.map_vetoes USING btree (match_id, step_order);


--
-- Name: idx_match_decisions_decided_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_decisions_decided_by ON public.match_decisions USING btree (decided_by);


--
-- Name: idx_match_decisions_dispute_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_decisions_dispute_id ON public.match_decisions USING btree (dispute_id);


--
-- Name: idx_match_decisions_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_decisions_match_id ON public.match_decisions USING btree (match_id);


--
-- Name: idx_match_games_ext; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_games_ext ON public.match_games USING btree (external_game_id) WHERE (external_game_id IS NOT NULL);


--
-- Name: idx_match_games_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_games_match ON public.match_games USING btree (match_id, game_number);


--
-- Name: idx_match_participants_game; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_participants_game ON public.match_participants USING btree (match_game_id);


--
-- Name: idx_match_participants_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_participants_player ON public.match_participants USING btree (player_id);


--
-- Name: idx_match_replays_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_replays_match ON public.match_replays USING btree (match_id, created_at DESC);


--
-- Name: idx_match_replays_official; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_replays_official ON public.match_replays USING btree (match_id, is_official) WHERE (is_official = true);


--
-- Name: idx_match_replays_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_replays_player ON public.match_replays USING btree (player_id, created_at DESC) WHERE (player_id IS NOT NULL);


--
-- Name: idx_match_replays_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_replays_tags ON public.match_replays USING gin (tags);


--
-- Name: idx_match_reports_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_reports_lookup ON public.match_reports USING btree (match_id, reported_by_team);


--
-- Name: idx_match_room_messages_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_room_messages_room ON public.match_room_messages USING btree (room_id, created_at DESC);


--
-- Name: idx_match_room_part_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_room_part_lookup ON public.match_room_participants USING btree (room_id, team_side);


--
-- Name: idx_match_rooms_status_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_rooms_status_time ON public.match_rooms USING btree (status, scheduled_at);


--
-- Name: idx_match_rounds_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_rounds_lookup ON public.match_rounds USING btree (match_id, game_number, round_number);


--
-- Name: idx_match_rounds_match_game; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_rounds_match_game ON public.match_rounds USING btree (match_id, game_number, round_number);


--
-- Name: idx_matches_bracket_node; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_bracket_node ON public.matches USING btree (bracket_node_id) WHERE (bracket_node_id IS NOT NULL);


--
-- Name: idx_matches_checkin_monitoring; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_checkin_monitoring ON public.matches USING btree (status, forfeit_deadline_at) WHERE (status = ANY (ARRAY['SCHEDULED'::public.match_status_type, 'READY_CHECK'::public.match_status_type]));


--
-- Name: idx_matches_schedule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_schedule ON public.matches USING btree (scheduled_at) WHERE (status = ANY (ARRAY['SCHEDULED'::public.match_status_type, 'READY_CHECK'::public.match_status_type]));


--
-- Name: idx_matches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_status ON public.matches USING btree (status);


--
-- Name: idx_matches_tournament; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_tournament ON public.matches USING btree (tournament_id, scheduled_at);


--
-- Name: idx_mercy_fill_tickets_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mercy_fill_tickets_room ON public.mercy_fill_tickets USING btree (room_id, status);


--
-- Name: idx_mercy_sub_pool_oncall; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mercy_sub_pool_oncall ON public.mercy_sub_pool USING btree (is_on_call, preferred_role);


--
-- Name: idx_mph_stats_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mph_stats_lookup ON public.match_participant_hit_stats USING btree (match_participant_id);


--
-- Name: idx_mpw_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mpw_lookup ON public.match_participant_weapons USING btree (match_participant_id);


--
-- Name: idx_mst_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mst_match ON public.match_state_transitions USING btree (match_id, created_at);


--
-- Name: idx_notif_player_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_player_unread ON public.notifications USING btree (player_id, created_at DESC) WHERE (is_read = false);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_variant ON public.order_items USING btree (variant_id);


--
-- Name: idx_orders_expiry_sweep; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_expiry_sweep ON public.orders USING btree (status, expires_at) WHERE ((status)::text = 'PENDING'::text);


--
-- Name: idx_orders_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_player ON public.orders USING btree (player_id, created_at DESC);


--
-- Name: idx_orgs_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orgs_owner ON public.organizations USING btree (owner_id);


--
-- Name: idx_orgs_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orgs_slug ON public.organizations USING btree (slug);


--
-- Name: idx_p2p_used_tokens_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_p2p_used_tokens_sender ON public.p2p_transfer_used_tokens USING btree (sender_id);


--
-- Name: idx_participants_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_match ON public.match_participants USING btree (match_id);


--
-- Name: idx_participants_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_player ON public.match_participants USING btree (player_id, created_at DESC);


--
-- Name: idx_participants_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_team ON public.match_participants USING btree (team_id);


--
-- Name: idx_partner_coupons_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_coupons_code ON public.partner_coupons USING btree (code, is_active, expires_at);


--
-- Name: idx_partner_coupons_sponsor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_coupons_sponsor ON public.partner_coupons USING btree (sponsor_id);


--
-- Name: idx_payment_intents_expiry_sweep; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_intents_expiry_sweep ON public.payment_intents USING btree (status, expires_at) WHERE (status = 'PENDING'::text);


--
-- Name: idx_payment_intents_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_intents_player ON public.payment_intents USING btree (player_id, created_at DESC);


--
-- Name: idx_payment_intents_provider_intent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_intents_provider_intent ON public.payment_intents USING btree (provider_intent_id);


--
-- Name: idx_perk_redemptions_perk_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_perk_redemptions_perk_id ON public.perk_redemptions USING btree (perk_id);


--
-- Name: idx_perk_redemptions_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_perk_redemptions_player ON public.perk_redemptions USING btree (redeemed_by_player_id);


--
-- Name: idx_perk_token_unredeemed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_perk_token_unredeemed ON public.perk_redemptions USING btree (perk_token) WHERE (is_redeemed = false);


--
-- Name: idx_player_daily_quests_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_daily_quests_lookup ON public.player_daily_quests USING btree (player_id, quest_date);


--
-- Name: idx_player_inventory_equipment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_inventory_equipment ON public.player_inventory USING btree (player_id, item_type) WHERE (is_equipped = true);


--
-- Name: idx_player_stats_leaderboard; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_stats_leaderboard ON public.player_stats USING btree (game_id, season_id, avg_acs DESC NULLS LAST);


--
-- Name: idx_player_stats_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_stats_player ON public.player_stats USING btree (player_id);


--
-- Name: idx_players_athlete_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_athlete_id ON public.players USING btree (athlete_id);


--
-- Name: idx_players_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_country ON public.players USING btree (country_code);


--
-- Name: idx_players_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_slug ON public.players USING btree (slug) WHERE (slug IS NOT NULL);


--
-- Name: idx_players_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_status ON public.players USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: idx_prediction_pools_error; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prediction_pools_error ON public.prediction_pools USING btree (status) WHERE (status = 'SETTLEMENT_ERROR'::public.prediction_pool_status_type);


--
-- Name: idx_prediction_pools_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prediction_pools_match_id ON public.prediction_pools USING btree (match_id);


--
-- Name: idx_prediction_pools_open; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prediction_pools_open ON public.prediction_pools USING btree (status) WHERE (status = 'OPEN'::public.prediction_pool_status_type);


--
-- Name: idx_prediction_pools_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prediction_pools_status ON public.prediction_pools USING btree (status);


--
-- Name: idx_prediction_tickets_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prediction_tickets_player ON public.prediction_tickets USING btree (player_id);


--
-- Name: idx_prediction_tickets_pool; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prediction_tickets_pool ON public.prediction_tickets USING btree (pool_id);


--
-- Name: idx_prize_payouts_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prize_payouts_player ON public.prize_payouts USING btree (player_id);


--
-- Name: idx_prize_payouts_tournament; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prize_payouts_tournament ON public.prize_payouts USING btree (tournament_id);


--
-- Name: idx_refunds_payment_intent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refunds_payment_intent ON public.refunds USING btree (payment_intent_id);


--
-- Name: idx_shipments_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_order ON public.shipments USING btree (order_id);


--
-- Name: idx_shipping_addresses_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_addresses_player ON public.shipping_addresses USING btree (player_id);


--
-- Name: idx_sponsor_banners_slot_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sponsor_banners_slot_active ON public.sponsor_banners USING btree (slot_position, is_active, priority DESC, created_at DESC) WHERE (is_active = true);


--
-- Name: idx_sponsor_banners_sponsor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sponsor_banners_sponsor_id ON public.sponsor_banners USING btree (sponsor_id);


--
-- Name: idx_sponsor_perks_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sponsor_perks_active ON public.sponsor_perks USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_sponsor_perks_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sponsor_perks_team_id ON public.sponsor_perks USING btree (team_id);


--
-- Name: idx_sponsors_partner_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sponsors_partner_player ON public.sponsors USING btree (partner_player_id);


--
-- Name: idx_sponsors_tier_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sponsors_tier_status ON public.sponsors USING btree (tier, status, is_active);


--
-- Name: idx_stages_tournament; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stages_tournament ON public.tournament_stages USING btree (tournament_id, stage_order);


--
-- Name: idx_store_item_variants_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_item_variants_lookup ON public.store_item_variants USING btree (item_id, is_active);


--
-- Name: idx_stream_sessions_stream; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stream_sessions_stream ON public.stream_sessions USING btree (stream_id);


--
-- Name: idx_streams_earn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_streams_earn ON public.streams USING btree (is_earn_eligible) WHERE ((is_earn_eligible = true) AND (status = 'LIVE'::public.stream_status_type));


--
-- Name: idx_streams_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_streams_match ON public.streams USING btree (match_id) WHERE (match_id IS NOT NULL);


--
-- Name: idx_streams_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_streams_status ON public.streams USING btree (status, scheduled_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_streams_tournament; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_streams_tournament ON public.streams USING btree (tournament_id);


--
-- Name: idx_subscriptions_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_player_id ON public.subscriptions USING btree (player_id) WHERE (player_id IS NOT NULL);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (current_status);


--
-- Name: idx_subscriptions_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_team_id ON public.subscriptions USING btree (team_id) WHERE (team_id IS NOT NULL);


--
-- Name: idx_subscriptions_valid_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_valid_until ON public.subscriptions USING btree (valid_until);


--
-- Name: idx_team_members_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_player ON public.team_members USING btree (player_id, status);


--
-- Name: idx_team_members_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_team ON public.team_members USING btree (team_id, status);


--
-- Name: idx_teams_captain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_captain ON public.teams USING btree (captain_id);


--
-- Name: idx_teams_game; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_game ON public.teams USING btree (game_id);


--
-- Name: idx_teams_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_org ON public.teams USING btree (organization_id);


--
-- Name: idx_teams_zp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_zp ON public.teams USING btree (total_zp DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_themes_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_themes_active ON public.brand_themes USING btree (priority DESC, active_from) WHERE (is_active = true);


--
-- Name: idx_themes_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_themes_scope ON public.brand_themes USING btree (scope_type, scope_id) WHERE (is_active = true);


--
-- Name: idx_trade_history_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_history_buyer ON public.marketplace_trade_history USING btree (buyer_id);


--
-- Name: idx_trade_history_listing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_history_listing ON public.marketplace_trade_history USING btree (listing_id);


--
-- Name: idx_trade_history_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_history_seller ON public.marketplace_trade_history USING btree (seller_id);


--
-- Name: idx_user_roles_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_player ON public.user_roles USING btree (player_id) WHERE (revoked_at IS NULL);


--
-- Name: idx_vendors_monthly_reset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_monthly_reset ON public.vendors USING btree (monthly_reset_at);


--
-- Name: idx_vendors_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_player_id ON public.vendors USING btree (player_id);


--
-- Name: idx_vendors_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_team_id ON public.vendors USING btree (team_id) WHERE (team_id IS NOT NULL);


--
-- Name: idx_veto_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_veto_match ON public.map_vetoes USING btree (match_id, step_order);


--
-- Name: idx_watch_heartbeats_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watch_heartbeats_session ON public.watch_heartbeats USING btree (session_id, created_at);


--
-- Name: idx_watch_sessions_device; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watch_sessions_device ON public.watch_sessions USING btree (device_id);


--
-- Name: idx_watch_sessions_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watch_sessions_ip ON public.watch_sessions USING btree (ip_address);


--
-- Name: idx_watch_sessions_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watch_sessions_player ON public.watch_sessions USING btree (player_id);


--
-- Name: idx_watch_sessions_stream; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watch_sessions_stream ON public.watch_sessions USING btree (stream_id);


--
-- Name: uq_active_membership; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_active_membership ON public.team_members USING btree (team_id, player_id) WHERE (status = 'ACTIVE'::public.membership_status_type);


--
-- Name: uq_active_role; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_active_role ON public.user_roles USING btree (player_id, role, COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE (revoked_at IS NULL);


--
-- Name: uq_active_stream_session; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_active_stream_session ON public.stream_sessions USING btree (stream_id) WHERE (is_connected = true);


--
-- Name: uq_ap_daily_limits_player_date; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ap_daily_limits_player_date ON public.ap_daily_limits USING btree (player_id, limit_date);


--
-- Name: uq_finals_seed; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_finals_seed ON public.circuit_standings USING btree (circuit_id, finals_seed) WHERE (finals_seed IS NOT NULL);


--
-- Name: uq_mv_team_analytics_team; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_mv_team_analytics_team ON public.mv_team_analytics USING btree (team_id);


--
-- Name: uq_player_stats_career; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_player_stats_career ON public.player_stats USING btree (player_id, game_id) WHERE (season_id IS NULL);


--
-- Name: uq_player_stats_season; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_player_stats_season ON public.player_stats USING btree (player_id, game_id, season_id) WHERE (season_id IS NOT NULL);


--
-- Name: uq_primary_account_per_game; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_primary_account_per_game ON public.game_accounts USING btree (player_id, game_id) WHERE ((is_primary = true) AND (deleted_at IS NULL));


--
-- Name: uq_watch_sessions_active_player; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_watch_sessions_active_player ON public.watch_sessions USING btree (player_id) WHERE (status = 'ACTIVE'::text);


--
-- Name: team_members on_team_member_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_team_member_insert BEFORE INSERT ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.enforce_single_team_per_game();


--
-- Name: audit_logs trg_audit_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_immutable BEFORE DELETE OR UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();


--
-- Name: tournament_stages trg_audit_stage_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_stage_status AFTER UPDATE OF status ON public.tournament_stages FOR EACH ROW EXECUTE FUNCTION public.audit_stage_status_change();


--
-- Name: athlete_market_listings trg_before_insert_athlete_listing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_before_insert_athlete_listing BEFORE INSERT ON public.athlete_market_listings FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_athlete_roster_lock();


--
-- Name: bracket_nodes trg_bracket_node_ready_create_match; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bracket_node_ready_create_match AFTER INSERT OR UPDATE OF status ON public.bracket_nodes FOR EACH ROW EXECUTE FUNCTION public.trg_auto_create_match_from_bracket();


--
-- Name: bracket_nodes trg_bracket_nodes_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bracket_nodes_updated BEFORE UPDATE ON public.bracket_nodes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: players trg_check_receiver_status_on_escrow; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_check_receiver_status_on_escrow AFTER UPDATE OF status ON public.players FOR EACH ROW EXECUTE FUNCTION public.check_receiver_status_on_escrow();


--
-- Name: game_accounts trg_clean_revoked_game_account; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clean_revoked_game_account BEFORE UPDATE OF verification_status ON public.game_accounts FOR EACH ROW EXECUTE FUNCTION public.clean_revoked_game_account();


--
-- Name: crypto_payments trg_crypto_revert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_crypto_revert AFTER UPDATE OF is_reverted ON public.crypto_payments FOR EACH ROW WHEN ((new.is_reverted = true)) EXECUTE FUNCTION public.handle_crypto_revert();


--
-- Name: marketplace_listings trg_enforce_listing_state_transition; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_listing_state_transition BEFORE UPDATE OF status ON public.marketplace_listings FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_state_transition();


--
-- Name: game_accounts trg_game_accounts_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_game_accounts_updated BEFORE UPDATE ON public.game_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: season_jackpot_pools trg_jackpot_pools_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_jackpot_pools_updated BEFORE UPDATE ON public.season_jackpot_pools FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: marketplace_listings trg_listings_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_listings_updated BEFORE UPDATE ON public.marketplace_listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: matches trg_lock_prediction_pool_on_match_live; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_lock_prediction_pool_on_match_live AFTER UPDATE OF status ON public.matches FOR EACH ROW EXECUTE FUNCTION public.lock_prediction_pool_on_match_live();


--
-- Name: match_games trg_match_games_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_match_games_updated BEFORE UPDATE ON public.match_games FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: matches trg_match_lobby_system_messages; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_match_lobby_system_messages AFTER UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.log_lobby_system_message();


--
-- Name: match_reports trg_match_reports_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_match_reports_updated BEFORE UPDATE ON public.match_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: matches trg_notify_match_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_match_status AFTER UPDATE OF status ON public.matches FOR EACH ROW EXECUTE FUNCTION public.notify_match_status_change();


--
-- Name: organizations trg_orgs_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: players trg_players_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_players_updated BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: prediction_pools trg_prediction_pools_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prediction_pools_updated BEFORE UPDATE ON public.prediction_pools FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: team_members trg_single_team_per_game; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_single_team_per_game BEFORE INSERT OR UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.enforce_single_team_per_game();


--
-- Name: subscriptions trg_subscriptions_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: team_members trg_team_members_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_team_members_updated BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: teams trg_teams_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_teams_updated BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tournament_stages trg_tournament_stages_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tournament_stages_updated BEFORE UPDATE ON public.tournament_stages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: matches trg_validate_match_transition; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_match_transition BEFORE UPDATE OF status ON public.matches FOR EACH ROW EXECUTE FUNCTION public.validate_match_transition_guard();


--
-- Name: vendors trg_vendors_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: abuse_flags abuse_flags_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abuse_flags
    ADD CONSTRAINT abuse_flags_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: abuse_flags abuse_flags_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abuse_flags
    ADD CONSTRAINT abuse_flags_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: affiliate_codes affiliate_codes_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_codes
    ADD CONSTRAINT affiliate_codes_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: affiliate_referrals affiliate_referrals_affiliate_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_referrals
    ADD CONSTRAINT affiliate_referrals_affiliate_code_fkey FOREIGN KEY (affiliate_code) REFERENCES public.affiliate_codes(code);


--
-- Name: affiliate_referrals affiliate_referrals_referee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_referrals
    ADD CONSTRAINT affiliate_referrals_referee_id_fkey FOREIGN KEY (referee_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: affiliate_referrals affiliate_referrals_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_referrals
    ADD CONSTRAINT affiliate_referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: affiliate_rewards_ledger affiliate_rewards_ledger_referee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_rewards_ledger
    ADD CONSTRAINT affiliate_rewards_ledger_referee_id_fkey FOREIGN KEY (referee_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: affiliate_rewards_ledger affiliate_rewards_ledger_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_rewards_ledger
    ADD CONSTRAINT affiliate_rewards_ledger_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: ap_daily_limits ap_daily_limits_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_daily_limits
    ADD CONSTRAINT ap_daily_limits_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: ap_escrow ap_escrow_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_escrow
    ADD CONSTRAINT ap_escrow_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.players(id) ON DELETE RESTRICT;


--
-- Name: ap_escrow ap_escrow_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_escrow
    ADD CONSTRAINT ap_escrow_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.players(id) ON DELETE RESTRICT;


--
-- Name: ap_ledger ap_ledger_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_ledger
    ADD CONSTRAINT ap_ledger_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: athlete_market_bids athlete_market_bids_bidder_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_market_bids
    ADD CONSTRAINT athlete_market_bids_bidder_player_id_fkey FOREIGN KEY (bidder_player_id) REFERENCES public.players(id) ON DELETE RESTRICT;


--
-- Name: athlete_market_bids athlete_market_bids_destination_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_market_bids
    ADD CONSTRAINT athlete_market_bids_destination_team_id_fkey FOREIGN KEY (destination_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: athlete_market_bids athlete_market_bids_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_market_bids
    ADD CONSTRAINT athlete_market_bids_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.athlete_market_listings(id) ON DELETE CASCADE;


--
-- Name: athlete_market_listings athlete_market_listings_highest_bidder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_market_listings
    ADD CONSTRAINT athlete_market_listings_highest_bidder_id_fkey FOREIGN KEY (highest_bidder_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: athlete_market_listings athlete_market_listings_seller_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_market_listings
    ADD CONSTRAINT athlete_market_listings_seller_player_id_fkey FOREIGN KEY (seller_player_id) REFERENCES public.players(id) ON DELETE RESTRICT;


--
-- Name: athlete_market_listings athlete_market_listings_seller_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_market_listings
    ADD CONSTRAINT athlete_market_listings_seller_team_id_fkey FOREIGN KEY (seller_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: athlete_market_listings athlete_market_listings_target_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_market_listings
    ADD CONSTRAINT athlete_market_listings_target_player_id_fkey FOREIGN KEY (target_player_id) REFERENCES public.players(id) ON DELETE RESTRICT;


--
-- Name: athlete_transfer_history athlete_transfer_history_from_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_transfer_history
    ADD CONSTRAINT athlete_transfer_history_from_team_id_fkey FOREIGN KEY (from_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: athlete_transfer_history athlete_transfer_history_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_transfer_history
    ADD CONSTRAINT athlete_transfer_history_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.athlete_market_listings(id) ON DELETE SET NULL;


--
-- Name: athlete_transfer_history athlete_transfer_history_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_transfer_history
    ADD CONSTRAINT athlete_transfer_history_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE RESTRICT;


--
-- Name: athlete_transfer_history athlete_transfer_history_to_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_transfer_history
    ADD CONSTRAINT athlete_transfer_history_to_team_id_fkey FOREIGN KEY (to_team_id) REFERENCES public.teams(id) ON DELETE RESTRICT;


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_impersonated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_impersonated_by_fkey FOREIGN KEY (impersonated_by) REFERENCES public.players(id);


--
-- Name: bracket_nodes bracket_nodes_loser_to_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bracket_nodes
    ADD CONSTRAINT bracket_nodes_loser_to_node_id_fkey FOREIGN KEY (loser_to_node_id) REFERENCES public.bracket_nodes(id) ON DELETE SET NULL;


--
-- Name: bracket_nodes bracket_nodes_reset_from_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bracket_nodes
    ADD CONSTRAINT bracket_nodes_reset_from_node_id_fkey FOREIGN KEY (reset_from_node_id) REFERENCES public.bracket_nodes(id) ON DELETE SET NULL;


--
-- Name: bracket_nodes bracket_nodes_source_a_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bracket_nodes
    ADD CONSTRAINT bracket_nodes_source_a_node_id_fkey FOREIGN KEY (source_a_node_id) REFERENCES public.bracket_nodes(id) ON DELETE SET NULL;


--
-- Name: bracket_nodes bracket_nodes_source_b_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bracket_nodes
    ADD CONSTRAINT bracket_nodes_source_b_node_id_fkey FOREIGN KEY (source_b_node_id) REFERENCES public.bracket_nodes(id) ON DELETE SET NULL;


--
-- Name: bracket_nodes bracket_nodes_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bracket_nodes
    ADD CONSTRAINT bracket_nodes_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.tournament_stages(id) ON DELETE CASCADE;


--
-- Name: bracket_nodes bracket_nodes_team_a_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bracket_nodes
    ADD CONSTRAINT bracket_nodes_team_a_id_fkey FOREIGN KEY (team_a_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: bracket_nodes bracket_nodes_team_b_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bracket_nodes
    ADD CONSTRAINT bracket_nodes_team_b_id_fkey FOREIGN KEY (team_b_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: bracket_nodes bracket_nodes_winner_to_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bracket_nodes
    ADD CONSTRAINT bracket_nodes_winner_to_node_id_fkey FOREIGN KEY (winner_to_node_id) REFERENCES public.bracket_nodes(id) ON DELETE SET NULL;


--
-- Name: brand_themes brand_themes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_themes
    ADD CONSTRAINT brand_themes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: circuit_standings circuit_standings_circuit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circuit_standings
    ADD CONSTRAINT circuit_standings_circuit_id_fkey FOREIGN KEY (circuit_id) REFERENCES public.circuits(id) ON DELETE CASCADE;


--
-- Name: circuit_standings circuit_standings_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circuit_standings
    ADD CONSTRAINT circuit_standings_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: circuits circuits_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circuits
    ADD CONSTRAINT circuits_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id);


--
-- Name: crypto_payments crypto_payments_payment_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crypto_payments
    ADD CONSTRAINT crypto_payments_payment_intent_id_fkey FOREIGN KEY (payment_intent_id) REFERENCES public.payment_intents(id) ON DELETE CASCADE;


--
-- Name: disputes disputes_filed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_filed_by_fkey FOREIGN KEY (filed_by) REFERENCES public.players(id);


--
-- Name: disputes disputes_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: disputes disputes_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.players(id);


--
-- Name: game_accounts game_accounts_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_accounts
    ADD CONSTRAINT game_accounts_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE RESTRICT;


--
-- Name: game_accounts game_accounts_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_accounts
    ADD CONSTRAINT game_accounts_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: game_accounts game_accounts_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_accounts
    ADD CONSTRAINT game_accounts_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.players(id);


--
-- Name: map_vetoes map_vetoes_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_vetoes
    ADD CONSTRAINT map_vetoes_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.players(id);


--
-- Name: map_vetoes map_vetoes_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_vetoes
    ADD CONSTRAINT map_vetoes_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: map_vetoes map_vetoes_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_vetoes
    ADD CONSTRAINT map_vetoes_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: marketplace_listings marketplace_listings_highest_bidder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_listings
    ADD CONSTRAINT marketplace_listings_highest_bidder_id_fkey FOREIGN KEY (highest_bidder_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: marketplace_listings marketplace_listings_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_listings
    ADD CONSTRAINT marketplace_listings_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: marketplace_trade_history marketplace_trade_history_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_trade_history
    ADD CONSTRAINT marketplace_trade_history_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.players(id) ON DELETE RESTRICT;


--
-- Name: marketplace_trade_history marketplace_trade_history_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_trade_history
    ADD CONSTRAINT marketplace_trade_history_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.marketplace_listings(id) ON DELETE RESTRICT;


--
-- Name: marketplace_trade_history marketplace_trade_history_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_trade_history
    ADD CONSTRAINT marketplace_trade_history_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.players(id) ON DELETE RESTRICT;


--
-- Name: match_decisions match_decisions_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_decisions
    ADD CONSTRAINT match_decisions_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.players(id);


--
-- Name: match_decisions match_decisions_dispute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_decisions
    ADD CONSTRAINT match_decisions_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES public.disputes(id) ON DELETE SET NULL;


--
-- Name: match_decisions match_decisions_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_decisions
    ADD CONSTRAINT match_decisions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_games match_games_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_games
    ADD CONSTRAINT match_games_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_games match_games_winner_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_games
    ADD CONSTRAINT match_games_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: match_lobby_messages match_lobby_messages_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_lobby_messages
    ADD CONSTRAINT match_lobby_messages_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_lobby_messages match_lobby_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_lobby_messages
    ADD CONSTRAINT match_lobby_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: match_participant_hit_stats match_participant_hit_stats_entered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participant_hit_stats
    ADD CONSTRAINT match_participant_hit_stats_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: match_participant_hit_stats match_participant_hit_stats_match_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participant_hit_stats
    ADD CONSTRAINT match_participant_hit_stats_match_participant_id_fkey FOREIGN KEY (match_participant_id) REFERENCES public.match_participants(id) ON DELETE CASCADE;


--
-- Name: match_participant_weapons match_participant_weapons_entered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participant_weapons
    ADD CONSTRAINT match_participant_weapons_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: match_participant_weapons match_participant_weapons_match_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participant_weapons
    ADD CONSTRAINT match_participant_weapons_match_participant_id_fkey FOREIGN KEY (match_participant_id) REFERENCES public.match_participants(id) ON DELETE CASCADE;


--
-- Name: match_participants match_participants_game_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_game_account_id_fkey FOREIGN KEY (game_account_id) REFERENCES public.game_accounts(id) ON DELETE SET NULL;


--
-- Name: match_participants match_participants_match_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_match_game_id_fkey FOREIGN KEY (match_game_id) REFERENCES public.match_games(id) ON DELETE CASCADE;


--
-- Name: match_participants match_participants_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_participants match_participants_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: match_participants match_participants_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: match_replays match_replays_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_replays
    ADD CONSTRAINT match_replays_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: match_replays match_replays_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_replays
    ADD CONSTRAINT match_replays_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_replays match_replays_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_replays
    ADD CONSTRAINT match_replays_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: match_reports match_reports_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_reports
    ADD CONSTRAINT match_reports_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_reports match_reports_reported_by_team_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_reports
    ADD CONSTRAINT match_reports_reported_by_team_fkey FOREIGN KEY (reported_by_team) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: match_reports match_reports_reported_by_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_reports
    ADD CONSTRAINT match_reports_reported_by_user_fkey FOREIGN KEY (reported_by_user) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: match_reports match_reports_winner_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_reports
    ADD CONSTRAINT match_reports_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.teams(id) ON DELETE RESTRICT;


--
-- Name: match_room_messages match_room_messages_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_room_messages
    ADD CONSTRAINT match_room_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.match_rooms(id) ON DELETE CASCADE;


--
-- Name: match_room_messages match_room_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_room_messages
    ADD CONSTRAINT match_room_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: match_room_participants match_room_participants_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_room_participants
    ADD CONSTRAINT match_room_participants_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: match_room_participants match_room_participants_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_room_participants
    ADD CONSTRAINT match_room_participants_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.match_rooms(id) ON DELETE CASCADE;


--
-- Name: match_room_staff match_room_staff_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_room_staff
    ADD CONSTRAINT match_room_staff_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.match_rooms(id) ON DELETE CASCADE;


--
-- Name: match_room_staff match_room_staff_staff_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_room_staff
    ADD CONSTRAINT match_room_staff_staff_player_id_fkey FOREIGN KEY (staff_player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: match_rooms match_rooms_creator_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_rooms
    ADD CONSTRAINT match_rooms_creator_player_id_fkey FOREIGN KEY (creator_player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: match_rooms match_rooms_team_a_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_rooms
    ADD CONSTRAINT match_rooms_team_a_id_fkey FOREIGN KEY (team_a_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: match_rooms match_rooms_team_b_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_rooms
    ADD CONSTRAINT match_rooms_team_b_id_fkey FOREIGN KEY (team_b_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: match_rounds match_rounds_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_rounds
    ADD CONSTRAINT match_rounds_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_rounds match_rounds_winner_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_rounds
    ADD CONSTRAINT match_rounds_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: match_state_transitions match_state_transitions_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_state_transitions
    ADD CONSTRAINT match_state_transitions_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: match_state_transitions match_state_transitions_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_state_transitions
    ADD CONSTRAINT match_state_transitions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: matches matches_bracket_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_bracket_node_id_fkey FOREIGN KEY (bracket_node_id) REFERENCES public.bracket_nodes(id) ON DELETE SET NULL;


--
-- Name: matches matches_referee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_referee_id_fkey FOREIGN KEY (referee_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: matches matches_result_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_result_reported_by_fkey FOREIGN KEY (result_reported_by) REFERENCES public.players(id);


--
-- Name: matches matches_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.tournament_stages(id);


--
-- Name: matches matches_team_a_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_team_a_id_fkey FOREIGN KEY (team_a_id) REFERENCES public.teams(id);


--
-- Name: matches matches_team_b_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_team_b_id_fkey FOREIGN KEY (team_b_id) REFERENCES public.teams(id);


--
-- Name: matches matches_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: matches matches_winner_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: mercy_fill_tickets mercy_fill_tickets_filled_by_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mercy_fill_tickets
    ADD CONSTRAINT mercy_fill_tickets_filled_by_player_id_fkey FOREIGN KEY (filled_by_player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: mercy_fill_tickets mercy_fill_tickets_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mercy_fill_tickets
    ADD CONSTRAINT mercy_fill_tickets_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.match_rooms(id) ON DELETE CASCADE;


--
-- Name: mercy_sub_pool mercy_sub_pool_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mercy_sub_pool
    ADD CONSTRAINT mercy_sub_pool_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.store_item_variants(id) ON DELETE RESTRICT;


--
-- Name: orders orders_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: orders orders_shipping_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_shipping_address_id_fkey FOREIGN KEY (shipping_address_id) REFERENCES public.shipping_addresses(id) ON DELETE SET NULL;


--
-- Name: organizations organizations_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.players(id) ON DELETE RESTRICT;


--
-- Name: p2p_transfer_otp_challenges p2p_transfer_otp_challenges_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.p2p_transfer_otp_challenges
    ADD CONSTRAINT p2p_transfer_otp_challenges_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: p2p_transfer_used_tokens p2p_transfer_used_tokens_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.p2p_transfer_used_tokens
    ADD CONSTRAINT p2p_transfer_used_tokens_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: partner_coupon_redemptions partner_coupon_redemptions_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_coupon_redemptions
    ADD CONSTRAINT partner_coupon_redemptions_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.partner_coupons(id) ON DELETE CASCADE;


--
-- Name: partner_coupon_redemptions partner_coupon_redemptions_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_coupon_redemptions
    ADD CONSTRAINT partner_coupon_redemptions_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: partner_coupons partner_coupons_sponsor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_coupons
    ADD CONSTRAINT partner_coupons_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.sponsors(id) ON DELETE CASCADE;


--
-- Name: payment_intents payment_intents_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT payment_intents_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: payment_intents payment_intents_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT payment_intents_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: perk_redemptions perk_redemptions_perk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perk_redemptions
    ADD CONSTRAINT perk_redemptions_perk_id_fkey FOREIGN KEY (perk_id) REFERENCES public.sponsor_perks(id) ON DELETE CASCADE;


--
-- Name: perk_redemptions perk_redemptions_redeemed_by_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perk_redemptions
    ADD CONSTRAINT perk_redemptions_redeemed_by_player_id_fkey FOREIGN KEY (redeemed_by_player_id) REFERENCES public.players(id) ON DELETE RESTRICT;


--
-- Name: player_daily_quests player_daily_quests_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_daily_quests
    ADD CONSTRAINT player_daily_quests_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_daily_quests player_daily_quests_quest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_daily_quests
    ADD CONSTRAINT player_daily_quests_quest_id_fkey FOREIGN KEY (quest_id) REFERENCES public.daily_quests(id) ON DELETE CASCADE;


--
-- Name: player_inventory player_inventory_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_inventory
    ADD CONSTRAINT player_inventory_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_inventory player_inventory_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_inventory
    ADD CONSTRAINT player_inventory_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.store_item_variants(id) ON DELETE CASCADE;


--
-- Name: player_stats player_stats_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: player_stats player_stats_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_stats player_stats_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE SET NULL;


--
-- Name: players players_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: prediction_pools prediction_pools_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prediction_pools
    ADD CONSTRAINT prediction_pools_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE RESTRICT;


--
-- Name: prediction_pools prediction_pools_winning_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prediction_pools
    ADD CONSTRAINT prediction_pools_winning_team_id_fkey FOREIGN KEY (winning_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: prediction_tickets prediction_tickets_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prediction_tickets
    ADD CONSTRAINT prediction_tickets_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE RESTRICT;


--
-- Name: prediction_tickets prediction_tickets_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prediction_tickets
    ADD CONSTRAINT prediction_tickets_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.prediction_pools(id) ON DELETE RESTRICT;


--
-- Name: prediction_tickets prediction_tickets_predicted_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prediction_tickets
    ADD CONSTRAINT prediction_tickets_predicted_team_id_fkey FOREIGN KEY (predicted_team_id) REFERENCES public.teams(id) ON DELETE RESTRICT;


--
-- Name: prize_payouts prize_payouts_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prize_payouts
    ADD CONSTRAINT prize_payouts_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: prize_payouts prize_payouts_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prize_payouts
    ADD CONSTRAINT prize_payouts_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: prize_payouts prize_payouts_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prize_payouts
    ADD CONSTRAINT prize_payouts_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: refunds refunds_payment_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_payment_intent_id_fkey FOREIGN KEY (payment_intent_id) REFERENCES public.payment_intents(id) ON DELETE CASCADE;


--
-- Name: refunds refunds_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: roster_snapshot_members roster_snapshot_members_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roster_snapshot_members
    ADD CONSTRAINT roster_snapshot_members_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id);


--
-- Name: roster_snapshot_members roster_snapshot_members_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roster_snapshot_members
    ADD CONSTRAINT roster_snapshot_members_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.roster_snapshots(id);


--
-- Name: roster_snapshots roster_snapshots_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roster_snapshots
    ADD CONSTRAINT roster_snapshots_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: roster_snapshots roster_snapshots_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roster_snapshots
    ADD CONSTRAINT roster_snapshots_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id);


--
-- Name: season_jackpot_pools season_jackpot_pools_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_jackpot_pools
    ADD CONSTRAINT season_jackpot_pools_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE RESTRICT;


--
-- Name: season_standings season_standings_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_standings
    ADD CONSTRAINT season_standings_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id);


--
-- Name: season_standings season_standings_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_standings
    ADD CONSTRAINT season_standings_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: seasons seasons_circuit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_circuit_id_fkey FOREIGN KEY (circuit_id) REFERENCES public.circuits(id);


--
-- Name: shipments shipments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: shipping_addresses shipping_addresses_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_addresses
    ADD CONSTRAINT shipping_addresses_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: sponsor_banners sponsor_banners_sponsor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsor_banners
    ADD CONSTRAINT sponsor_banners_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.sponsors(id) ON DELETE SET NULL;


--
-- Name: sponsor_perks sponsor_perks_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsor_perks
    ADD CONSTRAINT sponsor_perks_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- Name: sponsor_perks sponsor_perks_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsor_perks
    ADD CONSTRAINT sponsor_perks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: sponsors sponsors_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: sponsors sponsors_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: sponsors sponsors_partner_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_partner_player_id_fkey FOREIGN KEY (partner_player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: store_categories store_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_categories
    ADD CONSTRAINT store_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.store_categories(id) ON DELETE CASCADE;


--
-- Name: store_item_variants store_item_variants_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_item_variants
    ADD CONSTRAINT store_item_variants_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.store_items(id) ON DELETE CASCADE;


--
-- Name: store_items store_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_items
    ADD CONSTRAINT store_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.store_categories(id) ON DELETE SET NULL;


--
-- Name: stream_sessions stream_sessions_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_sessions
    ADD CONSTRAINT stream_sessions_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON DELETE CASCADE;


--
-- Name: streams streams_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: streams streams_earning_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_earning_rule_id_fkey FOREIGN KEY (earning_rule_id) REFERENCES public.ap_earning_rules(id) ON DELETE SET NULL;


--
-- Name: streams streams_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE SET NULL;


--
-- Name: streams streams_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE SET NULL;


--
-- Name: subscription_invoices subscription_invoices_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoices
    ADD CONSTRAINT subscription_invoices_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: subscription_invoices subscription_invoices_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoices
    ADD CONSTRAINT subscription_invoices_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- Name: subscription_invoices subscription_invoices_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoices
    ADD CONSTRAINT subscription_invoices_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: subscriptions subscriptions_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.players(id);


--
-- Name: team_members team_members_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: teams teams_captain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_captain_id_fkey FOREIGN KEY (captain_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: teams teams_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE RESTRICT;


--
-- Name: teams teams_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: tournament_registrations tournament_registrations_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: tournament_registrations tournament_registrations_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id);


--
-- Name: tournament_stages tournament_stages_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_stages
    ADD CONSTRAINT tournament_stages_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id);


--
-- Name: tournaments tournaments_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id);


--
-- Name: user_roles user_roles_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.players(id);


--
-- Name: user_roles user_roles_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: watch_heartbeats watch_heartbeats_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_heartbeats
    ADD CONSTRAINT watch_heartbeats_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.watch_sessions(id) ON DELETE CASCADE;


--
-- Name: watch_sessions watch_sessions_earning_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_sessions
    ADD CONSTRAINT watch_sessions_earning_rule_id_fkey FOREIGN KEY (earning_rule_id) REFERENCES public.ap_earning_rules(id) ON DELETE SET NULL;


--
-- Name: watch_sessions watch_sessions_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_sessions
    ADD CONSTRAINT watch_sessions_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: watch_sessions watch_sessions_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_sessions
    ADD CONSTRAINT watch_sessions_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON DELETE CASCADE;


--
-- Name: partner_coupons Admin Full Access Coupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin Full Access Coupons" ON public.partner_coupons USING ((EXISTS ( SELECT 1
   FROM (public.players p
     JOIN public.user_roles ur ON ((ur.player_id = p.id)))
  WHERE ((p.user_id = auth.uid()) AND (ur.revoked_at IS NULL) AND (ur.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role_type, 'ADMIN'::public.user_role_type, 'MARKETPLACE_ADMIN'::public.user_role_type]))))));


--
-- Name: partner_coupon_redemptions Admin Full Access Redemptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin Full Access Redemptions" ON public.partner_coupon_redemptions USING ((EXISTS ( SELECT 1
   FROM (public.players p
     JOIN public.user_roles ur ON ((ur.player_id = p.id)))
  WHERE ((p.user_id = auth.uid()) AND (ur.revoked_at IS NULL) AND (ur.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role_type, 'ADMIN'::public.user_role_type, 'MARKETPLACE_ADMIN'::public.user_role_type]))))));


--
-- Name: sponsors Admin Full Access Sponsors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin Full Access Sponsors" ON public.sponsors USING ((EXISTS ( SELECT 1
   FROM (public.players p
     JOIN public.user_roles ur ON ((ur.player_id = p.id)))
  WHERE ((p.user_id = auth.uid()) AND (ur.revoked_at IS NULL) AND (ur.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role_type, 'ADMIN'::public.user_role_type, 'MARKETPLACE_ADMIN'::public.user_role_type]))))));


--
-- Name: match_decisions Admins and Referees can insert match decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Referees can insert match decisions" ON public.match_decisions FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: disputes Admins and Referees can update disputes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Referees can update disputes" ON public.disputes FOR UPDATE USING (public.is_admin());


--
-- Name: sponsor_banners Allow admin manage sponsor banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admin manage sponsor banners" ON public.sponsor_banners TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.players p ON ((p.id = ur.player_id)))
  WHERE ((p.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role_type, 'ADMIN'::public.user_role_type, 'MARKETPLACE_ADMIN'::public.user_role_type])) AND (ur.revoked_at IS NULL)))));


--
-- Name: match_rounds Allow authenticated staff to insert/update match_rounds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated staff to insert/update match_rounds" ON public.match_rounds TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.players p
     JOIN public.user_roles ur ON ((ur.player_id = p.id)))
  WHERE ((p.user_id = auth.uid()) AND (ur.revoked_at IS NULL) AND (ur.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role_type, 'ADMIN'::public.user_role_type, 'REFEREE'::public.user_role_type, 'CASTER'::public.user_role_type])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.players p
     JOIN public.user_roles ur ON ((ur.player_id = p.id)))
  WHERE ((p.user_id = auth.uid()) AND (ur.revoked_at IS NULL) AND (ur.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role_type, 'ADMIN'::public.user_role_type, 'REFEREE'::public.user_role_type, 'CASTER'::public.user_role_type]))))));


--
-- Name: match_rounds Allow public read access to match_rounds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to match_rounds" ON public.match_rounds FOR SELECT USING (true);


--
-- Name: sponsor_banners Allow public read active sponsor banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read active sponsor banners" ON public.sponsor_banners FOR SELECT TO authenticated, anon USING (((is_active = true) AND (starts_at <= now()) AND ((ends_at IS NULL) OR (ends_at >= now()))));


--
-- Name: athlete_market_listings Athletes Insert Listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Athletes Insert Listings" ON public.athlete_market_listings FOR INSERT WITH CHECK ((auth.uid() IN ( SELECT players.user_id
   FROM public.players
  WHERE (players.id = athlete_market_listings.seller_player_id))));


--
-- Name: disputes Authenticated users can create disputes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create disputes" ON public.disputes FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: athlete_market_bids Bidders Insert Bids; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Bidders Insert Bids" ON public.athlete_market_bids FOR INSERT WITH CHECK ((auth.uid() IN ( SELECT players.user_id
   FROM public.players
  WHERE (players.id = athlete_market_bids.bidder_player_id))));


--
-- Name: mercy_sub_pool Owner Manage Mercy Sub Pool; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner Manage Mercy Sub Pool" ON public.mercy_sub_pool USING ((auth.uid() IN ( SELECT players.user_id
   FROM public.players
  WHERE (players.id = mercy_sub_pool.player_id))));


--
-- Name: player_daily_quests Owner Read Quest Progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner Read Quest Progress" ON public.player_daily_quests FOR SELECT USING ((auth.uid() IN ( SELECT players.user_id
   FROM public.players
  WHERE (players.id = player_daily_quests.player_id))));


--
-- Name: match_room_participants Participants Read Room Members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Participants Read Room Members" ON public.match_room_participants FOR SELECT USING (true);


--
-- Name: partner_coupons Partner Coop Manage Own Coupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Partner Coop Manage Own Coupons" ON public.partner_coupons USING ((EXISTS ( SELECT 1
   FROM public.sponsors s
  WHERE ((s.id = partner_coupons.sponsor_id) AND (s.partner_player_id IN ( SELECT players.id
           FROM public.players
          WHERE (players.user_id = auth.uid()))) AND (s.tier = 'PARTNER_COOP'::public.sponsor_tier) AND (s.status = 'APPROVED'::public.sponsor_status)))));


--
-- Name: sponsors Partner Read Own Sponsor Record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Partner Read Own Sponsor Record" ON public.sponsors FOR SELECT USING ((partner_player_id IN ( SELECT players.id
   FROM public.players
  WHERE (players.user_id = auth.uid()))));


--
-- Name: partner_coupon_redemptions Player Read Own Redemptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Player Read Own Redemptions" ON public.partner_coupon_redemptions FOR SELECT USING ((player_id IN ( SELECT players.id
   FROM public.players
  WHERE (players.user_id = auth.uid()))));


--
-- Name: watch_sessions Players can view own watch sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Players can view own watch sessions" ON public.watch_sessions FOR SELECT USING ((player_id = public.current_player_id()));


--
-- Name: partner_coupons Public Read Active Coupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Read Active Coupons" ON public.partner_coupons FOR SELECT USING (((is_active = true) AND (expires_at > now()) AND (current_uses < max_total_uses)));


--
-- Name: athlete_market_listings Public Read Active Listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Read Active Listings" ON public.athlete_market_listings FOR SELECT USING ((status = 'ACTIVE'::public.athlete_listing_status));


--
-- Name: affiliate_codes Public Read Affiliate Codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Read Affiliate Codes" ON public.affiliate_codes FOR SELECT USING (true);


--
-- Name: sponsors Public Read Approved Active Sponsors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Read Approved Active Sponsors" ON public.sponsors FOR SELECT USING (((status = 'APPROVED'::public.sponsor_status) AND (is_active = true)));


--
-- Name: match_participant_hit_stats Public Read Hit Stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Read Hit Stats" ON public.match_participant_hit_stats FOR SELECT USING (true);


--
-- Name: match_room_messages Public Read Match Room Messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Read Match Room Messages" ON public.match_room_messages FOR SELECT USING (true);


--
-- Name: match_room_staff Public Read Match Room Staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Read Match Room Staff" ON public.match_room_staff FOR SELECT USING (true);


--
-- Name: match_rooms Public Read Match Rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Read Match Rooms" ON public.match_rooms FOR SELECT USING (true);


--
-- Name: mercy_fill_tickets Public Read Mercy Fill Tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Read Mercy Fill Tickets" ON public.mercy_fill_tickets FOR SELECT USING (true);


--
-- Name: mercy_sub_pool Public Read Mercy Sub Pool; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Read Mercy Sub Pool" ON public.mercy_sub_pool FOR SELECT USING (true);


--
-- Name: daily_quests Public Read Quests Catalog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Read Quests Catalog" ON public.daily_quests FOR SELECT USING (true);


--
-- Name: athlete_transfer_history Public Read Transfer History; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Read Transfer History" ON public.athlete_transfer_history FOR SELECT USING (true);


--
-- Name: match_participant_weapons Public Read Weapon Stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Read Weapon Stats" ON public.match_participant_weapons FOR SELECT USING (true);


--
-- Name: disputes Public can view disputes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view disputes" ON public.disputes FOR SELECT USING (true);


--
-- Name: match_decisions Public can view match decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view match decisions" ON public.match_decisions FOR SELECT USING (true);


--
-- Name: affiliate_referrals Referrer Read Referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referrer Read Referrals" ON public.affiliate_referrals FOR SELECT USING ((auth.uid() IN ( SELECT players.user_id
   FROM public.players
  WHERE ((players.id = affiliate_referrals.referrer_id) OR (players.id = affiliate_referrals.referee_id)))));


--
-- Name: affiliate_rewards_ledger Referrer Read Rewards Ledger; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referrer Read Rewards Ledger" ON public.affiliate_rewards_ledger FOR SELECT USING ((auth.uid() IN ( SELECT players.user_id
   FROM public.players
  WHERE (players.id = affiliate_rewards_ledger.referrer_id))));


--
-- Name: abuse_flags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.abuse_flags ENABLE ROW LEVEL SECURITY;

--
-- Name: affiliate_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.affiliate_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: affiliate_referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: affiliate_rewards_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.affiliate_rewards_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: ap_daily_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ap_daily_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: ap_earning_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ap_earning_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: ap_escrow; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ap_escrow ENABLE ROW LEVEL SECURITY;

--
-- Name: ap_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ap_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: athlete_market_bids; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.athlete_market_bids ENABLE ROW LEVEL SECURITY;

--
-- Name: athlete_market_listings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.athlete_market_listings ENABLE ROW LEVEL SECURITY;

--
-- Name: athlete_transfer_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.athlete_transfer_history ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs audit_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_admin_read ON public.audit_logs FOR SELECT USING (public.is_admin());


--
-- Name: audit_logs audit_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_insert ON public.audit_logs FOR INSERT WITH CHECK (true);


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs audit_logs_insert_service_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_logs_insert_service_only ON public.audit_logs FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: audit_logs audit_logs_no_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_logs_no_delete ON public.audit_logs AS RESTRICTIVE FOR DELETE USING (false);


--
-- Name: audit_logs audit_logs_no_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_logs_no_update ON public.audit_logs AS RESTRICTIVE FOR UPDATE USING (false);


--
-- Name: audit_logs audit_logs_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_logs_select_admin ON public.audit_logs FOR SELECT TO authenticated USING (true);


--
-- Name: bracket_nodes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bracket_nodes ENABLE ROW LEVEL SECURITY;

--
-- Name: bracket_nodes bracket_nodes_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bracket_nodes_admin_write ON public.bracket_nodes USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: bracket_nodes bracket_nodes_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bracket_nodes_public_read ON public.bracket_nodes FOR SELECT USING (true);


--
-- Name: bracket_nodes brackets_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY brackets_admin ON public.bracket_nodes USING (public.is_admin());


--
-- Name: bracket_nodes brackets_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY brackets_read ON public.bracket_nodes FOR SELECT USING (true);


--
-- Name: brand_themes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brand_themes ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_themes brand_themes_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY brand_themes_admin_all ON public.brand_themes USING (public.is_admin());


--
-- Name: brand_themes brand_themes_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY brand_themes_admin_write ON public.brand_themes USING (public.is_admin());


--
-- Name: brand_themes brand_themes_public_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY brand_themes_public_select ON public.brand_themes FOR SELECT USING ((is_active = true));


--
-- Name: system_burn_ledger burn_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY burn_admin ON public.system_burn_ledger USING (public.is_admin());


--
-- Name: system_burn_ledger burn_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY burn_read ON public.system_burn_ledger FOR SELECT USING (true);


--
-- Name: circuit_standings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.circuit_standings ENABLE ROW LEVEL SECURITY;

--
-- Name: circuits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.circuits ENABLE ROW LEVEL SECURITY;

--
-- Name: circuits circuits_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY circuits_public_read ON public.circuits FOR SELECT USING (true);


--
-- Name: crypto_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crypto_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: crypto_payments crypto_payments_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crypto_payments_owner_select ON public.crypto_payments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.payment_intents pi
  WHERE ((pi.id = crypto_payments.payment_intent_id) AND ((pi.player_id = public.current_player_id()) OR public.is_admin())))));


--
-- Name: circuit_standings cstandings_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cstandings_read ON public.circuit_standings FOR SELECT USING (true);


--
-- Name: daily_quests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;

--
-- Name: disputes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

--
-- Name: ap_escrow escrow_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY escrow_self ON public.ap_escrow FOR SELECT USING (((sender_id = public.current_player_id()) OR (receiver_id = public.current_player_id()) OR public.is_admin()));


--
-- Name: game_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.game_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: game_accounts game_accounts_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY game_accounts_admin_all ON public.game_accounts USING (public.is_admin());


--
-- Name: game_accounts game_accounts_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY game_accounts_public_read ON public.game_accounts FOR SELECT USING (((verification_status = 'VERIFIED'::public.verification_status_type) AND (deleted_at IS NULL)));


--
-- Name: game_accounts game_accounts_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY game_accounts_self ON public.game_accounts USING ((player_id = public.current_player_id()));


--
-- Name: games; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

--
-- Name: games games_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY games_public_read ON public.games FOR SELECT USING ((is_active = true));


--
-- Name: subscription_invoices invoice_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invoice_self ON public.subscription_invoices FOR SELECT USING ((((subscriber_type = 'TEAM'::public.subscriber_owner_type) AND public.is_team_leader(team_id)) OR ((subscriber_type = 'PLAYER'::public.subscriber_owner_type) AND (player_id = public.current_player_id())) OR public.is_admin()));


--
-- Name: season_jackpot_pools jackpot_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY jackpot_admin ON public.season_jackpot_pools USING (public.is_admin());


--
-- Name: season_jackpot_pools jackpot_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY jackpot_read ON public.season_jackpot_pools FOR SELECT USING (true);


--
-- Name: marketplace_listings listings_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY listings_read ON public.marketplace_listings FOR SELECT USING ((status = 'ACTIVE'::public.listing_status_type));


--
-- Name: marketplace_listings listings_vendor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY listings_vendor ON public.marketplace_listings USING (((EXISTS ( SELECT 1
   FROM public.vendors v
  WHERE ((v.id = marketplace_listings.vendor_id) AND (v.player_id = public.current_player_id())))) OR public.is_admin()));


--
-- Name: match_lobby_messages lobby_messages_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lobby_messages_insert_policy ON public.match_lobby_messages FOR INSERT WITH CHECK (((auth.role() = 'authenticated'::text) AND (is_system = false) AND (public.is_admin() OR public.is_referee_of(match_id) OR (EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = match_lobby_messages.match_id) AND ((m.team_a_id IN ( SELECT team_members.team_id
           FROM public.team_members
          WHERE ((team_members.player_id = public.current_player_id()) AND (team_members.status = 'ACTIVE'::public.membership_status_type)))) OR (m.team_b_id IN ( SELECT team_members.team_id
           FROM public.team_members
          WHERE ((team_members.player_id = public.current_player_id()) AND (team_members.status = 'ACTIVE'::public.membership_status_type)))))))))));


--
-- Name: match_lobby_messages lobby_messages_no_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lobby_messages_no_delete ON public.match_lobby_messages FOR DELETE USING (false);


--
-- Name: match_lobby_messages lobby_messages_no_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lobby_messages_no_update ON public.match_lobby_messages FOR UPDATE USING (false);


--
-- Name: match_lobby_messages lobby_messages_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lobby_messages_select_policy ON public.match_lobby_messages FOR SELECT USING (((auth.role() = 'authenticated'::text) AND (public.is_admin() OR public.is_referee_of(match_id) OR (EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = match_lobby_messages.match_id) AND ((m.team_a_id IN ( SELECT team_members.team_id
           FROM public.team_members
          WHERE ((team_members.player_id = public.current_player_id()) AND (team_members.status = 'ACTIVE'::public.membership_status_type)))) OR (m.team_b_id IN ( SELECT team_members.team_id
           FROM public.team_members
          WHERE ((team_members.player_id = public.current_player_id()) AND (team_members.status = 'ACTIVE'::public.membership_status_type)))))))))));


--
-- Name: map_vetoes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.map_vetoes ENABLE ROW LEVEL SECURITY;

--
-- Name: map_vetoes map_vetoes_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY map_vetoes_admin_write ON public.map_vetoes USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: map_vetoes map_vetoes_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY map_vetoes_public_read ON public.map_vetoes FOR SELECT USING (true);


--
-- Name: map_vetoes map_vetoes_public_read_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY map_vetoes_public_read_policy ON public.map_vetoes FOR SELECT USING (true);


--
-- Name: marketplace_listings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

--
-- Name: marketplace_trade_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketplace_trade_history ENABLE ROW LEVEL SECURITY;

--
-- Name: match_decisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_decisions ENABLE ROW LEVEL SECURITY;

--
-- Name: match_games; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_games ENABLE ROW LEVEL SECURITY;

--
-- Name: match_games match_games_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_games_admin_write ON public.match_games USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: match_games match_games_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_games_public_read ON public.match_games FOR SELECT USING (true);


--
-- Name: match_games match_games_public_read_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_games_public_read_policy ON public.match_games FOR SELECT USING (true);


--
-- Name: match_games match_games_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_games_read ON public.match_games FOR SELECT USING (true);


--
-- Name: match_games match_games_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_games_write ON public.match_games USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: match_lobby_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_lobby_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: match_participant_hit_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_participant_hit_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: match_participant_weapons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_participant_weapons ENABLE ROW LEVEL SECURITY;

--
-- Name: match_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: match_participants match_participants_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_participants_admin_write ON public.match_participants USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: match_participants match_participants_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_participants_public_read ON public.match_participants FOR SELECT USING (true);


--
-- Name: match_replays; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_replays ENABLE ROW LEVEL SECURITY;

--
-- Name: match_replays match_replays_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_replays_admin_all ON public.match_replays USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: match_replays match_replays_creator_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_replays_creator_insert ON public.match_replays FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = match_replays.created_by) AND (p.user_id = auth.uid())))) OR public.is_admin())));


--
-- Name: match_replays match_replays_public_read_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_replays_public_read_policy ON public.match_replays FOR SELECT USING (true);


--
-- Name: match_replays match_replays_public_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_replays_public_select ON public.match_replays FOR SELECT USING (true);


--
-- Name: match_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: match_reports match_reports_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_reports_admin_all ON public.match_reports USING (public.is_admin());


--
-- Name: match_reports match_reports_public_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_reports_public_select ON public.match_reports FOR SELECT USING (true);


--
-- Name: match_reports match_reports_team_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_reports_team_insert ON public.match_reports FOR INSERT WITH CHECK (((auth.role() = 'authenticated'::text) AND public.is_team_leader(reported_by_team) AND (EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = match_reports.match_id) AND ((m.team_a_id = match_reports.reported_by_team) OR (m.team_b_id = match_reports.reported_by_team)) AND (m.status = 'AWAITING_RESULT'::public.match_status_type))))));


--
-- Name: match_reports match_reports_team_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_reports_team_update ON public.match_reports FOR UPDATE USING (((auth.role() = 'authenticated'::text) AND public.is_team_leader(reported_by_team) AND (EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = match_reports.match_id) AND (m.status = 'AWAITING_RESULT'::public.match_status_type))))));


--
-- Name: match_room_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_room_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: match_room_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_room_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: match_room_staff; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_room_staff ENABLE ROW LEVEL SECURITY;

--
-- Name: match_rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: match_rounds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_rounds ENABLE ROW LEVEL SECURITY;

--
-- Name: match_state_transitions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_state_transitions ENABLE ROW LEVEL SECURITY;

--
-- Name: match_state_transitions match_state_transitions_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_state_transitions_admin_read ON public.match_state_transitions FOR SELECT USING (public.is_admin());


--
-- Name: matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

--
-- Name: matches matches_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY matches_admin_write ON public.matches USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: matches matches_checkin_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY matches_checkin_update_policy ON public.matches FOR UPDATE USING ((public.is_admin() OR public.is_referee_of(id) OR (auth.uid() IN ( SELECT p.user_id
   FROM (public.team_members tm
     JOIN public.players p ON ((p.id = tm.player_id)))
  WHERE ((tm.team_id = matches.team_a_id) AND (tm.role = ANY (ARRAY['CAPTAIN'::public.team_role_type, 'MANAGER'::public.team_role_type, 'OWNER'::public.team_role_type])) AND (tm.status = 'ACTIVE'::public.membership_status_type)))) OR (auth.uid() IN ( SELECT p.user_id
   FROM (public.team_members tm
     JOIN public.players p ON ((p.id = tm.player_id)))
  WHERE ((tm.team_id = matches.team_b_id) AND (tm.role = ANY (ARRAY['CAPTAIN'::public.team_role_type, 'MANAGER'::public.team_role_type, 'OWNER'::public.team_role_type])) AND (tm.status = 'ACTIVE'::public.membership_status_type))))));


--
-- Name: matches matches_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY matches_public_read ON public.matches FOR SELECT USING (true);


--
-- Name: matches matches_public_read_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY matches_public_read_policy ON public.matches FOR SELECT USING (true);


--
-- Name: matches matches_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY matches_read ON public.matches FOR SELECT USING (true);


--
-- Name: matches matches_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY matches_write ON public.matches USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: mercy_fill_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mercy_fill_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: mercy_sub_pool; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mercy_sub_pool ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notif_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_self ON public.notifications FOR SELECT USING (((player_id = public.current_player_id()) OR public.is_admin()));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items order_items_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_owner_select ON public.order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND ((o.player_id = public.current_player_id()) OR public.is_admin())))));


--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: orders orders_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_owner_select ON public.orders FOR SELECT USING (((player_id = public.current_player_id()) OR public.is_admin()));


--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations organizations_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY organizations_public_read ON public.organizations FOR SELECT USING ((deleted_at IS NULL));


--
-- Name: organizations orgs_owner_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orgs_owner_manage ON public.organizations USING (((owner_id = public.current_player_id()) OR public.is_admin()));


--
-- Name: organizations orgs_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orgs_public_read ON public.organizations FOR SELECT USING ((deleted_at IS NULL));


--
-- Name: p2p_transfer_otp_challenges otp_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY otp_self ON public.p2p_transfer_otp_challenges FOR SELECT USING (((sender_id = public.current_player_id()) OR public.is_admin()));


--
-- Name: p2p_transfer_otp_challenges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.p2p_transfer_otp_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: p2p_transfer_used_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.p2p_transfer_used_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: match_participants participants_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY participants_read ON public.match_participants FOR SELECT USING (true);


--
-- Name: match_participants participants_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY participants_write ON public.match_participants USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: partner_coupon_redemptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_coupon_redemptions ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_coupons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_coupons ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_intents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_intents payment_intents_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_intents_owner_select ON public.payment_intents FOR SELECT USING (((player_id = public.current_player_id()) OR public.is_admin()));


--
-- Name: perk_redemptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.perk_redemptions ENABLE ROW LEVEL SECURITY;

--
-- Name: sponsor_perks perk_team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY perk_team ON public.sponsor_perks FOR SELECT USING ((public.is_team_leader(team_id) OR public.is_admin()));


--
-- Name: player_daily_quests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player_daily_quests ENABLE ROW LEVEL SECURITY;

--
-- Name: player_inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: player_inventory player_inventory_no_client_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY player_inventory_no_client_write ON public.player_inventory USING (public.is_admin());


--
-- Name: player_inventory player_inventory_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY player_inventory_owner_select ON public.player_inventory FOR SELECT USING (((player_id = public.current_player_id()) OR public.is_admin()));


--
-- Name: player_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: players; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

--
-- Name: players players_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY players_admin_all ON public.players USING (public.is_admin());


--
-- Name: players players_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY players_public_read ON public.players FOR SELECT USING ((deleted_at IS NULL));


--
-- Name: players players_self_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY players_self_update ON public.players FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: prediction_pools pools_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pools_admin ON public.prediction_pools USING (public.is_admin());


--
-- Name: prediction_pools pools_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pools_read ON public.prediction_pools FOR SELECT USING (true);


--
-- Name: prediction_pools; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prediction_pools ENABLE ROW LEVEL SECURITY;

--
-- Name: prediction_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prediction_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: prize_payouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prize_payouts ENABLE ROW LEVEL SECURITY;

--
-- Name: prize_payouts prize_payouts_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prize_payouts_owner_select ON public.prize_payouts FOR SELECT USING (((player_id = public.current_player_id()) OR public.is_admin()));


--
-- Name: perk_redemptions redemption_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY redemption_self ON public.perk_redemptions FOR SELECT USING (((redeemed_by_player_id = public.current_player_id()) OR public.is_admin()));


--
-- Name: refunds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

--
-- Name: refunds refunds_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY refunds_owner_select ON public.refunds FOR SELECT USING (((requested_by = public.current_player_id()) OR public.is_admin()));


--
-- Name: tournament_registrations registrations_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY registrations_insert ON public.tournament_registrations FOR INSERT WITH CHECK ((team_id IN ( SELECT team_members.team_id
   FROM public.team_members
  WHERE ((team_members.player_id = auth.uid()) AND (team_members.role = ANY (ARRAY['CAPTAIN'::public.team_role_type, 'MANAGER'::public.team_role_type])) AND (team_members.status = 'ACTIVE'::public.membership_status_type)))));


--
-- Name: tournament_registrations registrations_team_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY registrations_team_read ON public.tournament_registrations FOR SELECT USING ((team_id IN ( SELECT team_members.team_id
   FROM public.team_members
  WHERE ((team_members.player_id = auth.uid()) AND (team_members.status = 'ACTIVE'::public.membership_status_type)))));


--
-- Name: roster_snapshot_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roster_snapshot_members ENABLE ROW LEVEL SECURITY;

--
-- Name: roster_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roster_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: ap_earning_rules rules_admin_full_override; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rules_admin_full_override ON public.ap_earning_rules USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: ap_earning_rules rules_public_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rules_public_select ON public.ap_earning_rules FOR SELECT USING ((is_active = true));


--
-- Name: season_jackpot_pools; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.season_jackpot_pools ENABLE ROW LEVEL SECURITY;

--
-- Name: season_standings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.season_standings ENABLE ROW LEVEL SECURITY;

--
-- Name: seasons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

--
-- Name: seasons seasons_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY seasons_public_read ON public.seasons FOR SELECT USING (true);


--
-- Name: shipments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

--
-- Name: shipments shipments_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shipments_admin_write ON public.shipments USING (public.is_admin());


--
-- Name: shipments shipments_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shipments_owner_select ON public.shipments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = shipments.order_id) AND ((o.player_id = public.current_player_id()) OR public.is_admin())))));


--
-- Name: shipping_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: shipping_addresses shipping_addresses_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shipping_addresses_owner_all ON public.shipping_addresses USING (((player_id = public.current_player_id()) OR public.is_admin()));


--
-- Name: sponsor_banners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sponsor_banners ENABLE ROW LEVEL SECURITY;

--
-- Name: sponsor_perks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sponsor_perks ENABLE ROW LEVEL SECURITY;

--
-- Name: sponsors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

--
-- Name: tournament_stages stages_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stages_admin ON public.tournament_stages USING (public.is_admin());


--
-- Name: tournament_stages stages_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stages_read ON public.tournament_stages FOR SELECT USING (true);


--
-- Name: season_standings standings_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY standings_public_read ON public.season_standings FOR SELECT USING (true);


--
-- Name: store_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: store_item_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_item_variants ENABLE ROW LEVEL SECURITY;

--
-- Name: store_item_variants store_item_variants_public_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY store_item_variants_public_select ON public.store_item_variants FOR SELECT USING ((is_active = true));


--
-- Name: store_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;

--
-- Name: store_items store_items_public_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY store_items_public_select ON public.store_items FOR SELECT USING ((is_active = true));


--
-- Name: stream_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stream_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: stream_sessions stream_sessions_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stream_sessions_admin_all ON public.stream_sessions USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: stream_sessions stream_sessions_select_owner_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stream_sessions_select_owner_admin ON public.stream_sessions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.streams s
     JOIN public.players p ON ((p.id = s.creator_id)))
  WHERE ((s.id = stream_sessions.stream_id) AND ((p.user_id = auth.uid()) OR public.is_admin())))));


--
-- Name: streams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;

--
-- Name: streams streams_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY streams_admin_all ON public.streams USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: streams streams_public_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY streams_public_select ON public.streams FOR SELECT USING (((is_public = true) AND (deleted_at IS NULL)));


--
-- Name: subscriptions sub_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sub_admin ON public.subscriptions USING (public.is_admin());


--
-- Name: subscriptions sub_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sub_self ON public.subscriptions FOR SELECT USING ((((subscriber_type = 'TEAM'::public.subscriber_owner_type) AND public.is_team_leader(team_id)) OR ((subscriber_type = 'PLAYER'::public.subscriber_owner_type) AND (player_id = public.current_player_id())) OR public.is_admin()));


--
-- Name: subscription_invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: system_burn_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_burn_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members team_members_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_members_manage ON public.team_members USING (((EXISTS ( SELECT 1
   FROM public.teams t
  WHERE ((t.id = team_members.team_id) AND (t.captain_id = public.current_player_id())))) OR public.is_admin()));


--
-- Name: team_members team_members_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_members_public_read ON public.team_members FOR SELECT USING (true);


--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: teams teams_captain_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_captain_manage ON public.teams USING (((captain_id = public.current_player_id()) OR public.is_admin()));


--
-- Name: teams teams_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_public_read ON public.teams FOR SELECT USING ((deleted_at IS NULL));


--
-- Name: teams teams_public_read_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_public_read_policy ON public.teams FOR SELECT USING (true);


--
-- Name: prediction_tickets tickets_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tickets_self ON public.prediction_tickets FOR SELECT USING (((player_id = public.current_player_id()) OR public.is_admin()));


--
-- Name: tournament_registrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: tournament_stages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tournament_stages ENABLE ROW LEVEL SECURITY;

--
-- Name: tournament_stages tournament_stages_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tournament_stages_admin_write ON public.tournament_stages USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: tournament_stages tournament_stages_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tournament_stages_public_read ON public.tournament_stages FOR SELECT USING (true);


--
-- Name: tournaments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

--
-- Name: tournaments tournaments_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tournaments_admin_write ON public.tournaments USING (((auth.jwt() ->> 'role'::text) = 'ORG_ADMIN'::text));


--
-- Name: tournaments tournaments_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tournaments_public_read ON public.tournaments FOR SELECT USING (true);


--
-- Name: marketplace_trade_history trade_history_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trade_history_read ON public.marketplace_trade_history FOR SELECT USING (true);


--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles user_roles_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_admin_all ON public.user_roles USING (public.is_admin());


--
-- Name: user_roles user_roles_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_public_read ON public.user_roles FOR SELECT USING ((revoked_at IS NULL));


--
-- Name: vendors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

--
-- Name: vendors vendors_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendors_read ON public.vendors FOR SELECT USING ((is_active = true));


--
-- Name: vendors vendors_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendors_self ON public.vendors USING (((player_id = public.current_player_id()) OR public.is_admin()));


--
-- Name: map_vetoes vetoes_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vetoes_read ON public.map_vetoes FOR SELECT USING (true);


--
-- Name: map_vetoes vetoes_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vetoes_write ON public.map_vetoes USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: watch_heartbeats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.watch_heartbeats ENABLE ROW LEVEL SECURITY;

--
-- Name: watch_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.watch_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION admin_revert_prediction_pool(p_pool_id uuid, p_admin_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_revert_prediction_pool(p_pool_id uuid, p_admin_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_revert_prediction_pool(p_pool_id uuid, p_admin_id uuid) TO service_role;


--
-- Name: FUNCTION admin_void_match_and_refund(p_match_id uuid, p_admin_id uuid, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_void_match_and_refund(p_match_id uuid, p_admin_id uuid, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_void_match_and_refund(p_match_id uuid, p_admin_id uuid, p_reason text) TO service_role;


--
-- Name: FUNCTION advance_bracket_node(p_match_id uuid, p_winner_team_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.advance_bracket_node(p_match_id uuid, p_winner_team_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.advance_bracket_node(p_match_id uuid, p_winner_team_id uuid) TO service_role;


--
-- Name: FUNCTION approve_scrim_room(p_room_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.approve_scrim_room(p_room_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.approve_scrim_room(p_room_id uuid) TO service_role;


--
-- Name: FUNCTION audit_stage_status_change(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.audit_stage_status_change() TO anon;
GRANT ALL ON FUNCTION public.audit_stage_status_change() TO authenticated;
GRANT ALL ON FUNCTION public.audit_stage_status_change() TO service_role;


--
-- Name: FUNCTION buy_prediction_ticket(p_pool_id uuid, p_player_id uuid, p_predicted_team_id uuid, p_tier public.prediction_ticket_tier_type, p_ap_amount bigint, p_idempotency_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.buy_prediction_ticket(p_pool_id uuid, p_player_id uuid, p_predicted_team_id uuid, p_tier public.prediction_ticket_tier_type, p_ap_amount bigint, p_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.buy_prediction_ticket(p_pool_id uuid, p_player_id uuid, p_predicted_team_id uuid, p_tier public.prediction_ticket_tier_type, p_ap_amount bigint, p_idempotency_key text) TO service_role;


--
-- Name: FUNCTION buyout_athlete_listing(p_listing_id uuid, p_buyer_player_id uuid, p_destination_team_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.buyout_athlete_listing(p_listing_id uuid, p_buyer_player_id uuid, p_destination_team_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.buyout_athlete_listing(p_listing_id uuid, p_buyer_player_id uuid, p_destination_team_id uuid) TO service_role;


--
-- Name: FUNCTION buyout_marketplace_item(p_listing_id uuid, p_buyer_id uuid, p_idempotency_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.buyout_marketplace_item(p_listing_id uuid, p_buyer_id uuid, p_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.buyout_marketplace_item(p_listing_id uuid, p_buyer_id uuid, p_idempotency_key text) TO service_role;


--
-- Name: FUNCTION check_athlete_roster_lock(p_player_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.check_athlete_roster_lock(p_player_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_athlete_roster_lock(p_player_id uuid) TO service_role;


--
-- Name: FUNCTION check_receiver_status_on_escrow(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.check_receiver_status_on_escrow() TO anon;
GRANT ALL ON FUNCTION public.check_receiver_status_on_escrow() TO authenticated;
GRANT ALL ON FUNCTION public.check_receiver_status_on_escrow() TO service_role;


--
-- Name: FUNCTION checkout_order(p_order_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.checkout_order(p_order_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.checkout_order(p_order_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.checkout_order(p_order_id uuid) TO service_role;


--
-- Name: FUNCTION claim_daily_quest_reward(p_player_id uuid, p_quest_id character varying, p_idempotency_key character varying); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.claim_daily_quest_reward(p_player_id uuid, p_quest_id character varying, p_idempotency_key character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_daily_quest_reward(p_player_id uuid, p_quest_id character varying, p_idempotency_key character varying) TO authenticated;
GRANT ALL ON FUNCTION public.claim_daily_quest_reward(p_player_id uuid, p_quest_id character varying, p_idempotency_key character varying) TO service_role;


--
-- Name: FUNCTION claim_mercy_sub_slot(p_ticket_id uuid, p_ringer_player_id uuid, p_idempotency_key character varying); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.claim_mercy_sub_slot(p_ticket_id uuid, p_ringer_player_id uuid, p_idempotency_key character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_mercy_sub_slot(p_ticket_id uuid, p_ringer_player_id uuid, p_idempotency_key character varying) TO service_role;


--
-- Name: FUNCTION claim_watch_reward(p_session_id uuid, p_idempotency_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.claim_watch_reward(p_session_id uuid, p_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_watch_reward(p_session_id uuid, p_idempotency_key text) TO service_role;


--
-- Name: FUNCTION clean_expired_orders(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.clean_expired_orders() FROM PUBLIC;
GRANT ALL ON FUNCTION public.clean_expired_orders() TO service_role;


--
-- Name: FUNCTION clean_revoked_game_account(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.clean_revoked_game_account() TO anon;
GRANT ALL ON FUNCTION public.clean_revoked_game_account() TO authenticated;
GRANT ALL ON FUNCTION public.clean_revoked_game_account() TO service_role;


--
-- Name: FUNCTION confirm_shelf_payment(p_listing_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.confirm_shelf_payment(p_listing_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.confirm_shelf_payment(p_listing_id uuid) TO service_role;


--
-- Name: FUNCTION consume_p2p_transfer_token(p_jti text, p_sender_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.consume_p2p_transfer_token(p_jti text, p_sender_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.consume_p2p_transfer_token(p_jti text, p_sender_id uuid) TO service_role;


--
-- Name: FUNCTION create_marketplace_listing(p_vendor_id uuid, p_item_title text, p_description text, p_image_urls jsonb, p_currency_type public.listing_currency_type, p_floor_price numeric, p_buyout_price numeric, p_is_paid_slot boolean, p_auction_ends_at timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_marketplace_listing(p_vendor_id uuid, p_item_title text, p_description text, p_image_urls jsonb, p_currency_type public.listing_currency_type, p_floor_price numeric, p_buyout_price numeric, p_is_paid_slot boolean, p_auction_ends_at timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_marketplace_listing(p_vendor_id uuid, p_item_title text, p_description text, p_image_urls jsonb, p_currency_type public.listing_currency_type, p_floor_price numeric, p_buyout_price numeric, p_is_paid_slot boolean, p_auction_ends_at timestamp with time zone) TO service_role;


--
-- Name: FUNCTION create_scrim_room(p_title character varying, p_creator_player_id uuid, p_scheduled_at timestamp with time zone, p_min_ap_stake numeric, p_target_tier_min character varying, p_target_tier_max character varying, p_idempotency_key character varying); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_scrim_room(p_title character varying, p_creator_player_id uuid, p_scheduled_at timestamp with time zone, p_min_ap_stake numeric, p_target_tier_min character varying, p_target_tier_max character varying, p_idempotency_key character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_scrim_room(p_title character varying, p_creator_player_id uuid, p_scheduled_at timestamp with time zone, p_min_ap_stake numeric, p_target_tier_min character varying, p_target_tier_max character varying, p_idempotency_key character varying) TO service_role;


--
-- Name: FUNCTION create_store_order(p_items_json jsonb, p_address_id uuid, p_idempotency_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_store_order(p_items_json jsonb, p_address_id uuid, p_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_store_order(p_items_json jsonb, p_address_id uuid, p_idempotency_key text) TO authenticated;
GRANT ALL ON FUNCTION public.create_store_order(p_items_json jsonb, p_address_id uuid, p_idempotency_key text) TO service_role;


--
-- Name: FUNCTION create_subscription_invoice(p_plan_code text, p_subscriber_type public.subscriber_owner_type, p_subscriber_id uuid, p_idempotency_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_subscription_invoice(p_plan_code text, p_subscriber_type public.subscriber_owner_type, p_subscriber_id uuid, p_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_subscription_invoice(p_plan_code text, p_subscriber_type public.subscriber_owner_type, p_subscriber_id uuid, p_idempotency_key text) TO service_role;


--
-- Name: FUNCTION credit_watch_v2_heartbeat(p_session_id uuid, p_player_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.credit_watch_v2_heartbeat(p_session_id uuid, p_player_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.credit_watch_v2_heartbeat(p_session_id uuid, p_player_id uuid) TO service_role;


--
-- Name: FUNCTION current_player_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.current_player_id() TO anon;
GRANT ALL ON FUNCTION public.current_player_id() TO authenticated;
GRANT ALL ON FUNCTION public.current_player_id() TO service_role;


--
-- Name: FUNCTION deduct_player_ap_fine(p_player_id uuid, p_amount numeric, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deduct_player_ap_fine(p_player_id uuid, p_amount numeric, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deduct_player_ap_fine(p_player_id uuid, p_amount numeric, p_reason text) TO service_role;


--
-- Name: FUNCTION dispute_escrow_and_refund(p_escrow_id uuid, p_sender_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.dispute_escrow_and_refund(p_escrow_id uuid, p_sender_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.dispute_escrow_and_refund(p_escrow_id uuid, p_sender_id uuid) TO service_role;


--
-- Name: FUNCTION enforce_listing_state_transition(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.enforce_listing_state_transition() TO anon;
GRANT ALL ON FUNCTION public.enforce_listing_state_transition() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_listing_state_transition() TO service_role;


--
-- Name: FUNCTION enforce_single_team_per_game(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.enforce_single_team_per_game() TO anon;
GRANT ALL ON FUNCTION public.enforce_single_team_per_game() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_single_team_per_game() TO service_role;


--
-- Name: FUNCTION equip_inventory_item(p_variant_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.equip_inventory_item(p_variant_id uuid) TO anon;
GRANT ALL ON FUNCTION public.equip_inventory_item(p_variant_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.equip_inventory_item(p_variant_id uuid) TO service_role;


--
-- Name: FUNCTION generate_athlete_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.generate_athlete_id() TO anon;
GRANT ALL ON FUNCTION public.generate_athlete_id() TO authenticated;
GRANT ALL ON FUNCTION public.generate_athlete_id() TO service_role;


--
-- Name: FUNCTION get_athlete_telemetry_dashboard(p_player_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_athlete_telemetry_dashboard(p_player_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_athlete_telemetry_dashboard(p_player_id uuid) TO service_role;


--
-- Name: FUNCTION get_athlete_telemetry_dashboard_v26(p_player_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_athlete_telemetry_dashboard_v26(p_player_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_athlete_telemetry_dashboard_v26(p_player_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_athlete_telemetry_dashboard_v26(p_player_id uuid) TO service_role;


--
-- Name: FUNCTION get_daily_unverified_bid_total(p_player_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_daily_unverified_bid_total(p_player_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_daily_unverified_bid_total(p_player_id uuid) TO service_role;


--
-- Name: FUNCTION get_plan_ap_cost(p_plan_code text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_plan_ap_cost(p_plan_code text) TO anon;
GRANT ALL ON FUNCTION public.get_plan_ap_cost(p_plan_code text) TO authenticated;
GRANT ALL ON FUNCTION public.get_plan_ap_cost(p_plan_code text) TO service_role;


--
-- Name: FUNCTION handle_affiliate_on_signup(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_affiliate_on_signup() TO anon;
GRANT ALL ON FUNCTION public.handle_affiliate_on_signup() TO authenticated;
GRANT ALL ON FUNCTION public.handle_affiliate_on_signup() TO service_role;


--
-- Name: FUNCTION handle_crypto_revert(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_crypto_revert() TO anon;
GRANT ALL ON FUNCTION public.handle_crypto_revert() TO authenticated;
GRANT ALL ON FUNCTION public.handle_crypto_revert() TO service_role;


--
-- Name: FUNCTION handle_new_user_signup(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user_signup() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user_signup() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user_signup() TO service_role;


--
-- Name: FUNCTION increment_banner_click(p_banner_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.increment_banner_click(p_banner_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.increment_banner_click(p_banner_id uuid) TO service_role;


--
-- Name: FUNCTION increment_banner_impression(p_banner_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.increment_banner_impression(p_banner_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.increment_banner_impression(p_banner_id uuid) TO service_role;


--
-- Name: FUNCTION increment_banner_metric(p_banner_id uuid, p_metric_type text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.increment_banner_metric(p_banner_id uuid, p_metric_type text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.increment_banner_metric(p_banner_id uuid, p_metric_type text) TO service_role;


--
-- Name: FUNCTION inject_jackpot_bonus(p_pool_id uuid, p_season_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.inject_jackpot_bonus(p_pool_id uuid, p_season_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.inject_jackpot_bonus(p_pool_id uuid, p_season_id uuid) TO service_role;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


--
-- Name: FUNCTION is_referee_of(p_match_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_referee_of(p_match_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_referee_of(p_match_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_referee_of(p_match_id uuid) TO service_role;


--
-- Name: FUNCTION is_team_leader(p_team_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_team_leader(p_team_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_team_leader(p_team_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_team_leader(p_team_id uuid) TO service_role;


--
-- Name: FUNCTION issue_p2p_otp_challenge(p_sender_id uuid, p_otp_code_hash text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.issue_p2p_otp_challenge(p_sender_id uuid, p_otp_code_hash text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.issue_p2p_otp_challenge(p_sender_id uuid, p_otp_code_hash text) TO service_role;


--
-- Name: FUNCTION lock_prediction_pool_on_match_live(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.lock_prediction_pool_on_match_live() TO anon;
GRANT ALL ON FUNCTION public.lock_prediction_pool_on_match_live() TO authenticated;
GRANT ALL ON FUNCTION public.lock_prediction_pool_on_match_live() TO service_role;


--
-- Name: FUNCTION log_lobby_system_message(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.log_lobby_system_message() TO anon;
GRANT ALL ON FUNCTION public.log_lobby_system_message() TO authenticated;
GRANT ALL ON FUNCTION public.log_lobby_system_message() TO service_role;


--
-- Name: FUNCTION mark_subscription_invoice_paid(p_invoice_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.mark_subscription_invoice_paid(p_invoice_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.mark_subscription_invoice_paid(p_invoice_id uuid) TO service_role;


--
-- Name: FUNCTION match_ffxi_athlete_bid(p_listing_id uuid, p_bidder_player_id uuid, p_destination_team_id uuid, p_bid_amount_ap integer, p_idempotency_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.match_ffxi_athlete_bid(p_listing_id uuid, p_bidder_player_id uuid, p_destination_team_id uuid, p_bid_amount_ap integer, p_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.match_ffxi_athlete_bid(p_listing_id uuid, p_bidder_player_id uuid, p_destination_team_id uuid, p_bid_amount_ap integer, p_idempotency_key text) TO service_role;


--
-- Name: FUNCTION match_ffxi_blind_bid(p_listing_id uuid, p_bidder_id uuid, p_bid_amount numeric, p_idempotency_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.match_ffxi_blind_bid(p_listing_id uuid, p_bidder_id uuid, p_bid_amount numeric, p_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.match_ffxi_blind_bid(p_listing_id uuid, p_bidder_id uuid, p_bid_amount numeric, p_idempotency_key text) TO service_role;


--
-- Name: FUNCTION move_ap(p_player_id uuid, p_amount numeric, p_reason text, p_idempotency_key text, p_metadata jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.move_ap(p_player_id uuid, p_amount numeric, p_reason text, p_idempotency_key text, p_metadata jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.move_ap(p_player_id uuid, p_amount numeric, p_reason text, p_idempotency_key text, p_metadata jsonb) TO service_role;


--
-- Name: FUNCTION move_ap(p_player_id uuid, p_amount numeric, p_reason text, p_idempotency_key text, p_reference_type text, p_reference_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.move_ap(p_player_id uuid, p_amount numeric, p_reason text, p_idempotency_key text, p_reference_type text, p_reference_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.move_ap(p_player_id uuid, p_amount numeric, p_reason text, p_idempotency_key text, p_reference_type text, p_reference_id uuid) TO service_role;


--
-- Name: FUNCTION notify_match_status_change(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.notify_match_status_change() TO anon;
GRANT ALL ON FUNCTION public.notify_match_status_change() TO authenticated;
GRANT ALL ON FUNCTION public.notify_match_status_change() TO service_role;


--
-- Name: FUNCTION open_prediction_pool(p_match_id uuid, p_house_fee_percent numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.open_prediction_pool(p_match_id uuid, p_house_fee_percent numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.open_prediction_pool(p_match_id uuid, p_house_fee_percent numeric) TO service_role;


--
-- Name: FUNCTION prevent_audit_mutation(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.prevent_audit_mutation() TO anon;
GRANT ALL ON FUNCTION public.prevent_audit_mutation() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_audit_mutation() TO service_role;


--
-- Name: FUNCTION process_affiliate_kyc_bonus(p_referee_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.process_affiliate_kyc_bonus(p_referee_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.process_affiliate_kyc_bonus(p_referee_id uuid) TO service_role;


--
-- Name: FUNCTION process_affiliate_spend_cashback(p_buyer_id uuid, p_spend_amount_ap numeric, p_reference_tx_id character varying); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.process_affiliate_spend_cashback(p_buyer_id uuid, p_spend_amount_ap numeric, p_reference_tx_id character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION public.process_affiliate_spend_cashback(p_buyer_id uuid, p_spend_amount_ap numeric, p_reference_tx_id character varying) TO service_role;


--
-- Name: FUNCTION record_match_round_event(p_match_id uuid, p_game_number integer, p_round_number integer, p_winner_team_id uuid, p_win_condition public.win_condition_enum, p_idempotency_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.record_match_round_event(p_match_id uuid, p_game_number integer, p_round_number integer, p_winner_team_id uuid, p_win_condition public.win_condition_enum, p_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_match_round_event(p_match_id uuid, p_game_number integer, p_round_number integer, p_winner_team_id uuid, p_win_condition public.win_condition_enum, p_idempotency_key text) TO service_role;


--
-- Name: FUNCTION redeem_sponsor_perk(p_redemption_id uuid, p_redeemed_amount numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.redeem_sponsor_perk(p_redemption_id uuid, p_redeemed_amount numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.redeem_sponsor_perk(p_redemption_id uuid, p_redeemed_amount numeric) TO service_role;


--
-- Name: FUNCTION refresh_team_analytics(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.refresh_team_analytics() FROM PUBLIC;
GRANT ALL ON FUNCTION public.refresh_team_analytics() TO service_role;


--
-- Name: FUNCTION release_escrow_to_receiver(p_escrow_id uuid, p_auto boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.release_escrow_to_receiver(p_escrow_id uuid, p_auto boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.release_escrow_to_receiver(p_escrow_id uuid, p_auto boolean) TO service_role;


--
-- Name: FUNCTION renew_subscription_with_ap(p_subscription_id uuid, p_player_id uuid, p_idempotency_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.renew_subscription_with_ap(p_subscription_id uuid, p_player_id uuid, p_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.renew_subscription_with_ap(p_subscription_id uuid, p_player_id uuid, p_idempotency_key text) TO service_role;


--
-- Name: FUNCTION request_perk_redemption(p_perk_id uuid, p_redeemed_by_player_id uuid, p_amount numeric, p_perk_token text, p_redemption_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.request_perk_redemption(p_perk_id uuid, p_redeemed_by_player_id uuid, p_amount numeric, p_perk_token text, p_redemption_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.request_perk_redemption(p_perk_id uuid, p_redeemed_by_player_id uuid, p_amount numeric, p_perk_token text, p_redemption_id uuid) TO service_role;


--
-- Name: FUNCTION resolve_expired_ready_checks(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.resolve_expired_ready_checks() FROM PUBLIC;
GRANT ALL ON FUNCTION public.resolve_expired_ready_checks() TO service_role;


--
-- Name: FUNCTION resolve_match_season_id(p_match_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.resolve_match_season_id(p_match_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.resolve_match_season_id(p_match_id uuid) TO service_role;


--
-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: FUNCTION settle_payment_intent(p_payment_intent_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.settle_payment_intent(p_payment_intent_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.settle_payment_intent(p_payment_intent_id uuid) TO service_role;


--
-- Name: FUNCTION settle_prediction_pool(p_pool_id uuid, p_winning_team_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.settle_prediction_pool(p_pool_id uuid, p_winning_team_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.settle_prediction_pool(p_pool_id uuid, p_winning_team_id uuid) TO service_role;


--
-- Name: FUNCTION settle_scrim_escrow(p_room_id uuid, p_winner_team_side character varying, p_idempotency_key character varying); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.settle_scrim_escrow(p_room_id uuid, p_winner_team_side character varying, p_idempotency_key character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION public.settle_scrim_escrow(p_room_id uuid, p_winner_team_side character varying, p_idempotency_key character varying) TO service_role;


--
-- Name: FUNCTION sweep_subscription_lifecycle(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sweep_subscription_lifecycle() FROM PUBLIC;
GRANT ALL ON FUNCTION public.sweep_subscription_lifecycle() TO service_role;


--
-- Name: FUNCTION transfer_ap_to_escrow(p_sender_id uuid, p_receiver_id uuid, p_amount_ap bigint, p_idempotency_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.transfer_ap_to_escrow(p_sender_id uuid, p_receiver_id uuid, p_amount_ap bigint, p_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.transfer_ap_to_escrow(p_sender_id uuid, p_receiver_id uuid, p_amount_ap bigint, p_idempotency_key text) TO service_role;


--
-- Name: FUNCTION trg_auto_create_match_from_bracket(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.trg_auto_create_match_from_bracket() TO anon;
GRANT ALL ON FUNCTION public.trg_auto_create_match_from_bracket() TO authenticated;
GRANT ALL ON FUNCTION public.trg_auto_create_match_from_bracket() TO service_role;


--
-- Name: FUNCTION trg_enforce_athlete_roster_lock(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.trg_enforce_athlete_roster_lock() TO anon;
GRANT ALL ON FUNCTION public.trg_enforce_athlete_roster_lock() TO authenticated;
GRANT ALL ON FUNCTION public.trg_enforce_athlete_roster_lock() TO service_role;


--
-- Name: FUNCTION trigger_mercy_beacon(p_room_id uuid, p_missing_team_side character varying, p_required_role public.valorant_agent_role_enum); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.trigger_mercy_beacon(p_room_id uuid, p_missing_team_side character varying, p_required_role public.valorant_agent_role_enum) FROM PUBLIC;
GRANT ALL ON FUNCTION public.trigger_mercy_beacon(p_room_id uuid, p_missing_team_side character varying, p_required_role public.valorant_agent_role_enum) TO service_role;


--
-- Name: FUNCTION unequip_inventory_item(p_variant_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.unequip_inventory_item(p_variant_id uuid) TO anon;
GRANT ALL ON FUNCTION public.unequip_inventory_item(p_variant_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.unequip_inventory_item(p_variant_id uuid) TO service_role;


--
-- Name: FUNCTION validate_match_transition_guard(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_match_transition_guard() TO anon;
GRANT ALL ON FUNCTION public.validate_match_transition_guard() TO authenticated;
GRANT ALL ON FUNCTION public.validate_match_transition_guard() TO service_role;


--
-- Name: FUNCTION verify_and_redeem_partner_coupon(p_player_id uuid, p_coupon_code character varying, p_purchase_amount_ap integer, p_idempotency_key character varying); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.verify_and_redeem_partner_coupon(p_player_id uuid, p_coupon_code character varying, p_purchase_amount_ap integer, p_idempotency_key character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION public.verify_and_redeem_partner_coupon(p_player_id uuid, p_coupon_code character varying, p_purchase_amount_ap integer, p_idempotency_key character varying) TO authenticated;
GRANT ALL ON FUNCTION public.verify_and_redeem_partner_coupon(p_player_id uuid, p_coupon_code character varying, p_purchase_amount_ap integer, p_idempotency_key character varying) TO service_role;


--
-- Name: FUNCTION verify_p2p_otp_challenge(p_sender_id uuid, p_otp_code_hash text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.verify_p2p_otp_challenge(p_sender_id uuid, p_otp_code_hash text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.verify_p2p_otp_challenge(p_sender_id uuid, p_otp_code_hash text) TO service_role;


--
-- Name: TABLE abuse_flags; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.abuse_flags TO anon;
GRANT ALL ON TABLE public.abuse_flags TO authenticated;
GRANT ALL ON TABLE public.abuse_flags TO service_role;


--
-- Name: TABLE affiliate_codes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.affiliate_codes TO anon;
GRANT ALL ON TABLE public.affiliate_codes TO authenticated;
GRANT ALL ON TABLE public.affiliate_codes TO service_role;


--
-- Name: TABLE affiliate_referrals; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.affiliate_referrals TO anon;
GRANT ALL ON TABLE public.affiliate_referrals TO authenticated;
GRANT ALL ON TABLE public.affiliate_referrals TO service_role;


--
-- Name: TABLE affiliate_rewards_ledger; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.affiliate_rewards_ledger TO anon;
GRANT ALL ON TABLE public.affiliate_rewards_ledger TO authenticated;
GRANT ALL ON TABLE public.affiliate_rewards_ledger TO service_role;


--
-- Name: TABLE ap_daily_limits; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ap_daily_limits TO anon;
GRANT ALL ON TABLE public.ap_daily_limits TO authenticated;
GRANT ALL ON TABLE public.ap_daily_limits TO service_role;


--
-- Name: TABLE ap_earning_rules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ap_earning_rules TO anon;
GRANT ALL ON TABLE public.ap_earning_rules TO authenticated;
GRANT ALL ON TABLE public.ap_earning_rules TO service_role;


--
-- Name: TABLE ap_escrow; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ap_escrow TO anon;
GRANT ALL ON TABLE public.ap_escrow TO authenticated;
GRANT ALL ON TABLE public.ap_escrow TO service_role;


--
-- Name: TABLE ap_ledger; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ap_ledger TO anon;
GRANT ALL ON TABLE public.ap_ledger TO authenticated;
GRANT ALL ON TABLE public.ap_ledger TO service_role;


--
-- Name: SEQUENCE athlete_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.athlete_id_seq TO anon;
GRANT ALL ON SEQUENCE public.athlete_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.athlete_id_seq TO service_role;


--
-- Name: TABLE athlete_market_bids; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.athlete_market_bids TO anon;
GRANT ALL ON TABLE public.athlete_market_bids TO authenticated;
GRANT ALL ON TABLE public.athlete_market_bids TO service_role;


--
-- Name: TABLE athlete_market_listings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.athlete_market_listings TO anon;
GRANT ALL ON TABLE public.athlete_market_listings TO authenticated;
GRANT ALL ON TABLE public.athlete_market_listings TO service_role;


--
-- Name: TABLE athlete_transfer_history; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.athlete_transfer_history TO anon;
GRANT ALL ON TABLE public.athlete_transfer_history TO authenticated;
GRANT ALL ON TABLE public.athlete_transfer_history TO service_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;


--
-- Name: SEQUENCE audit_logs_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO service_role;


--
-- Name: TABLE bracket_nodes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bracket_nodes TO anon;
GRANT ALL ON TABLE public.bracket_nodes TO authenticated;
GRANT ALL ON TABLE public.bracket_nodes TO service_role;


--
-- Name: TABLE brand_themes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.brand_themes TO anon;
GRANT ALL ON TABLE public.brand_themes TO authenticated;
GRANT ALL ON TABLE public.brand_themes TO service_role;


--
-- Name: TABLE circuit_standings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.circuit_standings TO anon;
GRANT ALL ON TABLE public.circuit_standings TO authenticated;
GRANT ALL ON TABLE public.circuit_standings TO service_role;


--
-- Name: TABLE circuits; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.circuits TO anon;
GRANT ALL ON TABLE public.circuits TO authenticated;
GRANT ALL ON TABLE public.circuits TO service_role;


--
-- Name: TABLE crypto_payments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.crypto_payments TO anon;
GRANT ALL ON TABLE public.crypto_payments TO authenticated;
GRANT ALL ON TABLE public.crypto_payments TO service_role;


--
-- Name: TABLE daily_quests; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.daily_quests TO anon;
GRANT ALL ON TABLE public.daily_quests TO authenticated;
GRANT ALL ON TABLE public.daily_quests TO service_role;


--
-- Name: TABLE disputes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.disputes TO anon;
GRANT ALL ON TABLE public.disputes TO authenticated;
GRANT ALL ON TABLE public.disputes TO service_role;


--
-- Name: TABLE game_accounts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.game_accounts TO anon;
GRANT ALL ON TABLE public.game_accounts TO authenticated;
GRANT ALL ON TABLE public.game_accounts TO service_role;


--
-- Name: TABLE games; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.games TO anon;
GRANT ALL ON TABLE public.games TO authenticated;
GRANT ALL ON TABLE public.games TO service_role;


--
-- Name: TABLE map_vetoes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.map_vetoes TO anon;
GRANT ALL ON TABLE public.map_vetoes TO authenticated;
GRANT ALL ON TABLE public.map_vetoes TO service_role;


--
-- Name: TABLE marketplace_listings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.marketplace_listings TO anon;
GRANT ALL ON TABLE public.marketplace_listings TO authenticated;
GRANT ALL ON TABLE public.marketplace_listings TO service_role;


--
-- Name: TABLE marketplace_trade_history; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.marketplace_trade_history TO anon;
GRANT ALL ON TABLE public.marketplace_trade_history TO authenticated;
GRANT ALL ON TABLE public.marketplace_trade_history TO service_role;


--
-- Name: TABLE match_decisions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.match_decisions TO anon;
GRANT ALL ON TABLE public.match_decisions TO authenticated;
GRANT ALL ON TABLE public.match_decisions TO service_role;


--
-- Name: TABLE match_games; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.match_games TO anon;
GRANT ALL ON TABLE public.match_games TO authenticated;
GRANT ALL ON TABLE public.match_games TO service_role;


--
-- Name: TABLE match_lobby_messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.match_lobby_messages TO anon;
GRANT ALL ON TABLE public.match_lobby_messages TO authenticated;
GRANT ALL ON TABLE public.match_lobby_messages TO service_role;


--
-- Name: TABLE match_participant_hit_stats; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.match_participant_hit_stats TO anon;
GRANT ALL ON TABLE public.match_participant_hit_stats TO authenticated;
GRANT ALL ON TABLE public.match_participant_hit_stats TO service_role;


--
-- Name: TABLE match_participant_weapons; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.match_participant_weapons TO anon;
GRANT ALL ON TABLE public.match_participant_weapons TO authenticated;
GRANT ALL ON TABLE public.match_participant_weapons TO service_role;


--
-- Name: TABLE match_participants; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.match_participants TO anon;
GRANT ALL ON TABLE public.match_participants TO authenticated;
GRANT ALL ON TABLE public.match_participants TO service_role;


--
-- Name: TABLE match_replays; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.match_replays TO anon;
GRANT ALL ON TABLE public.match_replays TO authenticated;
GRANT ALL ON TABLE public.match_replays TO service_role;


--
-- Name: TABLE match_reports; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.match_reports TO anon;
GRANT ALL ON TABLE public.match_reports TO authenticated;
GRANT ALL ON TABLE public.match_reports TO service_role;


--
-- Name: TABLE match_room_messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.match_room_messages TO anon;
GRANT ALL ON TABLE public.match_room_messages TO authenticated;
GRANT ALL ON TABLE public.match_room_messages TO service_role;


--
-- Name: TABLE match_room_participants; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.match_room_participants TO anon;
GRANT ALL ON TABLE public.match_room_participants TO authenticated;
GRANT ALL ON TABLE public.match_room_participants TO service_role;


--
-- Name: TABLE match_room_staff; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.match_room_staff TO anon;
GRANT ALL ON TABLE public.match_room_staff TO authenticated;
GRANT ALL ON TABLE public.match_room_staff TO service_role;


--
-- Name: TABLE match_rooms; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.match_rooms TO anon;
GRANT ALL ON TABLE public.match_rooms TO authenticated;
GRANT ALL ON TABLE public.match_rooms TO service_role;


--
-- Name: TABLE match_rounds; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.match_rounds TO anon;
GRANT ALL ON TABLE public.match_rounds TO authenticated;
GRANT ALL ON TABLE public.match_rounds TO service_role;


--
-- Name: TABLE match_state_transitions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.match_state_transitions TO anon;
GRANT ALL ON TABLE public.match_state_transitions TO authenticated;
GRANT ALL ON TABLE public.match_state_transitions TO service_role;


--
-- Name: SEQUENCE match_state_transitions_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.match_state_transitions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.match_state_transitions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.match_state_transitions_id_seq TO service_role;


--
-- Name: TABLE matches; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.matches TO anon;
GRANT ALL ON TABLE public.matches TO authenticated;
GRANT ALL ON TABLE public.matches TO service_role;


--
-- Name: TABLE mercy_fill_tickets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mercy_fill_tickets TO anon;
GRANT ALL ON TABLE public.mercy_fill_tickets TO authenticated;
GRANT ALL ON TABLE public.mercy_fill_tickets TO service_role;


--
-- Name: TABLE mercy_sub_pool; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mercy_sub_pool TO anon;
GRANT ALL ON TABLE public.mercy_sub_pool TO authenticated;
GRANT ALL ON TABLE public.mercy_sub_pool TO service_role;


--
-- Name: TABLE mv_team_analytics; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mv_team_analytics TO anon;
GRANT ALL ON TABLE public.mv_team_analytics TO authenticated;
GRANT ALL ON TABLE public.mv_team_analytics TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE order_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.order_items TO anon;
GRANT ALL ON TABLE public.order_items TO authenticated;
GRANT ALL ON TABLE public.order_items TO service_role;


--
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.orders TO anon;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;


--
-- Name: TABLE organizations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.organizations TO anon;
GRANT ALL ON TABLE public.organizations TO authenticated;
GRANT ALL ON TABLE public.organizations TO service_role;


--
-- Name: TABLE p2p_transfer_otp_challenges; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.p2p_transfer_otp_challenges TO anon;
GRANT ALL ON TABLE public.p2p_transfer_otp_challenges TO authenticated;
GRANT ALL ON TABLE public.p2p_transfer_otp_challenges TO service_role;


--
-- Name: TABLE p2p_transfer_used_tokens; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.p2p_transfer_used_tokens TO anon;
GRANT ALL ON TABLE public.p2p_transfer_used_tokens TO authenticated;
GRANT ALL ON TABLE public.p2p_transfer_used_tokens TO service_role;


--
-- Name: TABLE partner_coupon_redemptions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.partner_coupon_redemptions TO anon;
GRANT ALL ON TABLE public.partner_coupon_redemptions TO authenticated;
GRANT ALL ON TABLE public.partner_coupon_redemptions TO service_role;


--
-- Name: TABLE partner_coupons; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.partner_coupons TO anon;
GRANT ALL ON TABLE public.partner_coupons TO authenticated;
GRANT ALL ON TABLE public.partner_coupons TO service_role;


--
-- Name: TABLE payment_intents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payment_intents TO anon;
GRANT ALL ON TABLE public.payment_intents TO authenticated;
GRANT ALL ON TABLE public.payment_intents TO service_role;


--
-- Name: TABLE perk_redemptions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.perk_redemptions TO anon;
GRANT ALL ON TABLE public.perk_redemptions TO authenticated;
GRANT ALL ON TABLE public.perk_redemptions TO service_role;


--
-- Name: TABLE player_daily_quests; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.player_daily_quests TO anon;
GRANT ALL ON TABLE public.player_daily_quests TO authenticated;
GRANT ALL ON TABLE public.player_daily_quests TO service_role;


--
-- Name: TABLE player_inventory; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.player_inventory TO anon;
GRANT ALL ON TABLE public.player_inventory TO authenticated;
GRANT ALL ON TABLE public.player_inventory TO service_role;


--
-- Name: TABLE player_stats; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.player_stats TO anon;
GRANT ALL ON TABLE public.player_stats TO authenticated;
GRANT ALL ON TABLE public.player_stats TO service_role;


--
-- Name: TABLE players; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.players TO anon;
GRANT ALL ON TABLE public.players TO authenticated;
GRANT ALL ON TABLE public.players TO service_role;


--
-- Name: TABLE prediction_pools; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.prediction_pools TO anon;
GRANT ALL ON TABLE public.prediction_pools TO authenticated;
GRANT ALL ON TABLE public.prediction_pools TO service_role;


--
-- Name: TABLE prediction_tickets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.prediction_tickets TO anon;
GRANT ALL ON TABLE public.prediction_tickets TO authenticated;
GRANT ALL ON TABLE public.prediction_tickets TO service_role;


--
-- Name: TABLE prize_payouts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.prize_payouts TO anon;
GRANT ALL ON TABLE public.prize_payouts TO authenticated;
GRANT ALL ON TABLE public.prize_payouts TO service_role;


--
-- Name: TABLE refunds; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.refunds TO anon;
GRANT ALL ON TABLE public.refunds TO authenticated;
GRANT ALL ON TABLE public.refunds TO service_role;


--
-- Name: TABLE roster_snapshot_members; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.roster_snapshot_members TO anon;
GRANT ALL ON TABLE public.roster_snapshot_members TO authenticated;
GRANT ALL ON TABLE public.roster_snapshot_members TO service_role;


--
-- Name: TABLE roster_snapshots; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.roster_snapshots TO anon;
GRANT ALL ON TABLE public.roster_snapshots TO authenticated;
GRANT ALL ON TABLE public.roster_snapshots TO service_role;


--
-- Name: TABLE season_jackpot_pools; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.season_jackpot_pools TO anon;
GRANT ALL ON TABLE public.season_jackpot_pools TO authenticated;
GRANT ALL ON TABLE public.season_jackpot_pools TO service_role;


--
-- Name: TABLE season_standings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.season_standings TO anon;
GRANT ALL ON TABLE public.season_standings TO authenticated;
GRANT ALL ON TABLE public.season_standings TO service_role;


--
-- Name: TABLE seasons; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.seasons TO anon;
GRANT ALL ON TABLE public.seasons TO authenticated;
GRANT ALL ON TABLE public.seasons TO service_role;


--
-- Name: TABLE shipments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.shipments TO anon;
GRANT ALL ON TABLE public.shipments TO authenticated;
GRANT ALL ON TABLE public.shipments TO service_role;


--
-- Name: TABLE shipping_addresses; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.shipping_addresses TO anon;
GRANT ALL ON TABLE public.shipping_addresses TO authenticated;
GRANT ALL ON TABLE public.shipping_addresses TO service_role;


--
-- Name: TABLE sponsor_banners; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sponsor_banners TO anon;
GRANT ALL ON TABLE public.sponsor_banners TO authenticated;
GRANT ALL ON TABLE public.sponsor_banners TO service_role;


--
-- Name: TABLE sponsor_perks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sponsor_perks TO anon;
GRANT ALL ON TABLE public.sponsor_perks TO authenticated;
GRANT ALL ON TABLE public.sponsor_perks TO service_role;


--
-- Name: TABLE sponsors; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sponsors TO anon;
GRANT ALL ON TABLE public.sponsors TO authenticated;
GRANT ALL ON TABLE public.sponsors TO service_role;


--
-- Name: TABLE store_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.store_categories TO anon;
GRANT ALL ON TABLE public.store_categories TO authenticated;
GRANT ALL ON TABLE public.store_categories TO service_role;


--
-- Name: TABLE store_item_variants; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.store_item_variants TO anon;
GRANT ALL ON TABLE public.store_item_variants TO authenticated;
GRANT ALL ON TABLE public.store_item_variants TO service_role;


--
-- Name: TABLE store_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.store_items TO anon;
GRANT ALL ON TABLE public.store_items TO authenticated;
GRANT ALL ON TABLE public.store_items TO service_role;


--
-- Name: TABLE stream_sessions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.stream_sessions TO anon;
GRANT ALL ON TABLE public.stream_sessions TO authenticated;
GRANT ALL ON TABLE public.stream_sessions TO service_role;


--
-- Name: TABLE streams; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.streams TO anon;
GRANT ALL ON TABLE public.streams TO authenticated;
GRANT ALL ON TABLE public.streams TO service_role;


--
-- Name: TABLE subscription_invoices; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.subscription_invoices TO anon;
GRANT ALL ON TABLE public.subscription_invoices TO authenticated;
GRANT ALL ON TABLE public.subscription_invoices TO service_role;


--
-- Name: TABLE subscriptions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.subscriptions TO anon;
GRANT ALL ON TABLE public.subscriptions TO authenticated;
GRANT ALL ON TABLE public.subscriptions TO service_role;


--
-- Name: TABLE system_burn_ledger; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.system_burn_ledger TO anon;
GRANT ALL ON TABLE public.system_burn_ledger TO authenticated;
GRANT ALL ON TABLE public.system_burn_ledger TO service_role;


--
-- Name: TABLE team_members; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.team_members TO anon;
GRANT ALL ON TABLE public.team_members TO authenticated;
GRANT ALL ON TABLE public.team_members TO service_role;


--
-- Name: TABLE teams; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.teams TO anon;
GRANT ALL ON TABLE public.teams TO authenticated;
GRANT ALL ON TABLE public.teams TO service_role;


--
-- Name: TABLE tournament_registrations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tournament_registrations TO anon;
GRANT ALL ON TABLE public.tournament_registrations TO authenticated;
GRANT ALL ON TABLE public.tournament_registrations TO service_role;


--
-- Name: TABLE tournament_stages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tournament_stages TO anon;
GRANT ALL ON TABLE public.tournament_stages TO authenticated;
GRANT ALL ON TABLE public.tournament_stages TO service_role;


--
-- Name: TABLE tournaments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tournaments TO anon;
GRANT ALL ON TABLE public.tournaments TO authenticated;
GRANT ALL ON TABLE public.tournaments TO service_role;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;


--
-- Name: TABLE vendors; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.vendors TO anon;
GRANT ALL ON TABLE public.vendors TO authenticated;
GRANT ALL ON TABLE public.vendors TO service_role;


--
-- Name: TABLE watch_heartbeats; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.watch_heartbeats TO anon;
GRANT ALL ON TABLE public.watch_heartbeats TO authenticated;
GRANT ALL ON TABLE public.watch_heartbeats TO service_role;


--
-- Name: TABLE watch_sessions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.watch_sessions TO anon;
GRANT ALL ON TABLE public.watch_sessions TO authenticated;
GRANT ALL ON TABLE public.watch_sessions TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--


