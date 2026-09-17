-- =============================================================================
-- MIGRATION: Partner Coupon & Discount Engine (PARTNER_COOP tier only)
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น (Claude ไม่มีสิทธิ์รัน SQL)
-- รันหลัง 20260916100000_sponsor_partner_tier_core.sql เสมอ
--
-- หมายเหตุ: verify_and_redeem_partner_coupon() นี้ "ตรวจสอบ + จองสิทธิ์คูปอง"
-- เท่านั้น (คำนวณส่วนลด, กันใช้ซ้ำ, ล็อกโควตา) ไม่ได้เรียก move_ap() เอง —
-- การหักแต้ม AP จริงของคำสั่งซื้อยังเกิดผ่าน checkout flow เดิม (checkout_order)
-- ที่ต้องนำ final_price_ap จาก RPC นี้ไปใช้ต่อ (นอกขอบเขต migration ชุดนี้
-- ตาม QA Gate ที่อนุมัติไว้ 4 migrations) — เก็บ COUPON_REDEEM ไว้ใน
-- ap_ledger_reason_check (migration ถัดไป) เผื่อรอบ integration ถัดไปที่จะ
-- โยง checkout_order เข้ากับคูปองจริง
-- =============================================================================

-- ==========================================
-- 1. PARTNER COUPONS TABLE (sponsor tier = PARTNER_COOP เท่านั้นที่ออกได้)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.partner_coupons (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id       UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
    code             VARCHAR(50) NOT NULL UNIQUE,
    title            TEXT NOT NULL,
    description      TEXT,
    ap_discount_amount INTEGER NOT NULL CHECK (ap_discount_amount >= 0),
    min_purchase_ap  INTEGER NOT NULL DEFAULT 0 CHECK (min_purchase_ap >= 0),
    max_total_uses   INTEGER NOT NULL DEFAULT 1000 CHECK (max_total_uses > 0),
    current_uses     INTEGER NOT NULL DEFAULT 0 CHECK (current_uses <= max_total_uses),
    per_user_limit   INTEGER NOT NULL DEFAULT 1 CHECK (per_user_limit > 0),
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at       TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_coupons_code ON public.partner_coupons(code, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_partner_coupons_sponsor ON public.partner_coupons(sponsor_id);

-- ==========================================
-- 2. PARTNER COUPON REDEMPTIONS LEDGER
-- ==========================================
CREATE TABLE IF NOT EXISTS public.partner_coupon_redemptions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id            UUID NOT NULL REFERENCES public.partner_coupons(id) ON DELETE CASCADE,
    player_id            UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    discount_applied_ap  INTEGER NOT NULL CHECK (discount_applied_ap >= 0),
    idempotency_key      VARCHAR(128) NOT NULL UNIQUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_player_coupon ON public.partner_coupon_redemptions(player_id, coupon_id);

-- ==========================================
-- 3. RLS
-- ==========================================
ALTER TABLE public.partner_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Active Coupons" ON public.partner_coupons;
CREATE POLICY "Public Read Active Coupons" ON public.partner_coupons
    FOR SELECT USING (is_active = TRUE AND expires_at > NOW() AND current_uses < max_total_uses);

DROP POLICY IF EXISTS "Partner Coop Manage Own Coupons" ON public.partner_coupons;
CREATE POLICY "Partner Coop Manage Own Coupons" ON public.partner_coupons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.sponsors s
            WHERE s.id = partner_coupons.sponsor_id
              AND s.partner_player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
              AND s.tier = 'PARTNER_COOP'
              AND s.status = 'APPROVED'
        )
    );

DROP POLICY IF EXISTS "Admin Full Access Coupons" ON public.partner_coupons;
CREATE POLICY "Admin Full Access Coupons" ON public.partner_coupons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.players p
            JOIN public.user_roles ur ON ur.player_id = p.id
            WHERE p.user_id = auth.uid()
              AND ur.revoked_at IS NULL
              AND ur.role IN ('SUPER_ADMIN', 'ADMIN', 'MARKETPLACE_ADMIN')
        )
    );

DROP POLICY IF EXISTS "Player Read Own Redemptions" ON public.partner_coupon_redemptions;
CREATE POLICY "Player Read Own Redemptions" ON public.partner_coupon_redemptions
    FOR SELECT USING (
        player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admin Full Access Redemptions" ON public.partner_coupon_redemptions;
CREATE POLICY "Admin Full Access Redemptions" ON public.partner_coupon_redemptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.players p
            JOIN public.user_roles ur ON ur.player_id = p.id
            WHERE p.user_id = auth.uid()
              AND ur.revoked_at IS NULL
              AND ur.role IN ('SUPER_ADMIN', 'ADMIN', 'MARKETPLACE_ADMIN')
        )
    );

-- ==========================================
-- 4. ATOMIC COUPON VALIDATION & REDEMPTION LOCK
-- p_player_id ต้องเป็น public.players.id (ไม่ใช่ auth.users.id) ตาม convention
-- เดียวกับ move_ap() — anti-BOLA จึงตรวจผ่านการ join players.user_id = auth.uid()
-- แทนการเทียบ p_player_id = auth.uid() ตรงๆ แบบใน tech spec ต้นฉบับ
-- ==========================================
CREATE OR REPLACE FUNCTION public.verify_and_redeem_partner_coupon(
    p_player_id           UUID,
    p_coupon_code         VARCHAR,
    p_purchase_amount_ap  INTEGER,
    p_idempotency_key     VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
