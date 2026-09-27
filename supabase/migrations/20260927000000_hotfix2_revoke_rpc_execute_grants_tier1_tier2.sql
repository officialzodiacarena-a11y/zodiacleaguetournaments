-- =============================================================================
-- HOTFIX 2: ปิดสิทธิ์ EXECUTE ของฟังก์ชัน SECURITY DEFINER ที่ anon เรียกตรงได้ (46 ตัว)
-- อ้างอิง: 03_Alich_and_Sila/03_QA_RESULTS/HOTFIX-2_RPC_Grants_SQL_2026-09-26.md
-- พี่หยัดรันใน Supabase SQL Editor แล้วเมื่อ 2026-09-27 (ไฟล์นี้ตรงกับ SQL ที่รันจริงทุกตัวอักษร — ก้อน 2 ของเอกสาร)
--
-- ปัญหา: 56 ฟังก์ชัน SECURITY DEFINER เปิดให้ anon เรียกตรงได้โดย default บางตัวเปิด
-- subscription ฟรี / แจก AP / ตัดสินแมตช์ได้ (เช่น mark_subscription_invoice_paid,
-- inject_jackpot_bonus, advance_bracket_node) เปลี่ยนแค่สิทธิ์ ไม่แก้ตัวฟังก์ชัน
--
-- การแบ่งชั้น:
--   ชั้น 1 (22 ตัว) — โค้ดเรียกผ่าน createAdminClient() เท่านั้น / ไม่มีจุดเรียกในแอป /
--     เรียกจาก DB เท่านั้น (cron, ฟังก์ชันอื่น) → ปิด PUBLIC, anon, authenticated เปิดแค่ service_role
--   ชั้น 2 (24 ตัว) — route ยังเรียกด้วย session ผู้ใช้ (createClient()) → ปิดแค่ anon
--     คง authenticated ไว้ก่อน (รอบต่อไป 3a/3b/3c ย้ายขึ้นชั้น 1 ทีละกลุ่มหลังแก้โค้ด)
--
-- ตรวจก่อนรัน (ก้อน 1, ผ่านแล้ว 2026-09-27): เจอแค่ cron job สองตัวที่คาดไว้
--   (sweep-subscription-lifecycle tier 1, auto-release-escrow tier 2 · user=postgres)
--   ไม่มี RLS policy / view / invoker function อ้างถึงฟังก์ชันกลุ่มนี้
-- ตรวจหลังรัน (ก้อน 3, ผ่านแล้ว 2026-09-27): not_found=0 · tier1_ok=22 · tier2_ok=24
--
-- Rollback: ดูหมวด 6 ของเอกสาร (GRANT คืนให้ anon/authenticated ตามชั้นเดิม)
-- ใช้เฉพาะกรณีเว็บพังจากการปิดสิทธิ์นี้เท่านั้น
-- =============================================================================

BEGIN;

