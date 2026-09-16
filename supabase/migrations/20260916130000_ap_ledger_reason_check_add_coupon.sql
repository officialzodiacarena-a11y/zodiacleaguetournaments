-- =============================================================================
-- MIGRATION: Extend ap_ledger_reason_check with COUPON_REDEEM
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น (Claude ไม่มีสิทธิ์รัน SQL)
-- รันหลัง 20260914_match_room_mercy_scrim_v7_01_fixes.sql เสมอ (ต้องเป็น
-- migration ล่าสุดที่แก้ constraint นี้ ณ เวลาที่รัน — ถ้ามี migration อื่นที่
-- เพิ่ม reason ใหม่ระหว่างทาง ให้ union ค่าจากไฟล์นั้นเข้ามาด้วยก่อนรัน ตาม
-- pattern ที่เคยแก้ไว้ใน commit 3109521)
--
-- Union ค่าเดิมทั้ง 25 ค่าจาก 20260914_match_room_mercy_scrim_v7_01_fixes.sql
-- ไว้ครบ แล้วเพิ่ม COUPON_REDEEM ท้ายรายการ (สำรองไว้สำหรับรอบ integration
-- ถัดไปที่จะโยง verify_and_redeem_partner_coupon() เข้ากับ checkout flow จริง
-- — migration ชุดนี้ยังไม่มีจุดใดเรียก move_ap() ด้วย reason นี้)
-- =============================================================================

ALTER TABLE public.ap_ledger DROP CONSTRAINT IF EXISTS ap_ledger_reason_check;
ALTER TABLE public.ap_ledger ADD CONSTRAINT ap_ledger_reason_check
    CHECK (reason IN (
        'WATCH_REWARD', 'CLAWBACK', 'ADMIN_ADJUSTMENT', 'STORE_REDEEM', 'TOP_UP',
        'REFUND_AP_CREDIT', 'PENALTY_FINE', 'SUBSCRIPTION_RENEWAL', 'MARKETPLACE_BID',
        'MARKETPLACE_REFUND', 'MARKETPLACE_SOLD', 'ESCROW_LOCK', 'ESCROW_SETTLED',
        'ESCROW_AUTO_RELEASE', 'PREDICTION_BUY', 'PREDICTION_PAYOUT',
        'PREDICTION_REFUND_VOID', 'PREDICTION_HOUSE_FEE_BURN', 'WATCH_EARN',
        'PREDICTION_JACKPOT_PAYOUT', 'SCRIM_ESCROW_LOCK', 'SCRIM_MERCY_RINGER_STAKE',
        'QUEST_REWARD', 'REFERRAL', 'SCRIM_VICTORY_PAYOUT', 'SCRIM_REFUND',
        'COUPON_REDEEM'
    ));
