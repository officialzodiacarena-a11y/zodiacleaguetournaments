-- 20261008200000_store_brand_storefront_backfill_rollback.sql
-- คืนค่า brand_id / storefront_id ของสินค้าและหมวดหมู่ตามตารางสำรองก่อนรัน แล้วลบแบรนด์ที่ไฟล์นั้นสร้างขึ้น
-- แถวที่เพิ่มหลังรันไฟล์ backfill (ไม่อยู่ในตารางสำรอง) จะไม่ถูกแตะ
BEGIN;
SET LOCAL lock_timeout = '3s';

UPDATE public.store_items i
SET brand_id = z.brand_id, storefront_id = z.storefront_id
FROM zbackup.store_items_brand_20261008 z
WHERE z.id = i.id;

UPDATE public.store_categories c
SET brand_id = z.brand_id, storefront_id = z.storefront_id
FROM zbackup.store_categories_brand_20261008 z
WHERE z.id = c.id;

-- ลบเฉพาะแบรนด์ที่สร้างหลังการสำรอง และไม่มีสินค้า/หมวดหมู่อ้างถึงแล้ว
DELETE FROM public.brands b
WHERE NOT EXISTS (SELECT 1 FROM zbackup.brands_before_20261008 z WHERE z.id = b.id)
  AND NOT EXISTS (SELECT 1 FROM public.store_items i WHERE i.brand_id = b.id)
  AND NOT EXISTS (SELECT 1 FROM public.store_categories c WHERE c.brand_id = b.id);

DROP TABLE zbackup.store_items_brand_20261008;
DROP TABLE zbackup.store_categories_brand_20261008;
DROP TABLE zbackup.brands_before_20261008;

COMMIT;
