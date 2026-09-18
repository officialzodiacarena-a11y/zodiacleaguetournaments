-- =============================================================================
-- MIGRATION: Extend ap_ledger_reason_check with TOURNAMENT_ENTRY_FEE
-- ส่งให้พี่หยัด (CEO) รันใน Supabase SQL Editor เท่านั้น (Agent ไม่มีสิทธิ์รัน SQL บน Production)
-- รันหลัง 20260916130000_ap_ledger_reason_check_add_coupon.sql เสมอ
--
-- Union ค่าเดิมทั้งหมด 27 ค่าจาก migration ก่อนหน้า แล้วเพิ่ม TOURNAMENT_ENTRY_FEE
-- เพื่อรองรับการหักค่าสมัครทัวร์นาเมนต์ผ่าน move_ap() RPC ใน actions/registration.ts
-- ตาม Immutable Architectural Rule 1.2 (.antigravity/rules.md)
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
        'COUPON_REDEEM', 'TOURNAMENT_ENTRY_FEE'
    ));
