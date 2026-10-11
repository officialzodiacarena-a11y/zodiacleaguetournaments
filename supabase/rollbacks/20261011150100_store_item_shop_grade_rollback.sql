-- ย้อนกลับ 20261011150100 (ไม่ต้องรันถ้าไม่มีปัญหา) · ค่าเกรด/limit/reference ที่กรอกไว้จะหาย
BEGIN;
DROP TRIGGER IF EXISTS trg_store_variant_no_restock_high_grade ON public.store_item_variants;
DROP FUNCTION IF EXISTS public.trg_store_variant_no_restock_high_grade();
DROP INDEX IF EXISTS public.idx_store_items_shop_grade;
ALTER TABLE public.store_items DROP CONSTRAINT IF EXISTS store_items_high_grade_evidence_check;
ALTER TABLE public.store_items DROP CONSTRAINT IF EXISTS store_items_grade_limit_total_check;
ALTER TABLE public.store_items DROP CONSTRAINT IF EXISTS store_items_shop_grade_range_check;
ALTER TABLE public.store_items DROP COLUMN IF EXISTS grade_reference;
ALTER TABLE public.store_items DROP COLUMN IF EXISTS grade_limit_total;
ALTER TABLE public.store_items DROP COLUMN IF EXISTS shop_grade;
COMMIT;
