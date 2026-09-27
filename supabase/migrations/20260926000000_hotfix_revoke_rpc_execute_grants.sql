-- =============================================================================
-- HOTFIX: ปิดสิทธิ์ EXECUTE ของ RPC การเงิน/AP ที่เปิดให้ anon/authenticated โดย default
-- พี่หยัดรันใน Supabase SQL Editor แล้วเมื่อ 2026-09-26 (ไฟล์นี้ตรงกับ SQL ที่รันจริงทุกตัวอักษร)
--
-- ปัญหา (P0-0 ใน FEATURE-COMMERCE-MKT-HUB_QA_Result_2026-09-26):
--   * move_ap / settle_payment_intent ไม่เช็คผู้เรียก และ anon/authenticated เรียกได้
--     → เติม AP ให้ใครก็ได้ / ปิดใบเติม AP เองโดยไม่จ่ายเงิน
--   * checkout_order: anon มี auth.uid() = NULL → หลุดเช็คเจ้าของ → สั่งจ่ายออเดอร์คนอื่นได้
--   * migration ต้นทางเขียนไว้ว่า "เขียนผ่าน service-role backend เท่านั้น" แต่ไม่เคย REVOKE
--
-- การแก้ (คืนพฤติกรรมที่ตั้งใจไว้ ไม่เปลี่ยน logic ของฟังก์ชัน):
--   * ใช้จาก adminSupabase (service role) อย่างเดียว → ปิดทั้ง anon และ authenticated
--   * ผู้ใช้เรียกผ่าน session ตัวเอง → ปิดแค่ anon
--
-- หมายเหตุ: move_ap(uuid, numeric, text, text, jsonb) เป็น overload ที่มีใน Live DB แต่ไม่มี
-- migration ต้นทางในรีโป (Schema Drift) — ปิดสิทธิ์ไว้ด้วย รอตรวจ pg_get_functiondef
--
-- Rollback: GRANT EXECUTE ON FUNCTION <ฟังก์ชันเดิมทั้ง 7 ตัว> TO PUBLIC, anon, authenticated;
-- ตรวจหลังรัน (ผ่านแล้ว 2026-09-26): has_function_privilege('anon'|'authenticated', ..., 'EXECUTE')
-- =============================================================================

BEGIN;
REVOKE EXECUTE ON FUNCTION public.move_ap(uuid, numeric, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_ap(uuid, numeric, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.settle_payment_intent(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clean_expired_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.move_ap(uuid, numeric, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_ap(uuid, numeric, text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_payment_intent(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.clean_expired_orders() TO service_role;

REVOKE EXECUTE ON FUNCTION public.checkout_order(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_store_order(jsonb, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_and_redeem_partner_coupon(uuid, character varying, integer, character varying) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkout_order(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_store_order(jsonb, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_and_redeem_partner_coupon(uuid, character varying, integer, character varying) TO authenticated, service_role;
COMMIT;
