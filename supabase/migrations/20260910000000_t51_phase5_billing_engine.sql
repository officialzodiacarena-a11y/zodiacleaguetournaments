-- =============================================================================
-- MIGRATION: T5.1-T5.3 — Stage 2 Phase 5: Subscription Billing RPCs, Pro
-- Analytics Materialized View & VIP Perk Quota Reset Hook
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น (ห้ามโคลท์รัน)
--
-- Run AFTER migration_stage2_phase5.sql (already applied — creates subscriptions,
-- subscription_invoices, sponsor_perks, perk_redemptions, their ENUMs, indexes,
-- RLS policies and the trg_subscriptions_updated trigger). This migration adds
-- only what that file did NOT include: the billing RPCs, the ap_ledger reason
-- patch, the actual pg_cron schedule (the reference file only left it commented),
-- and the Pro Analytics materialized view.
--
-- Verified against real DB / already-shipped code before writing this file
-- (2026-09-10):
--   * move_ap(p_player_id, p_amount, p_reason, p_idempotency_key, p_reference_type,
--     p_reference_id) already exists (20260908140000_t33_patch_ap_balance_sync.sql)
--     and is the ONLY function allowed to touch players.ap_balance. It already
--     locks the players row via `SELECT ap_balance ... FOR UPDATE` internally —
--     so calling it AFTER locking the subscriptions row below reproduces the
--     required "subscriptions row lock before players row lock" FIFO order
--     exactly, without this migration re-implementing AP balance logic itself.
--   * public.ap_ledger.reason is a free TEXT column with a CHECK constraint
--     (NOT an ENUM type) — current allowed values (verified via migration
--     history) are WATCH_REWARD, CLAWBACK, ADMIN_ADJUSTMENT, STORE_REDEEM,
--     TOP_UP, REFUND_AP_CREDIT, PENALTY_FINE. 'SUBSCRIPTION_RENEWAL' is NOT
--     yet allowed — added below.
--   * public.is_team_leader(p_team_id) and public.is_admin() already exist
--     (20260907120000_t23 / 20260908000000_t24) — reused as-is, not redefined.
--   * ⚠️ public.match_participants only confirmed to have (from already-shipped
--     app/match-result/[matchid]/page.tsx and app/overlay/match/[id]/mvp/route.ts):
--     kills, deaths, assists, acs, adr, headshot_pct, agent_played, player_id,
--     team_id, match_game_id. There is NO tracked migration for this table at
--     all (pre-existing schema drift) and no column anywhere in the shipped
--     codebase for round-by-round positional data, first-blood flags, or economy
--     (buy/eco round) breakdowns. mv_team_analytics below therefore only
--     aggregates the columns that are verifiably real (kills/deaths/assists/acs/
--     adr). heatmap_data, first_blood_pct and economy_breakdown are left as
--     NULL placeholders with a loud comment — DO NOT treat them as populated
--     until อลิส/พี่หยัด confirm the real source columns/tables for that data
--     and this view is patched accordingly.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ap_ledger: allow SUBSCRIPTION_RENEWAL as a valid reason
-- -----------------------------------------------------------------------------
ALTER TABLE public.ap_ledger DROP CONSTRAINT IF EXISTS ap_ledger_reason_check;
ALTER TABLE public.ap_ledger ADD CONSTRAINT ap_ledger_reason_check
    CHECK (reason IN ('WATCH_REWARD', 'CLAWBACK', 'ADMIN_ADJUSTMENT', 'STORE_REDEEM', 'TOP_UP', 'REFUND_AP_CREDIT', 'PENALTY_FINE', 'SUBSCRIPTION_RENEWAL'));

-- -----------------------------------------------------------------------------
-- 2. Plan pricing lookup (server-side source of truth for AP renewal cost —
--    prevents a client from sending an arbitrary p_amount to renew_subscription_with_ap)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_plan_ap_cost(p_plan_code TEXT)
RETURNS BIGINT
LANGUAGE sql IMMUTABLE
AS $$
    SELECT CASE p_plan_code
        WHEN 'PRO_CLUB'     THEN 200
        WHEN 'VIP_CLUB'     THEN 600
        WHEN 'ATHLETE_PASS' THEN 50
        ELSE NULL
    END;
$$;

