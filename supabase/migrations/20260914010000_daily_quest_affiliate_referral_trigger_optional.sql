-- =============================================================================
-- OPTIONAL FALLBACK — Daily Quest & Affiliate V6.02, Gap 1 (referral binding)
-- ส่งให้พี่หยัดพิจารณา + อลิสอนุมัติสโคปก่อน — ไม่ใช่ไฟล์ที่ "ต้อง" รันคู่กับ
-- 20260914_daily_quest_and_affiliate_v6.sql เสมอไป
--
-- บริบท: การ bind referrer<->referee หลักตอนนี้ทำที่ app layer แล้วใน
-- app/auth/callback/route.ts (อ่าน cookie `zodiac_affiliate_ref` ที่ middleware.ts
-- ดักไว้จาก ?ref=CODE ตอน login ผ่าน OAuth) ครอบคลุม signup path เดียวที่มีจริงตอนนี้
-- (Riot/Google/TikTok OAuth ผ่าน exchangeCodeForSession) เพียงพอสำหรับ production แล้ว
--
-- ไฟล์นี้เป็นแค่ "เผื่อ" กรณีในอนาคตมี signup path อื่นที่ไม่ผ่าน /auth/callback
-- (เช่น email/password signUp ตรง ๆ ที่ยังไม่มีในระบบตอนนี้ — verify แล้วว่าไม่มี
-- supabase.auth.signUp() ที่ไหนในโค้ดเลย) และอยากมี safety net ระดับ DB ด้วย
--
-- ทำไมถึงไม่ทำตามที่เสนอ (แขวน trigger บน auth.users ต่อจาก handle_new_user เดิม):
--   verify กับ migrations ที่ track ไว้แล้วว่าไม่มี CREATE TRIGGER ... ON auth.users
--   หรือ handle_new_user() ในไฟล์ไหนเลย แปลว่าฟังก์ชันที่สร้างแถว public.players
--   ตอนนี้ (ซึ่งต้องมีอยู่จริงเพราะ dashboard ใช้ players.id ได้เลยหลัง login) เป็น
--   trigger ที่ตั้งไว้ตรงบน DB โดยตรง ไม่ได้อยู่ใน migration ที่ track — ไม่รู้ชื่อจริง
--   และ Postgres รัน trigger หลายตัวบน event เดียวกันเรียงตามชื่อ (alphabetical)
--   ถ้าตั้ง trigger ใหม่บน auth.users แล้วชื่อดันเรียงก่อน trigger เดิม จะอ่าน
--   public.players ไม่เจอแถวเลย (ยังไม่ถูกสร้าง) แล้ว silently ไม่ผูก referral ให้ใครเลย
--   โดยไม่มี error ให้เห็น — เสี่ยงเกินไปที่จะเดา จึงเปลี่ยนมาแขวนบน public.players
--   AFTER INSERT แทน ซึ่งรับประกันว่าแถวผู้เล่นมีอยู่แล้วแน่นอน ไม่ว่าใครเป็นคนสร้างแถวนั้น
--
-- ข้อจำกัด: ครอบคลุมเฉพาะกรณีที่ referral code ถูกส่งมาทาง
-- auth.users.raw_user_meta_data->>'referral_code' เท่านั้น (เช่น ถ้าอนาคตมีฟอร์ม signup
-- ที่ใส่ referral_code ลง options.data ตอนสมัคร) — เคส cookie (?ref= จากลิงก์ชวนเพื่อน)
-- Postgres มองไม่เห็น cookie ของ browser จึงต้องพึ่ง app layer เท่านั้นสำหรับเคสนั้น
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.bind_affiliate_referral_on_player_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ref_code TEXT;
    v_referrer_id UUID;
BEGIN
    SELECT raw_user_meta_data->>'referral_code' INTO v_ref_code
    FROM auth.users
    WHERE id = NEW.user_id;

    IF v_ref_code IS NULL OR v_ref_code = '' THEN
        RETURN NEW;
    END IF;

    SELECT player_id INTO v_referrer_id
    FROM public.affiliate_codes
    WHERE code = v_ref_code;

    IF v_referrer_id IS NOT NULL AND v_referrer_id <> NEW.id THEN
        INSERT INTO public.affiliate_referrals (referrer_id, referee_id, affiliate_code, status)
        VALUES (v_referrer_id, NEW.id, v_ref_code, 'PENDING_KYC')
        ON CONFLICT (referee_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bind_affiliate_referral_on_player_created ON public.players;
CREATE TRIGGER trg_bind_affiliate_referral_on_player_created
    AFTER INSERT ON public.players
    FOR EACH ROW
    EXECUTE FUNCTION public.bind_affiliate_referral_on_player_created();

COMMIT;
