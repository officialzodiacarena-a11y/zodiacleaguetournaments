-- เกรดสินค้า 8 ระดับ (Phase 2 ส่วนฐานข้อมูล) · ใบงาน K2
-- 1 Common · 2 Uncommon · 3 Rare · 4 Premium · 5 Exclusive · 6 Limited · 7 Collector · 8 Legendary
-- เพิ่มคอลัมน์ + กติกาบังคับที่ฐานข้อมูล · สินค้าเดิมทุกชิ้นได้เกรด 1 อัตโนมัติ · ไม่แก้/ลบข้อมูลเดิม
-- รันซ้ำได้ (IF NOT EXISTS / DROP CONSTRAINT IF EXISTS / CREATE OR REPLACE / DROP TRIGGER IF EXISTS)
BEGIN;

ALTER TABLE public.store_items
  ADD COLUMN IF NOT EXISTS shop_grade smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS grade_limit_total integer,
  ADD COLUMN IF NOT EXISTS grade_reference text;

ALTER TABLE public.store_items DROP CONSTRAINT IF EXISTS store_items_shop_grade_range_check;
ALTER TABLE public.store_items
  ADD CONSTRAINT store_items_shop_grade_range_check CHECK (shop_grade BETWEEN 1 AND 8);

ALTER TABLE public.store_items DROP CONSTRAINT IF EXISTS store_items_grade_limit_total_check;
ALTER TABLE public.store_items
  ADD CONSTRAINT store_items_grade_limit_total_check CHECK (grade_limit_total IS NULL OR grade_limit_total > 0);

-- B3: เกรด 6 ขึ้นไปต้องมีจำนวนจำกัด หรือหลักฐานอ้างอิง อย่างใดอย่างหนึ่ง
ALTER TABLE public.store_items DROP CONSTRAINT IF EXISTS store_items_high_grade_evidence_check;
ALTER TABLE public.store_items
  ADD CONSTRAINT store_items_high_grade_evidence_check CHECK (
    shop_grade < 6
    OR grade_limit_total IS NOT NULL
    OR length(btrim(coalesce(grade_reference, ''))) > 0
  );

CREATE INDEX IF NOT EXISTS idx_store_items_shop_grade ON public.store_items (shop_grade);

COMMENT ON COLUMN public.store_items.shop_grade IS
  'เกรดสินค้า 1-8: 1 Common, 2 Uncommon, 3 Rare, 4 Premium, 5 Exclusive, 6 Limited, 7 Collector, 8 Legendary. สินค้าที่เข้าหลายเกรดใช้เกรดสูงสุด (B2). เกรด 6 ขึ้นไปต้องมี grade_limit_total หรือ grade_reference (B3) และห้ามเติมสต็อก (B5)';
COMMENT ON COLUMN public.store_items.grade_limit_total IS
  'จำนวนผลิตทั้งหมด (เช่น 50 ชิ้นทั่วโลก) ใช้เป็นหลักฐานของเกรด 6 ขึ้นไป (B3) · NULL = ไม่จำกัด/ไม่ระบุ';
COMMENT ON COLUMN public.store_items.grade_reference IS
  'หลักฐานของเกรด เช่น ลิงก์ประกาศ หรือเลขใบรับรอง ใช้เป็นหลักฐานของเกรด 6 ขึ้นไปแทน grade_limit_total (B3)';

-- B5: เกรด 6-8 ห้ามเติมสต็อก · เพิ่มค่า stock ของรุ่นย่อยไม่ได้ · ลดได้ตามปกติ (ขายออก/จอง/ยกเลิก)
-- SECURITY DEFINER เพื่ออ่านเกรดของสินค้าแม่ได้เสมอ แม้ RLS ของ store_items เปิดอ่านเฉพาะสินค้า is_active
CREATE OR REPLACE FUNCTION public.trg_store_variant_no_restock_high_grade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grade smallint;
BEGIN
  IF NEW.stock > OLD.stock THEN
    SELECT shop_grade INTO v_grade FROM public.store_items WHERE id = NEW.item_id;
    IF v_grade IS NOT NULL AND v_grade >= 6 THEN
      RAISE EXCEPTION 'GRADE_NO_RESTOCK: สินค้าเกรด % ห้ามเติมสต็อก (item_id=%)', v_grade, NEW.item_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_variant_no_restock_high_grade ON public.store_item_variants;
CREATE TRIGGER trg_store_variant_no_restock_high_grade
  BEFORE UPDATE OF stock ON public.store_item_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_store_variant_no_restock_high_grade();

COMMIT;
