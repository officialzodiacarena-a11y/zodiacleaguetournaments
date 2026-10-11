-- กันสต็อกสินค้าเกรด 6-8 ให้ครบ (ต่อจาก K2 · ใบงาน K2b)
-- 1) เพิ่มรุ่นย่อยใหม่ให้สินค้าเกรด >= 6 ไม่ได้ ถ้าสินค้านั้นมีรุ่นย่อยอยู่แล้ว (รุ่นแรกของสินค้าใหม่ยังเพิ่มได้)
-- 2) ลดเกรดจาก >= 6 ลงต่ำกว่า 6 ผ่าน API ไม่ได้ · ต่อฐานข้อมูลตรง (SQL Editor) ผ่านได้ เพื่อให้พี่หยัดแก้ข้อผิดพลาด
-- ไม่เพิ่มคอลัมน์ · รันซ้ำได้ (CREATE OR REPLACE / DROP TRIGGER IF EXISTS)
BEGIN;

-- 3.1) BEFORE INSERT ON store_item_variants
-- SECURITY DEFINER เหตุผลเดียวกับ trigger K2: RLS ของ store_items อ่านได้เฉพาะสินค้า is_active
CREATE OR REPLACE FUNCTION public.trg_store_variant_no_new_variant_high_grade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grade smallint;
BEGIN
  SELECT shop_grade INTO v_grade FROM public.store_items WHERE id = NEW.item_id;
  IF v_grade IS NOT NULL AND v_grade >= 6
     AND EXISTS (SELECT 1 FROM public.store_item_variants WHERE item_id = NEW.item_id) THEN
    RAISE EXCEPTION 'GRADE_NO_NEW_VARIANT: สินค้าเกรด % มีรุ่นย่อยอยู่แล้ว ห้ามเพิ่มรุ่นย่อยใหม่ (item_id=%)', v_grade, NEW.item_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_variant_no_new_variant_high_grade ON public.store_item_variants;
CREATE TRIGGER trg_store_variant_no_new_variant_high_grade
  BEFORE INSERT ON public.store_item_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_store_variant_no_new_variant_high_grade();

-- 3.2) BEFORE UPDATE OF shop_grade ON store_items
-- "มาจาก API" = auth.role() ไม่ว่าง (PostgREST ใส่ role จาก JWT: anon/authenticated/service_role)
-- ต่อฐานข้อมูลตรง (SQL Editor / psql) ไม่มี JWT → auth.role() เป็น NULL → ผ่าน
CREATE OR REPLACE FUNCTION public.trg_store_item_no_downgrade_high_grade()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.shop_grade >= 6 AND NEW.shop_grade < 6 AND coalesce(auth.role(), '') <> '' THEN
    RAISE EXCEPTION 'GRADE_NO_DOWNGRADE: สินค้าเกรด % ลดเกรดต่ำกว่า 6 ผ่าน API ไม่ได้ (item_id=%)', OLD.shop_grade, OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_item_no_downgrade_high_grade ON public.store_items;
CREATE TRIGGER trg_store_item_no_downgrade_high_grade
  BEFORE UPDATE OF shop_grade ON public.store_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_store_item_no_downgrade_high_grade();

COMMIT;