-- ชั้น 1: server เท่านั้น (22)
REVOKE EXECUTE ON FUNCTION
  public.claim_watch_reward(uuid),
  public.process_affiliate_kyc_bonus(uuid),
  public.settle_scrim_escrow(uuid, character varying, character varying),
  public.claim_mercy_sub_slot(uuid, uuid, character varying),
  public.create_scrim_room(character varying, uuid, timestamp with time zone, numeric, character varying, character varying, character varying),
  public.advance_bracket_node(uuid, uuid),
  public.approve_scrim_room(uuid),
  public.confirm_shelf_payment(uuid),
  public.increment_banner_metric(uuid, text),
  public.inject_jackpot_bonus(uuid, uuid),
  public.mark_subscription_invoice_paid(uuid),
  public.open_prediction_pool(uuid, numeric),
  public.redeem_sponsor_perk(uuid, numeric),
  public.refresh_team_analytics(),
  public.resolve_expired_ready_checks(),
  public.resolve_match_season_id(uuid),
  public.sweep_subscription_lifecycle(),
  public.trigger_mercy_beacon(uuid, character varying, valorant_agent_role_enum),
  public.increment_banner_click(uuid),
  public.increment_banner_impression(uuid),
  public.deduct_player_ap_fine(uuid, numeric, text),
  public.check_athlete_roster_lock(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.claim_watch_reward(uuid),
  public.process_affiliate_kyc_bonus(uuid),
  public.settle_scrim_escrow(uuid, character varying, character varying),
  public.claim_mercy_sub_slot(uuid, uuid, character varying),
  public.create_scrim_room(character varying, uuid, timestamp with time zone, numeric, character varying, character varying, character varying),
  public.advance_bracket_node(uuid, uuid),
  public.approve_scrim_room(uuid),
  public.confirm_shelf_payment(uuid),
  public.increment_banner_metric(uuid, text),
  public.inject_jackpot_bonus(uuid, uuid),
  public.mark_subscription_invoice_paid(uuid),
  public.open_prediction_pool(uuid, numeric),
  public.redeem_sponsor_perk(uuid, numeric),
  public.refresh_team_analytics(),
  public.resolve_expired_ready_checks(),
  public.resolve_match_season_id(uuid),
  public.sweep_subscription_lifecycle(),
  public.trigger_mercy_beacon(uuid, character varying, valorant_agent_role_enum),
  public.increment_banner_click(uuid),
  public.increment_banner_impression(uuid),
  public.deduct_player_ap_fine(uuid, numeric, text),
  public.check_athlete_roster_lock(uuid)
TO service_role;

-- ชั้น 2: ปิด anon · คง authenticated (24)
REVOKE EXECUTE ON FUNCTION
  public.get_athlete_telemetry_dashboard_v26(uuid),
  public.get_athlete_telemetry_dashboard(uuid),
  public.admin_revert_prediction_pool(uuid, uuid),
  public.admin_void_match_and_refund(uuid, uuid, text),
  public.settle_prediction_pool(uuid, uuid),
  public.buy_prediction_ticket(uuid, uuid, uuid, prediction_ticket_tier_type, bigint, text),
  public.buyout_athlete_listing(uuid, uuid, uuid),
  public.buyout_marketplace_item(uuid, uuid, text),
  public.credit_watch_v2_heartbeat(uuid, uuid),
  public.dispute_escrow_and_refund(uuid, uuid),
  public.match_ffxi_athlete_bid(uuid, uuid, uuid, integer, text),
  public.match_ffxi_blind_bid(uuid, uuid, numeric, text),
  public.process_affiliate_spend_cashback(uuid, numeric, character varying),
  public.release_escrow_to_receiver(uuid, boolean),
  public.renew_subscription_with_ap(uuid, uuid, text),
  public.transfer_ap_to_escrow(uuid, uuid, bigint, text),
  public.claim_daily_quest_reward(uuid, character varying, character varying),
  public.consume_p2p_transfer_token(text, uuid),
  public.issue_p2p_otp_challenge(uuid, text),
  public.verify_p2p_otp_challenge(uuid, text),
  public.create_marketplace_listing(uuid, text, text, jsonb, listing_currency_type, numeric, numeric, boolean, timestamp with time zone),
  public.create_subscription_invoice(text, subscriber_owner_type, uuid, text),
  public.get_daily_unverified_bid_total(uuid),
  public.request_perk_redemption(uuid, uuid, numeric, text, uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.get_athlete_telemetry_dashboard_v26(uuid),
  public.get_athlete_telemetry_dashboard(uuid),
  public.admin_revert_prediction_pool(uuid, uuid),
  public.admin_void_match_and_refund(uuid, uuid, text),
  public.settle_prediction_pool(uuid, uuid),
  public.buy_prediction_ticket(uuid, uuid, uuid, prediction_ticket_tier_type, bigint, text),
  public.buyout_athlete_listing(uuid, uuid, uuid),
  public.buyout_marketplace_item(uuid, uuid, text),
  public.credit_watch_v2_heartbeat(uuid, uuid),
  public.dispute_escrow_and_refund(uuid, uuid),
  public.match_ffxi_athlete_bid(uuid, uuid, uuid, integer, text),
  public.match_ffxi_blind_bid(uuid, uuid, numeric, text),
  public.process_affiliate_spend_cashback(uuid, numeric, character varying),
  public.release_escrow_to_receiver(uuid, boolean),
  public.renew_subscription_with_ap(uuid, uuid, text),
  public.transfer_ap_to_escrow(uuid, uuid, bigint, text),
  public.claim_daily_quest_reward(uuid, character varying, character varying),
  public.consume_p2p_transfer_token(text, uuid),
  public.issue_p2p_otp_challenge(uuid, text),
  public.verify_p2p_otp_challenge(uuid, text),
  public.create_marketplace_listing(uuid, text, text, jsonb, listing_currency_type, numeric, numeric, boolean, timestamp with time zone),
  public.create_subscription_invoice(text, subscriber_owner_type, uuid, text),
  public.get_daily_unverified_bid_total(uuid),
  public.request_perk_redemption(uuid, uuid, numeric, text, uuid)
TO authenticated, service_role;

COMMIT;
