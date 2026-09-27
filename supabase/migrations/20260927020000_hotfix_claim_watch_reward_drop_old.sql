-- =============================================================================
-- HOTFIX: ลบ overload เก่าของ claim_watch_reward(uuid) + ปิดสิทธิ์ผ่านชั้น 1
-- อ้างอิง: 03_QA_RESULTS/HOTFIX-2_RPC_Grants_SQL_2026-09-26.md หมวด 10.4 (ก้อน 9)
-- พี่หยัดรันบน live แล้ว 2026-09-27 12:20 · อลิสตรวจ live 12:21 ผ่าน
--
-- นิยามใหม่ของ claim_watch_reward(p_session_id, p_idempotency_key) มีอยู่แล้วใน
-- supabase/migrations/20260909000000_t_critical_bugfix_dispute_and_idempotency.sql
-- (ข้อ 3 ของไฟล์นั้น) — ไม่ใส่ CREATE OR REPLACE ซ้ำในไฟล์นี้ ไฟล์นี้บันทึกแค่การ
-- DROP overload เก่า (uuid) ที่ route เรียกไม่ถึงอีกต่อไป และปิดสิทธิ์ overload ใหม่
-- ให้เหลือแค่ service_role ตามชั้น 1
-- =============================================================================

BEGIN;
DROP FUNCTION public.claim_watch_reward(uuid);

REVOKE EXECUTE ON FUNCTION public.claim_watch_reward(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_watch_reward(uuid, text) TO service_role;
COMMIT;
