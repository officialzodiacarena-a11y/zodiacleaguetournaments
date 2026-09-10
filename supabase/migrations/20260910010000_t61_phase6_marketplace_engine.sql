-- =============================================================================
-- MIGRATION: T6.1-T6.3 — Stage 2 Phase 6: Marketplace Listing Lifecycle,
-- FFXI Blind Auction Engine & P2P AP Transfer/Escrow
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น (ห้ามโคลท์รัน)
--
-- Run AFTER migration_stage2_phase6.sql (already applied — creates vendors,
-- marketplace_listings, marketplace_trade_history, ap_escrow, their ENUMs,
-- indexes, RLS policies and the trg_vendors_updated / trg_listings_updated
-- triggers). This migration adds only what that file left as commented-out
-- reference or did not include at all: the state-machine trigger, all RPCs,
-- the actual pg_cron schedules, one new ENUM value, and two small new tables
-- needed for the 2FA OTP challenge + single-use transfer_token that have no
-- existing equivalent anywhere in the schema.
--
-- Verified against real DB / already-shipped code before writing this file
-- (2026-09-10):
--   * move_ap() (20260908140000_t33_patch_ap_balance_sync.sql) is the only
--     function allowed to touch players.ap_balance — reused as-is throughout.
--   * players.kyc_verified_at (TIMESTAMPTZ, nullable) is the REAL column for
--     KYC status (confirmed in 20260908150000_t35's own header note and used
--     as-is in app/api/v1/tournaments/[id]/prize-payouts/route.ts). The
--     `kyc_status` enum column mentioned in the QA report only exists on the
--     unrelated legacy `user_token_wallets` table, NOT on `players` — the
--     Anti-Sybil check below uses `kyc_verified_at IS NOT NULL` instead.
--   * players.status real values in use: 'ACTIVE', 'BANNED', 'SUSPENDED'
--     (confirmed via app/api/v1/matches/[id]/dispute/resolve/route.ts and
--     app/api/v1/players/*.ts) — the receiver-banned trigger checks these.
--   * public.is_admin() / current_player_id() / audit_logs schema already
--     exist (20260908000000_t24) — reused, not redefined.
--   * ⚠️ No SMS/email delivery provider exists anywhere in this codebase (no
--     Resend/SendGrid/Twilio — verified by repo-wide search) and no TOTP
--     secret column exists on players. A real TOTP/SMS OTP channel is out of
--     scope for this migration. p2p_transfer_otp_challenges below stores a
--     server-generated 6-digit code delivered via the existing in-app
--     `notifications` table as a bridge — same pattern as T4.0's manual
--     verification bridge while Riot RSO is on hold. Swap for a real
--     SMS/email provider before this goes anywhere near production money.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. New ENUM value for the receiver-banned escrow path (spec names this
--    exact status). ALTER TYPE ... ADD VALUE cannot be used in the same
--    transaction as any statement that references the new value — run this
--    statement on its own first if the Supabase SQL Editor ever complains.
-- -----------------------------------------------------------------------------
ALTER TYPE escrow_status_type ADD VALUE IF NOT EXISTS 'CANCELLED_BANNED';

-- -----------------------------------------------------------------------------
-- 1. ap_ledger: allow the Phase 6 marketplace/escrow reasons
-- -----------------------------------------------------------------------------
ALTER TABLE public.ap_ledger DROP CONSTRAINT IF EXISTS ap_ledger_reason_check;
ALTER TABLE public.ap_ledger ADD CONSTRAINT ap_ledger_reason_check
    CHECK (reason IN ('WATCH_REWARD', 'CLAWBACK', 'ADMIN_ADJUSTMENT', 'STORE_REDEEM', 'TOP_UP', 'REFUND_AP_CREDIT', 'PENALTY_FINE', 'SUBSCRIPTION_RENEWAL', 'MARKETPLACE_BID', 'MARKETPLACE_REFUND', 'MARKETPLACE_SOLD', 'ESCROW_LOCK', 'ESCROW_SETTLED', 'ESCROW_AUTO_RELEASE'));

-- -----------------------------------------------------------------------------
-- 2. New supporting tables — 2FA OTP challenge + single-use transfer_token
--    (no existing equivalent anywhere in the schema; required by the spec's
--    explicit 2FA-then-token-then-initiate flow and 5-attempt lockout rule)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.p2p_transfer_otp_challenges (
    sender_id       UUID PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
    otp_code_hash   TEXT NOT NULL,
    attempts        SMALLINT NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.p2p_transfer_used_tokens (
    jti             TEXT PRIMARY KEY,
    sender_id       UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    used_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p2p_used_tokens_sender ON public.p2p_transfer_used_tokens(sender_id);

ALTER TABLE public.p2p_transfer_otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_transfer_used_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "otp_self" ON public.p2p_transfer_otp_challenges;
CREATE POLICY "otp_self" ON public.p2p_transfer_otp_challenges
    FOR SELECT USING (sender_id = public.current_player_id() OR public.is_admin());

-- No client-facing SELECT policy needed on p2p_transfer_used_tokens — it is
-- only ever read/written by SECURITY DEFINER RPCs below.

-- -----------------------------------------------------------------------------
-- 3. Sprint 6.1 — Listing state machine guard
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_listing_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS trg_enforce_listing_state_transition ON public.marketplace_listings;
CREATE TRIGGER trg_enforce_listing_state_transition
    BEFORE UPDATE OF status ON public.marketplace_listings
    FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_state_transition();

-- -----------------------------------------------------------------------------
-- 4. create_marketplace_listing() — Sprint 6.1
--    Concurrent Active Slots and Monthly Creation Cap are two independent
--    counters per Q1: SOLD/CANCELLED frees a concurrent slot but never
--    decrements monthly_listing_count (anti quota-gaming).
--    is_paid_slot is client-declared on the request (per API contract) —
--    real $5 payment collection is out of scope here (same limitation as the
--    Phase 5 checkout's payment_url:null); a paid listing is created as
--    PENDING_PAYMENT and only becomes ACTIVE via confirm_shelf_payment()
--    below, mirroring the Phase 5 invoice pattern.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_marketplace_listing(
    p_vendor_id         UUID,
    p_item_title        TEXT,
    p_description       TEXT,
    p_image_urls        JSONB,
    p_currency_type     listing_currency_type,
    p_floor_price       NUMERIC,
    p_buyout_price      NUMERIC,
    p_is_paid_slot      BOOLEAN,
    p_auction_ends_at   TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- confirm_shelf_payment() — placeholder settlement hook for the $5 paid-slot
-- fee, mirroring mark_subscription_invoice_paid() from Phase 5. Real payment
-- collection is not wired up here; call this from wherever that gets built.
CREATE OR REPLACE FUNCTION public.confirm_shelf_payment(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- -----------------------------------------------------------------------------
-- 5. Sprint 6.2 — FFXI Blind Auction
--    Lock order: marketplace_listings row FIRST, then the two players rows
--    (new bidder + previous highest bidder, if any) in ascending id order —
--    prevents deadlock when two concurrent bids on DIFFERENT listings
--    involve the same two players in reverse order (QA Pitfall #1).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_ffxi_blind_bid(
    p_listing_id        UUID,
    p_bidder_id         UUID,
    p_bid_amount        NUMERIC,
    p_idempotency_key   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- buyout_marketplace_item() — direct-buy via the listed buyout_price, separate
-- from the blind-bid path. Same lock order and outbid-refund handling.
CREATE OR REPLACE FUNCTION public.buyout_marketplace_item(
    p_listing_id        UUID,
    p_buyer_id          UUID,
    p_idempotency_key   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- -----------------------------------------------------------------------------
-- 6. Sprint 6.3 — P2P AP Transfer & Escrow
--    Anti-Sybil daily-limit check happens under a row lock on the SENDER,
--    inside this RPC only — never at the middleware/app layer (QA Gate 2 /
--    Pitfall #3).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_ap_to_escrow(
    p_sender_id         UUID,
    p_receiver_id       UUID,
    p_amount_ap         BIGINT,
    p_idempotency_key   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.release_escrow_to_receiver(
    p_escrow_id UUID,
    p_auto      BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.dispute_escrow_and_refund(
    p_escrow_id UUID,
    p_sender_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Receiver BANNED/SUSPENDED mid-escrow — cancel + auto-refund sender.
CREATE OR REPLACE FUNCTION public.check_receiver_status_on_escrow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS trg_check_receiver_status_on_escrow ON public.players;
CREATE TRIGGER trg_check_receiver_status_on_escrow
    AFTER UPDATE OF status ON public.players
    FOR EACH ROW EXECUTE FUNCTION public.check_receiver_status_on_escrow();

-- -----------------------------------------------------------------------------
-- 7. 2FA OTP challenge RPCs — issue/verify with 5-attempt lockout
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_p2p_otp_challenge(
    p_sender_id     UUID,
    p_otp_code_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.verify_p2p_otp_challenge(
    p_sender_id     UUID,
    p_otp_code_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.consume_p2p_transfer_token(
    p_jti       TEXT,
    p_sender_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.p2p_transfer_used_tokens (jti, sender_id)
    VALUES (p_jti, p_sender_id);
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'TOKEN_ALREADY_USED');
END;
$$;

-- -----------------------------------------------------------------------------
-- 8. pg_cron schedules (the reference migration left these commented)
-- -----------------------------------------------------------------------------
SELECT cron.schedule('auto-release-escrow', '*/15 * * * *', $$
    DO $body$
    DECLARE r RECORD;
    BEGIN
        FOR r IN SELECT id FROM public.ap_escrow WHERE status = 'PENDING' AND approval_deadline < NOW() FOR UPDATE SKIP LOCKED LOOP
            PERFORM public.release_escrow_to_receiver(r.id, TRUE);
        END LOOP;
    END;
    $body$;
$$);

SELECT cron.schedule('unpublish-overdue-listings', '0 * * * *', $$
    UPDATE public.marketplace_listings
    SET status = 'UNPUBLISHED_OVERDUE'
    WHERE is_paid_slot = TRUE AND status = 'ACTIVE' AND shelf_billing_cycle_end < NOW();
$$);

SELECT cron.schedule('reset-monthly-vendor-quota', '0 0 1 * *', $$
    UPDATE public.vendors
    SET monthly_listing_count = 0,
        monthly_reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
    WHERE monthly_reset_at <= NOW();
$$);

-- =============================================================================
-- END Phase 6 Marketplace Engine Migration
-- =============================================================================
