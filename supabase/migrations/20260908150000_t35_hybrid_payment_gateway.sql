-- =============================================================================
-- MIGRATION: T3.5 — Hybrid Payment Gateway (Fiat + Non-Custodial BSC Crypto)
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น (รันหลัง 20260908140000_t33_patch
-- เพราะเรียกใช้ move_ap() / checkout_order() / current_player_id() / is_admin()
-- ที่นิยามไว้ก่อนหน้า)
--
-- Verify กับ DB จริงก่อนเขียนไฟล์นี้แล้วพบว่า:
--   * payment_intents / crypto_payments / refunds / prize_payouts ไม่มีอยู่เลย —
--     CREATE ใหม่ทั้งหมด (ไม่ชนกับ prize_payouts/user_token_wallets/token_transactions/
--     cashout_requests รุ่นเก่าที่โค้ด legacy บางไฟล์อ้างถึง เพราะของเก่าเหล่านั้น
--     ก็ไม่มีอยู่จริงในระบบเช่นกัน — เป็น dead scaffold code)
--   * players.kyc_verified_at (TIMESTAMPTZ, nullable) มีอยู่จริง — ใช้ตรง ๆ ได้เลย
--   * handle_crypto_revert() ที่สเปคบอกว่า "มีอยู่แล้ว" ไม่มีจริง (เหมือนที่ move_ap()/
--     claim_watch_reward() เคยถูกอ้างผิดตอน T3.3) — เขียนขึ้นใหม่พร้อม trigger
--   * ไม่มี ENUM เดิมชื่อ payment/payout/refund/crypto/kyc ใด ๆ ชนกัน — ใช้ TEXT+CHECK
--     ตามสไตล์เดียวกับตารางใหม่ใน T3.3/T3.4 ได้อย่างปลอดภัย
--
-- Corrections / เพิ่มเติมจากสเปค:
--   * checkout_order() (deploy แล้วจาก T3.4) มีการเช็คสิทธิ์เจ้าของออเดอร์ผ่าน
--     current_player_id() ซึ่ง resolve จาก auth.uid() — เวลาถูกเรียกจาก webhook
--     ผ่าน service-role client (ไม่มี auth session) auth.uid() จะเป็น NULL ทำให้ติด
--     FORBIDDEN เสมอ แก้โดยผ่อนเช็คนี้เฉพาะกรณีไม่มี caller context (v_caller IS NULL
--     แปลว่าเรียกจากฝั่งเซิร์ฟเวอร์ ไม่ใช่ client โดยตรง) — endpoint POST checkout
--     ของผู้ใช้ทั่วไปยังเช็คสิทธิ์เหมือนเดิมทุกกรณีที่มี auth session จริง
--   * settle_payment_intent() ใหม่ (ไม่มีในสเปค แต่จำเป็น): จุดรวม logic "webhook
--     สำเร็จแล้วทำอะไรต่อ" ให้ omise/crypto webhook เรียกร่วมกัน — ล็อกแถว payment_intents
--     ด้วย FOR UPDATE + เช็ค status PENDING เท่านั้นถึงจะประมวลผล ป้องกัน double-credit
--     จาก webhook ซ้ำ (DoD ข้อ 2), แล้ว credit AP ผ่าน move_ap() ถ้า purpose=TOP_UP หรือ
--     เรียก checkout_order() ถ้า purpose=ORDER
-- =============================================================================

