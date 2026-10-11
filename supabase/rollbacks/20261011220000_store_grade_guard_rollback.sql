-- ย้อนกลับ 20261011220000 (ไม่ต้องรันถ้าไม่มีปัญหา) · ลบเฉพาะ trigger/ฟังก์ชันของใบ K2b · ไม่แตะของ K2
BEGIN;
DROP TRIGGER IF EXISTS trg_store_item_no_downgrade_high_grade ON public.store_items;
DROP FUNCTION IF EXISTS public.trg_store_item_no_downgrade_high_grade();
DROP TRIGGER IF EXISTS trg_store_variant_no_new_variant_high_grade ON public.store_item_variants;
DROP FUNCTION IF EXISTS public.trg_store_variant_no_new_variant_high_grade();
COMMIT;
