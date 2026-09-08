-- =============================================================================
-- MIGRATION: T3.4-BE-01 — Redemption Store & Merchandise Hub
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น (รันหลัง 20260908120000_t33 เสมอ
-- เพราะเรียกใช้ move_ap() / current_player_id() / is_admin() ที่นิยามไว้ก่อนหน้า)
--
-- Verify กับ DB จริงก่อนเขียนไฟล์นี้แล้วพบว่า:
--   * store_items / store_item_variants / shipping_addresses / orders /
--     order_items / player_inventory / shipments ยังไม่มีอยู่เลย — CREATE ใหม่ทั้งหมด
--   * current_player_id() และ is_admin() มีอยู่แล้วในระบบ — ใช้ตรง ๆ ไม่ redeclare
--   * players.ap_balance และ ap_ledger.balance_before ไม่มีอยู่จริง — เกลาตาม T3.3
--     (balance = แถวล่าสุดของ ap_ledger.balance_after) แทนที่การ UPDATE players
--     ตรง ๆ ตามร่างสเปค v1.3.0 ทั้งหมด
--
-- Corrections vs spec v1.3.0:
--   * checkout_order(): สเปคร่าง UPDATE public.players.ap_balance ตรง ๆ ซึ่งไม่มีคอลัมน์
--     นี้จริง — เปลี่ยนไปเรียก move_ap() แทน (เพิ่ม 'STORE_REDEEM' ใน ap_ledger.reason
--     CHECK ผ่าน T3.3 migration แล้ว) และเปลี่ยน RETURN จาก BOOLEAN เป็น JSONB
--     เพื่อคืนค่า order_id/fulfilled_items_count/ap_deducted/remaining_balance ตรง
--     ตาม REST response ในสเปค §4.2 ได้โดยไม่ต้อง query ซ้ำฝั่ง route
--   * checkout_order(): แก้บั๊ก `SELECT i.type, i.name INTO v_eq_type, v_eq_type`
--     ในร่างสเปค (SELECT สองคอลัมน์ทับตัวแปรเดียวกัน ทำให้ค่า type หาย) แยกเป็น
--     v_store_type (DIGITAL/PHYSICAL) กับ v_eq_type (FRAME/BADGE/TITLE) ให้ชัดเจน
--   * checkout_order(): error code อิงตาม stress test (T3.4_Redemption_Store_Merch_
--     Stress_Test) ที่ผ่านแล้วจริง แทนข้อความในร่างสเปค — 'ORDER_NOT_PENDING'
--     (ไม่ใช่ 'INVALID_ORDER_STATUS'), 'ORDER_EXPIRED' (ไม่ใช่
--     'ORDER_EXPIRED_CANNOT_CHECKOUT'), 'INSUFFICIENT_AP' (ไม่ใช่
--     'INSUFFICIENT_AP_BALANCE')
--   * create_store_order() / equip_inventory_item() / unequip_inventory_item():
--     ไม่มีอยู่ในสเปค (มีแค่ signature ตัวอย่างใน §5.1) เขียนขึ้นใหม่ทั้งหมดตามกติกา
--     ธุรกิจ §1 (15-minute reserve, max_per_player รวม owned+pending, one-equipped-
--     per-type, idempotency key สำหรับ B06)
--   * เพิ่มคอลัมน์ที่สเปค DDL §2 ไม่ได้ระบุแต่ stress test ต้องใช้จริง:
--     store_item_variants.available_until (A01), player_inventory.expires_at (C04),
--     orders.idempotency_key (B06)
-- =============================================================================

-- 1. ตารางคลาสหลักสินค้า
CREATE TABLE IF NOT EXISTS public.store_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(150) NOT NULL,
    type                VARCHAR(20) NOT NULL CHECK (type IN ('DIGITAL', 'PHYSICAL')),
    description         TEXT,
    max_per_player      INTEGER CHECK (max_per_player > 0),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ตารางขนาดและรูปแบบสินค้าย่อย
