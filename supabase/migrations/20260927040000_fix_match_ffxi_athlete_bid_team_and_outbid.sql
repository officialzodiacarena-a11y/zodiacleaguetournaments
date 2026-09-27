-- =============================================================================
-- HOTFIX: match_ffxi_athlete_bid — ปิดดีลประมูลแล้วนักกีฬาต้องเข้าทีมจริง +
--         บิดเดิมต้องถูกตั้งสถานะ OUTBID เมื่อบิดใหม่ปิดดีลทันที
-- อ้างอิง: 02_RECEIVED_FROM_SILA/Sila_For_Alich🐱Sun162527092026.md ข้อ 2
--          (พี่ศิลา) + อลิสตรวจ enum team_role_type กับ live แล้วใช้ 'PLAYER'
--          แทน 'MEMBER' ที่เขียนผิดในไฟล์ต้นทาง (ตรงกับ buyout_athlete_listing)
-- ต้นฉบับฟังก์ชัน: คัดลอกจาก DRIFT_Live_Function_Defs_2026-09-27.sql ทุกตัวอักษร
--                  แก้เพิ่มแค่ 2 จุด (ดู diff ในไฟล์ตอบ FROM_KOLT)
-- พี่หยัดต้องรัน migration นี้บน live เอง แล้วให้อลิสตรวจผ่าน alis_readonly
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.match_ffxi_athlete_bid(p_listing_id uuid, p_bidder_player_id uuid, p_destination_team_id uuid, p_bid_amount_ap integer, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_listing RECORD;
    v_bidder_ap INT;
    v_fee INT;
    v_payout INT;
BEGIN
    SET LOCAL lock_timeout = '3s';

    SELECT * INTO v_listing
    FROM public.athlete_market_listings
    WHERE id = p_listing_id AND status = 'ACTIVE'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'LISTING_NOT_ACTIVE', 'message', 'รายการสัญญานี้ปิดไปแล้วหรือไม่มีอยู่จริง');
    END IF;

    IF p_bidder_player_id = v_listing.seller_player_id THEN
        RETURN jsonb_build_object('success', false, 'code', 'SELF_BID_FORBIDDEN', 'message', 'ไม่สามารถยื่นประมูลสัญญาของตนเองได้');
    END IF;

    SELECT ap_balance INTO v_bidder_ap
    FROM public.players
    WHERE id = p_bidder_player_id
    FOR UPDATE;

    IF v_bidder_ap < p_bid_amount_ap THEN
        RETURN jsonb_build_object('success', false, 'code', 'INSUFFICIENT_AP_BALANCE', 'message', 'แต้ม AP ของท่านไม่พอสำหรับยื่น Bid นี้');
    END IF;

    -- กรณี Bid >= floor_price_ap ปิดดีลทันที
    IF p_bid_amount_ap >= v_listing.floor_price_ap THEN
        v_fee := FLOOR(p_bid_amount_ap * 0.05);
        v_payout := p_bid_amount_ap - v_fee;

        IF v_listing.highest_bidder_id IS NOT NULL AND v_listing.current_highest_bid_ap > 0 THEN
            UPDATE public.players 
            SET ap_balance = ap_balance + v_listing.current_highest_bid_ap 
            WHERE id = v_listing.highest_bidder_id;

            UPDATE public.athlete_market_bids
            SET status = 'OUTBID'
            WHERE listing_id = p_listing_id AND status = 'ACCEPTED';
        END IF;

        UPDATE public.players SET ap_balance = ap_balance - p_bid_amount_ap WHERE id = p_bidder_player_id;
        UPDATE public.players SET ap_balance = ap_balance + v_payout WHERE id = v_listing.seller_player_id;

        IF v_fee > 0 THEN
            INSERT INTO public.system_burn_ledger (source_module, burned_ap_amount, reference_id)
            VALUES ('TRANSFER_MARKET_FEE', v_fee, p_listing_id);
        END IF;

        UPDATE public.team_members
        SET team_id = p_destination_team_id, role = 'PLAYER', updated_at = NOW()
        WHERE player_id = v_listing.target_player_id AND status = 'ACTIVE';

        IF NOT FOUND THEN
            INSERT INTO public.team_members (team_id, player_id, role, status)
            VALUES (p_destination_team_id, v_listing.target_player_id, 'PLAYER', 'ACTIVE');
        END IF;

        UPDATE public.athlete_market_listings
        SET status = 'SOLD', current_highest_bid_ap = p_bid_amount_ap, highest_bidder_id = p_bidder_player_id, updated_at = NOW()
        WHERE id = p_listing_id;

        INSERT INTO public.athlete_transfer_history (
            listing_id, player_id, from_team_id, to_team_id, deal_type, final_price_ap, platform_fee_ap, seller_payout_ap
        ) VALUES (
            p_listing_id, v_listing.target_player_id, v_listing.seller_team_id, p_destination_team_id, 'AUCTION_WIN', p_bid_amount_ap, v_fee, v_payout
        );

        INSERT INTO public.athlete_market_bids (listing_id, bidder_player_id, destination_team_id, bid_amount_ap, status)
        VALUES (p_listing_id, p_bidder_player_id, p_destination_team_id, p_bid_amount_ap, 'ACCEPTED');

        RETURN jsonb_build_object('success', true, 'matched', true, 'message', 'ราคาประมูลทะลุ Floor Price! สัญญาถูกจับคู่และโอนย้ายสำเร็จทันที');

    -- กรณี Bid < floor_price_ap บันทึกราคาและ Escrow แต้ม AP
    ELSIF p_bid_amount_ap > v_listing.current_highest_bid_ap THEN
        IF v_listing.highest_bidder_id IS NOT NULL AND v_listing.current_highest_bid_ap > 0 THEN
            UPDATE public.players 
            SET ap_balance = ap_balance + v_listing.current_highest_bid_ap 
            WHERE id = v_listing.highest_bidder_id;

            UPDATE public.athlete_market_bids
            SET status = 'OUTBID'
            WHERE listing_id = p_listing_id AND status = 'ACCEPTED';
        END IF;

        UPDATE public.players SET ap_balance = ap_balance - p_bid_amount_ap WHERE id = p_bidder_player_id;

        UPDATE public.athlete_market_listings
        SET current_highest_bid_ap = p_bid_amount_ap, highest_bidder_id = p_bidder_player_id, updated_at = NOW()
        WHERE id = p_listing_id;

        INSERT INTO public.athlete_market_bids (listing_id, bidder_player_id, destination_team_id, bid_amount_ap, status)
        VALUES (p_listing_id, p_bidder_player_id, p_destination_team_id, p_bid_amount_ap, 'ACCEPTED');

        RETURN jsonb_build_object('success', true, 'matched', false, 'message', 'บันทึกราคาเสนอประมูลเรียบร้อยแล้ว');
    ELSE
        RETURN jsonb_build_object('success', false, 'code', 'BID_TOO_LOW', 'message', 'ราคาเสนอประมูลต้องสูงกว่าราคาเสนอสูงสุดปัจจุบัน');
    END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.match_ffxi_athlete_bid(uuid, uuid, uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_ffxi_athlete_bid(uuid, uuid, uuid, integer, text) TO service_role;

COMMIT;
