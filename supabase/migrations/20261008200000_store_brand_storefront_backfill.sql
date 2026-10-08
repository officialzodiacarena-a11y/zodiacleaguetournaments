-- 20261008200000_store_brand_storefront_backfill.sql
-- เติม storefront_id / brand_id ให้สินค้าและหมวดหมู่ที่เพิ่มหลัง A2 ด้วยคอลัมน์ partner_brand อย่างเดียว (ขั้นตอน SOP_ANDY_add-store-products)
-- เหตุผล: โค้ด K4 แสดงป้ายแบรนด์และลิงก์ "ดูข้อมูลแบรนด์" จากตาราง brands (ผูกสปอนเซอร์ผ่าน brands.sponsor_id)
--         สินค้าที่ brand_id ว่างจะแสดงเป็นป้ายข้อความธรรมดาและไม่มีลิงก์จนกว่าจะรันไฟล์นี้
-- ปลอดภัยต่อโค้ดเดิม: โค้ดก่อน K4 ไม่อ่านสองคอลัมน์นี้ · รันซ้ำได้ (เติมเฉพาะแถวที่ยังว่าง)
-- ไม่แตะ: partner_brand (ยังเขียนคู่กันถึง A7) · is_active · ราคา · สต็อก
-- ย้อนกลับ: supabase/rollbacks/20261008200000_store_brand_storefront_backfill_rollback.sql (คืนค่าสองคอลัมน์จากตารางสำรอง)
BEGIN;
SET LOCAL lock_timeout = '3s';

-- สำรองค่าเดิมก่อนแก้ (schema zbackup สร้างโดย A2 · API มองไม่เห็น) · ถ้ามีตารางสำรองอยู่แล้ว (รันซ้ำ) คงชุดแรกไว้
CREATE TABLE IF NOT EXISTS zbackup.store_items_brand_20261008 AS
    SELECT id, brand_id, storefront_id FROM public.store_items;
CREATE TABLE IF NOT EXISTS zbackup.store_categories_brand_20261008 AS
    SELECT id, brand_id, storefront_id FROM public.store_categories;
CREATE TABLE IF NOT EXISTS zbackup.brands_before_20261008 AS
    SELECT id FROM public.brands;

-- 1) ร้านเริ่มต้น
UPDATE public.store_items
SET storefront_id = (SELECT id FROM public.storefronts WHERE slug = 'zodiac-esports')
WHERE storefront_id IS NULL;

UPDATE public.store_categories
SET storefront_id = (SELECT id FROM public.storefronts WHERE slug = 'zodiac-esports')
WHERE storefront_id IS NULL;

-- 2) แบรนด์ที่ยังไม่มีในตาราง brands (จับคู่ด้วยชื่อ ไม่สนตัวพิมพ์) · สร้างเป็นแบรนด์ธรรมดา ไม่ผูกสปอนเซอร์
--    ชื่อที่แปลงเป็น slug ภาษาอังกฤษไม่ได้ (เช่นชื่อไทยล้วน) ข้ามไป → สินค้านั้นแสดงป้ายข้อความธรรมดาเหมือนเดิม
INSERT INTO public.brands (slug, name)
SELECT s.slug, s.name
FROM (
    SELECT DISTINCT ON (lower(btrim(pb)))
           trim(both '-' from regexp_replace(lower(btrim(pb)), '[^a-z0-9]+', '-', 'g')) AS slug,
           upper(btrim(pb)) AS name
    FROM (
        SELECT partner_brand AS pb FROM public.store_items WHERE brand_id IS NULL
        UNION ALL
        SELECT partner_brand FROM public.store_categories WHERE brand_id IS NULL
    ) x
    WHERE nullif(btrim(pb), '') IS NOT NULL
    ORDER BY lower(btrim(pb))
) s
WHERE s.slug <> ''
  AND NOT EXISTS (SELECT 1 FROM public.brands b WHERE lower(b.name) = lower(s.name))
ON CONFLICT (slug) DO NOTHING;

-- 3) ผูกสินค้า/หมวดหมู่กับแบรนด์ด้วยชื่อ (Luminary: partner_brand 'LUMINARY GLOBAL' ตรงกับ brands.name จาก A4b)
UPDATE public.store_items i
SET brand_id = b.id
FROM public.brands b
WHERE i.brand_id IS NULL
  AND nullif(btrim(i.partner_brand), '') IS NOT NULL
  AND lower(btrim(i.partner_brand)) = lower(b.name);

UPDATE public.store_categories c
SET brand_id = b.id
FROM public.brands b
WHERE c.brand_id IS NULL
  AND nullif(btrim(c.partner_brand), '') IS NOT NULL
  AND lower(btrim(c.partner_brand)) = lower(b.name);

COMMIT;
