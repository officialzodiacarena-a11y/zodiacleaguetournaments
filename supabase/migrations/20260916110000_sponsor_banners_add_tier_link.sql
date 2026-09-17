-- =============================================================================
-- MIGRATION: Link sponsor_banners -> sponsors + tier column
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น (Claude ไม่มีสิทธิ์รัน SQL)
-- รันหลัง 20260916100000_sponsor_partner_tier_core.sql เสมอ
--
-- Additive-only: เพิ่มคอลัมน์ nullable สองตัว ไม่แตะข้อมูลเดิมของ
-- sponsor_banners ที่มีอยู่แล้วบน production เลย ปลอดภัยต่อ rows เก่าที่ยัง
-- ไม่มี sponsor ผูกอยู่ (sponsor_id/tier จะเป็น NULL ไปก่อนจนกว่าแอดมินจะผูก
-- แบนเนอร์เดิมเข้ากับ sponsor record ผ่านหน้า UI ใหม่)
-- =============================================================================

ALTER TABLE public.sponsor_banners
    ADD COLUMN IF NOT EXISTS sponsor_id UUID REFERENCES public.sponsors(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS tier public.sponsor_tier;

CREATE INDEX IF NOT EXISTS idx_sponsor_banners_sponsor_id ON public.sponsor_banners(sponsor_id);

-- หมายเหตุ: Master Brief ต้องการให้ Tier 2/3 มีพื้นที่แสดงผลพรีเมียมเพิ่ม
-- (TOURNAMENT_HERO, MATCH_LOBBY, STORE_FEATURED) นอกเหนือจาก 3 ตำแหน่งเดิม
-- (TOP_LEADERBOARD, LEFT_TOWER, RIGHT_TOWER) — ไม่รวมอยู่ใน migration นี้เพราะ
-- ยังไม่ทราบชนิดคอลัมน์จริงของ slot_position บน production (ENUM type หรือ
-- TEXT+CHECK) การขยายค่าต้องใช้คำสั่งคนละแบบกัน (ALTER TYPE ... ADD VALUE
-- vs DROP/ADD CONSTRAINT) พี่หยัดช่วยยืนยันชนิดคอลัมน์จริงก่อน แล้วจะตามด้วย
-- migration แยกสำหรับขยาย slot ในรอบถัดไป