CREATE TABLE IF NOT EXISTS public.store_item_variants (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id             UUID NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    price_ap            INTEGER NOT NULL DEFAULT 0 CHECK (price_ap >= 0),
    price_thb           INTEGER NOT NULL DEFAULT 0 CHECK (price_thb >= 0),
    stock               INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    reserved_stock      INTEGER NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    available_until     TIMESTAMPTZ,

    CONSTRAINT chk_stock_capacity CHECK (reserved_stock <= stock)
);

CREATE INDEX IF NOT EXISTS idx_store_item_variants_lookup ON public.store_item_variants(item_id, is_active);

-- 3. ตารางที่อยู่จัดส่งของลูกค้า/นักกีฬา
CREATE TABLE IF NOT EXISTS public.shipping_addresses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id           UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    recipient_name      VARCHAR(100) NOT NULL,
    phone               VARCHAR(20) NOT NULL,
    address_line1       TEXT NOT NULL,
    address_line2       TEXT,
    province            VARCHAR(100) NOT NULL,
    postal_code         VARCHAR(10) NOT NULL,
    is_default          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_addresses_player ON public.shipping_addresses(player_id);

-- 4. ตารางใบสั่งซื้อหลักประจำร้านรางวัล
CREATE TABLE IF NOT EXISTS public.orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id           UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED')),
    shipping_address_id UUID REFERENCES public.shipping_addresses(id) ON DELETE SET NULL,
    total_price_ap      INTEGER NOT NULL DEFAULT 0 CHECK (total_price_ap >= 0),
    total_price_thb     INTEGER NOT NULL DEFAULT 0 CHECK (total_price_thb >= 0),
    expires_at          TIMESTAMPTZ NOT NULL,
    idempotency_key     TEXT UNIQUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_player ON public.orders(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_expiry_sweep ON public.orders(status, expires_at) WHERE status = 'PENDING';

-- 5. ตารางรายการสินค้าแนบใบสั่งซื้อ
CREATE TABLE IF NOT EXISTS public.order_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    variant_id          UUID NOT NULL REFERENCES public.store_item_variants(id) ON DELETE RESTRICT,
    name_at             VARCHAR(200) NOT NULL,
    unit_price_ap       INTEGER NOT NULL CHECK (unit_price_ap >= 0),
    unit_price_thb      INTEGER NOT NULL CHECK (unit_price_thb >= 0),
    quantity            INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON public.order_items(variant_id);

-- 6. ตารางคลังกระเป๋าไอเทมดิจิทัลของผู้เล่น — SSOT
CREATE TABLE IF NOT EXISTS public.player_inventory (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id           UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    variant_id          UUID NOT NULL REFERENCES public.store_item_variants(id) ON DELETE CASCADE,
    item_type           VARCHAR(30) NOT NULL CHECK (item_type IN ('FRAME', 'BADGE', 'TITLE')),
    is_equipped         BOOLEAN NOT NULL DEFAULT FALSE,
    quantity            INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_player_inventory_variant UNIQUE (player_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_player_inventory_equipment ON public.player_inventory(player_id, item_type) WHERE is_equipped = TRUE;

-- 7. ตารางเฝ้าติดตามพัสดุสินค้าของชำระ Fiat
CREATE TABLE IF NOT EXISTS public.shipments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    tracking_number     VARCHAR(100),
    carrier             VARCHAR(50),
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SHIPPED', 'DELIVERED')),
    shipped_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_order ON public.shipments(order_id);

-- 8. Row Level Security
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- 8.1 Catalog: อ่านได้ทุกคน (เฉพาะของที่ยัง active)
DROP POLICY IF EXISTS "store_items_public_select" ON public.store_items;
CREATE POLICY "store_items_public_select" ON public.store_items FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "store_item_variants_public_select" ON public.store_item_variants;
CREATE POLICY "store_item_variants_public_select" ON public.store_item_variants FOR SELECT USING (is_active = TRUE);

-- 8.2 Inventory: เจ้าของเท่านั้นที่ SELECT ได้ ห้าม client เขียนตรง (ต้องผ่าน RPC)
DROP POLICY IF EXISTS "player_inventory_owner_select" ON public.player_inventory;
CREATE POLICY "player_inventory_owner_select" ON public.player_inventory
    FOR SELECT USING (player_id = public.current_player_id() OR public.is_admin());

DROP POLICY IF EXISTS "player_inventory_no_client_write" ON public.player_inventory;
CREATE POLICY "player_inventory_no_client_write" ON public.player_inventory
    FOR ALL USING (public.is_admin());

-- 8.3 Orders/order_items: เจ้าของอ่านได้อย่างเดียว เขียนต้องผ่าน RPC (create_store_order/checkout_order)
DROP POLICY IF EXISTS "orders_owner_select" ON public.orders;
CREATE POLICY "orders_owner_select" ON public.orders
    FOR SELECT USING (player_id = public.current_player_id() OR public.is_admin());

DROP POLICY IF EXISTS "order_items_owner_select" ON public.order_items;
CREATE POLICY "order_items_owner_select" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_items.order_id
              AND (o.player_id = public.current_player_id() OR public.is_admin())
        )
    );

-- 8.4 Shipping addresses: เจ้าของจัดการเองได้ทั้งหมด
DROP POLICY IF EXISTS "shipping_addresses_owner_all" ON public.shipping_addresses;
CREATE POLICY "shipping_addresses_owner_all" ON public.shipping_addresses
    FOR ALL USING (player_id = public.current_player_id() OR public.is_admin());

-- 8.5 Shipments: เจ้าของ order อ่านได้ (ดู tracking) เขียนเฉพาะ admin
DROP POLICY IF EXISTS "shipments_owner_select" ON public.shipments;
CREATE POLICY "shipments_owner_select" ON public.shipments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = shipments.order_id
              AND (o.player_id = public.current_player_id() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "shipments_admin_write" ON public.shipments;
CREATE POLICY "shipments_admin_write" ON public.shipments
    FOR ALL USING (public.is_admin());

-- =============================================================================
-- Stored Procedures
-- =============================================================================

-- -----------------------------------------------------------------------------
-- create_store_order — สร้างบิล PENDING, ล็อกแถว variant ทีละตัว (FOR UPDATE) เพื่อกัน
-- oversold, จองสต็อกใน reserved_stock, เช็ค max_per_player (owned + pending รวมกัน),
-- บังคับ shipping_address_id สำหรับของ PHYSICAL, และรองรับ idempotency key
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_store_order(
    p_items_json      JSONB,
    p_address_id      UUID DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- -----------------------------------------------------------------------------
-- checkout_order — หัก AP ผ่าน move_ap() (ถ้ามี), หักสต็อกจริง + ปล่อยจอง, มอบของ
-- ดิจิทัลทันที (Auto-fulfillment) หรือสร้างตั๋วพัสดุสำหรับของ PHYSICAL แล้วปิดบิล PAID
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

    IF v_caller IS DISTINCT FROM v_player_id AND NOT public.is_admin() THEN
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
        SELECT balance_after INTO v_balance_after
        FROM public.ap_ledger WHERE player_id = v_player_id ORDER BY created_at DESC LIMIT 1;
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
-- clean_expired_orders — cron: กวาดบิล PENDING ที่หมดอายุ คืน reserved_stock และ
-- ปิดสถานะเป็น EXPIRED
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clean_expired_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- -----------------------------------------------------------------------------
-- equip_inventory_item / unequip_inventory_item — One-Equipped-per-Type Rule:
-- สวมชิ้นใหม่จะถอดชิ้นเดิมประเภทเดียวกันอัตโนมัติ (auto-unequip)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.equip_inventory_item(p_variant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.unequip_inventory_item(p_variant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
