-- =============================================================================
-- HOTFIX 2b: ย้าย 12 ฟังก์ชันจากชั้น 2 (authenticated เรียกได้) ขึ้นชั้น 1 (server เท่านั้น)
-- อ้างอิง: 03_QA_RESULTS/HOTFIX-2_RPC_Grants_SQL_2026-09-26.md หมวด 9 ก้อน 5
-- พี่หยัดรันบน live แล้ว 2026-09-27 · อลิสตรวจ live 12:16: tier1_now 12 · still_authenticated 0
--
-- เงื่อนไข: รันหลัง PR #53 (route ทั้ง 12 ฟังก์ชันนี้เรียกผ่าน createAdminClient() แล้ว)
-- merge เข้า main และ Vercel deploy ขึ้น production แล้วเท่านั้น มิฉะนั้นฟีเจอร์ที่ยัง
-- เรียกด้วย session ผู้ใช้ (ไม่ใช่ admin client) จะพังทันทีเพราะ authenticated ถูกถอนสิทธิ์
-- =============================================================================

BEGIN;
REVOKE EXECUTE ON FUNCTION
  public.admin_void_match_and_refund(uuid, uuid, text),
  public.admin_revert_prediction_pool(uuid, uuid),
  public.settle_prediction_pool(uuid, uuid),
  public.process_affiliate_spend_cashback(uuid, numeric, character varying),
  public.transfer_ap_to_escrow(uuid, uuid, bigint, text),
  public.dispute_escrow_and_refund(uuid, uuid),
  public.release_escrow_to_receiver(uuid, boolean),
  public.credit_watch_v2_heartbeat(uuid, uuid),
  public.buy_prediction_ticket(uuid, uuid, uuid, prediction_ticket_tier_type, bigint, text),
  public.renew_subscription_with_ap(uuid, uuid, text),
  public.buyout_marketplace_item(uuid, uuid, text),
  public.match_ffxi_blind_bid(uuid, uuid, numeric, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.admin_void_match_and_refund(uuid, uuid, text),
  public.admin_revert_prediction_pool(uuid, uuid),
  public.settle_prediction_pool(uuid, uuid),
  public.process_affiliate_spend_cashback(uuid, numeric, character varying),
  public.transfer_ap_to_escrow(uuid, uuid, bigint, text),
  public.dispute_escrow_and_refund(uuid, uuid),
  public.release_escrow_to_receiver(uuid, boolean),
  public.credit_watch_v2_heartbeat(uuid, uuid),
  public.buy_prediction_ticket(uuid, uuid, uuid, prediction_ticket_tier_type, bigint, text),
  public.renew_subscription_with_ap(uuid, uuid, text),
  public.buyout_marketplace_item(uuid, uuid, text),
  public.match_ffxi_blind_bid(uuid, uuid, numeric, text)
TO service_role;
COMMIT;