-- -----------------------------------------------------------------------------
-- 3. create_subscription_invoice() — Sprint 5.1
--    Creates (or reuses, if idempotency_key already used) a PENDING invoice.
--    First-time subscribe is FIAT-only per spec (THB) — AP currency is only
--    valid for RENEWAL via renew_subscription_with_ap(), never for checkout.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_subscription_invoice(
    p_plan_code         TEXT,
    p_subscriber_type   subscriber_owner_type,
    p_subscriber_id     UUID,
    p_idempotency_key   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- -----------------------------------------------------------------------------
-- 4. mark_subscription_invoice_paid() — called by the payment webhook (Omise/
--    crypto, reusing the same gateway plumbing as T3.5) once an invoice is PAID.
--    Activates the subscription for 30 days from now.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_subscription_invoice_paid(p_invoice_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- -----------------------------------------------------------------------------
-- 5. renew_subscription_with_ap() — Sprint 5.1 core RPC
--    Lock order per QA sign-off (Case 1 / Gate 2): subscriptions row FIRST,
--    then move_ap() (which locks players internally). Never reversed.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.renew_subscription_with_ap(
    p_subscription_id  UUID,
    p_player_id        UUID,
    p_idempotency_key  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- -----------------------------------------------------------------------------
-- 6. Grace period / past-due sweeper — advances ACTIVE -> GRACE_PERIOD ->
--    PAST_DUE as valid_until / grace_until pass. Scheduled via pg_cron below
--    alongside the invoice sweep (spec only named the invoice job explicitly,
--    this one is required to make the 5-state machine actually progress —
--    flagged here rather than silently left unscheduled).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sweep_subscription_lifecycle()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- -----------------------------------------------------------------------------
-- 7. pg_cron schedules (the reference migration left these as commented
--    examples — actually scheduling them here)
-- -----------------------------------------------------------------------------
SELECT cron.schedule('expire-pending-invoices', '*/10 * * * *', $$
    UPDATE public.subscription_invoices
    SET status = 'EXPIRED'
    WHERE status = 'PENDING' AND expires_at < NOW();
$$);

SELECT cron.schedule('sweep-subscription-lifecycle', '*/15 * * * *', $$
    SELECT public.sweep_subscription_lifecycle();
$$);

-- -----------------------------------------------------------------------------
-- 8. Pro Analytics — Sprint 5.2
--    ⚠️ See header note: heatmap_data / first_blood_pct / economy_breakdown
--    have no confirmed real source columns anywhere in the shipped schema.
--    Left as NULL placeholders on purpose — do NOT wire the API to promise
--    real values for these three fields until this view is patched.
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_team_analytics AS
SELECT
    mp.team_id,
    COUNT(DISTINCT mp.match_game_id)                       AS games_played,
    ROUND(AVG(mp.kills)::numeric, 2)                       AS avg_kills,
    ROUND(AVG(mp.deaths)::numeric, 2)                      AS avg_deaths,
    ROUND(AVG(mp.assists)::numeric, 2)                     AS avg_assists,
    ROUND(AVG(mp.acs)::numeric, 2)                         AS avg_acs,
    ROUND(AVG(mp.adr)::numeric, 2)                         AS adr_metrics,
    ROUND(AVG(mp.headshot_pct)::numeric, 2)                AS avg_headshot_pct,
    NULL::JSONB                                            AS heatmap_data,        -- PENDING: no source column confirmed
    NULL::NUMERIC                                          AS first_blood_pct,     -- PENDING: no source column confirmed
    NULL::JSONB                                            AS economy_breakdown,   -- PENDING: no source column confirmed
    NOW()                                                  AS data_as_of
FROM public.match_participants mp
WHERE mp.team_id IS NOT NULL
GROUP BY mp.team_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_team_analytics_team ON public.mv_team_analytics(team_id);

-- REFRESH MATERIALIZED VIEW CONCURRENTLY requires this wrapper (called from the
-- match result route right after a match flips to COMPLETED — see
-- app/api/v1/matches/[id]/result/route.ts).
CREATE OR REPLACE FUNCTION public.refresh_team_analytics()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_team_analytics;
END;
$$;

-- -----------------------------------------------------------------------------
-- 9. VIP Health Perk redemption RPCs — Sprint 5.3
--    Quota headroom is only checked/incremented at REDEEM time (not at QR
--    generation) per QA Case 11 — a generated-but-unscanned QR does not reserve
--    quota. perk_redemptions.redeemed_amount is NOT NULL in the already-applied
--    schema, so the amount is fixed at generation as the "requested" amount and
--    may be confirmed/overridden by the partner at redeem time (never above the
--    generation-time amount).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_perk_redemption(
    p_perk_id               UUID,
    p_redeemed_by_player_id UUID,
    p_amount                NUMERIC,
    p_perk_token            TEXT,
    p_redemption_id         UUID -- generated by the caller BEFORE signing p_perk_token, so the
                                 -- token payload's redemption_id matches the row it belongs to
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.redeem_sponsor_perk(
    p_redemption_id  UUID,
    p_redeemed_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- =============================================================================
-- END Phase 5 Billing Engine Migration
-- =============================================================================