-- 1. payment_intents — ใบสั่งชำระเงินกลาง (fiat หรือ crypto)
CREATE TABLE IF NOT EXISTS public.payment_intents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id           UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    purpose             TEXT NOT NULL CHECK (purpose IN ('TOP_UP', 'ORDER')),
    order_id            UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    channel             TEXT NOT NULL CHECK (channel IN ('FIAT', 'CRYPTO')),
    method              TEXT CHECK (method IN ('PROMPTPAY', 'CREDIT_CARD', 'BANK_TRANSFER', 'TRUE_MONEY')),
    amount_thb          INTEGER CHECK (amount_thb >= 0),
    ap_amount           INTEGER CHECK (ap_amount >= 0),
    status              TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED')),
    provider            TEXT,
    provider_intent_id  TEXT,
    checkout_url        TEXT,
    idempotency_key     TEXT UNIQUE,
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_purpose_target CHECK (
        (purpose = 'TOP_UP' AND ap_amount IS NOT NULL) OR
        (purpose = 'ORDER' AND order_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_player ON public.payment_intents(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_intents_provider_intent ON public.payment_intents(provider_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_expiry_sweep ON public.payment_intents(status, expires_at) WHERE status = 'PENDING';

-- 2. crypto_payments — รายละเอียดเฉพาะฝั่ง BSC non-custodial ต่อ 1 payment_intent
CREATE TABLE IF NOT EXISTS public.crypto_payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id   UUID NOT NULL UNIQUE REFERENCES public.payment_intents(id) ON DELETE CASCADE,
    token_symbol        TEXT NOT NULL,
    to_address          TEXT NOT NULL,
    amount_token        NUMERIC(30,8) NOT NULL CHECK (amount_token > 0),
    rate_to_thb         NUMERIC(18,8) NOT NULL CHECK (rate_to_thb > 0),
    rate_locked_at      TIMESTAMPTZ NOT NULL,
    tx_hash             TEXT UNIQUE,
    block_number        BIGINT,
    confirmations       INTEGER NOT NULL DEFAULT 0,
    required_confirms   INTEGER NOT NULL DEFAULT 15,
    is_confirmed        BOOLEAN NOT NULL DEFAULT FALSE,
    is_reverted         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crypto_payments_tx_hash ON public.crypto_payments(tx_hash);

-- 3. refunds
CREATE TABLE IF NOT EXISTS public.refunds (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id   UUID NOT NULL REFERENCES public.payment_intents(id) ON DELETE CASCADE,
    requested_by        UUID REFERENCES public.players(id) ON DELETE SET NULL,
    channel             TEXT NOT NULL CHECK (channel IN ('FIAT', 'CRYPTO')),
    amount_thb          INTEGER CHECK (amount_thb >= 0),
    ap_amount           INTEGER CHECK (ap_amount >= 0),
    status              TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED')),
    provider_refund_id  TEXT,
    reason              TEXT,
    idempotency_key     TEXT UNIQUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_intent ON public.refunds(payment_intent_id);

-- 4. prize_payouts — เงินรางวัลสด (THB) หัก ณ ที่จ่าย ไม่เกี่ยวกับ AP
CREATE TABLE IF NOT EXISTS public.prize_payouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id   UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    player_id       UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    gross           INTEGER NOT NULL CHECK (gross >= 0),
    tax_withheld    INTEGER NOT NULL DEFAULT 0 CHECK (tax_withheld >= 0),
    net             INTEGER NOT NULL CHECK (net >= 0),
    status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PROCESSING', 'PAID')),
    idempotency_key TEXT UNIQUE,
    approved_by     UUID REFERENCES public.players(id) ON DELETE SET NULL,
    approved_at     TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_net_math CHECK (net = gross - tax_withheld)
);

CREATE INDEX IF NOT EXISTS idx_prize_payouts_tournament ON public.prize_payouts(tournament_id);
CREATE INDEX IF NOT EXISTS idx_prize_payouts_player ON public.prize_payouts(player_id);

-- 5. Row Level Security — อ่านได้เฉพาะเจ้าของ/แอดมิน เขียนผ่าน service-role backend เท่านั้น
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_intents_owner_select" ON public.payment_intents;
CREATE POLICY "payment_intents_owner_select" ON public.payment_intents
    FOR SELECT USING (player_id = public.current_player_id() OR public.is_admin());

DROP POLICY IF EXISTS "crypto_payments_owner_select" ON public.crypto_payments;
CREATE POLICY "crypto_payments_owner_select" ON public.crypto_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.payment_intents pi
            WHERE pi.id = crypto_payments.payment_intent_id
              AND (pi.player_id = public.current_player_id() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "refunds_owner_select" ON public.refunds;
CREATE POLICY "refunds_owner_select" ON public.refunds
    FOR SELECT USING (requested_by = public.current_player_id() OR public.is_admin());

DROP POLICY IF EXISTS "prize_payouts_owner_select" ON public.prize_payouts;
CREATE POLICY "prize_payouts_owner_select" ON public.prize_payouts
    FOR SELECT USING (player_id = public.current_player_id() OR public.is_admin());

-- 6. ap_ledger.reason ต้องรองรับเหตุผลใหม่จาก T3.5 (TOP_UP, REFUND_AP_CREDIT)
ALTER TABLE public.ap_ledger DROP CONSTRAINT IF EXISTS ap_ledger_reason_check;
ALTER TABLE public.ap_ledger ADD CONSTRAINT ap_ledger_reason_check
    CHECK (reason IN ('WATCH_REWARD', 'CLAWBACK', 'ADMIN_ADJUSTMENT', 'STORE_REDEEM', 'TOP_UP', 'REFUND_AP_CREDIT'));

-- =============================================================================
-- Stored Procedures
-- =============================================================================

-- -----------------------------------------------------------------------------
-- checkout_order() — patch: ผ่อนเช็คสิทธิ์เจ้าของเฉพาะตอนไม่มี auth session (เรียก
-- จาก webhook ผ่าน service-role) ส่วนตรรกะอื่นเหมือน T3.4 เดิมทุกประการ
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.checkout_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- -----------------------------------------------------------------------------
-- settle_payment_intent — จุดเดียวที่ "ปิดจ๊อบ" payment_intent สำเร็จ ใช้ร่วมกันทั้ง
-- webhook Omise และ webhook Crypto กันเบิ้ล credit ด้วยการล็อกแถว + เช็ค status
-- PENDING เท่านั้นถึงประมวลผล (เรียกซ้ำกี่ครั้งก็ safe)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.settle_payment_intent(p_payment_intent_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- -----------------------------------------------------------------------------
-- handle_crypto_revert — trigger function: chain reorg (is_reverted=true) ->
-- clawback AP ที่เคย credit ไปจาก payment_intent นี้โดยอัตโนมัติ
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_crypto_revert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS trg_crypto_revert ON public.crypto_payments;
CREATE TRIGGER trg_crypto_revert
    AFTER UPDATE OF is_reverted ON public.crypto_payments
    FOR EACH ROW
    WHEN (NEW.is_reverted = TRUE)
    EXECUTE FUNCTION public.handle_crypto_revert();
