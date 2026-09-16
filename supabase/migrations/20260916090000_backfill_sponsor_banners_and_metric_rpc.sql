-- =============================================================================
-- BACKFILL: sponsor_banners + increment_banner_metric()
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น (Claude ไม่มีสิทธิ์รัน SQL)
--
-- Context: sponsor_banners table และ increment_banner_metric() RPC มีอยู่จริงบน
-- Supabase production แล้ว (commit 6cc31e4, 7a25a9b) แต่ไม่เคยมี migration file
-- ติดตามใน repo เลย — QA (อลิส) พบว่าเป็น schema drift แบบเดียวกับที่เจอใน
-- 20260908140000_t33_patch_ap_balance_sync.sql มาก่อน ไฟล์นี้ backfill ไว้กัน
-- drift ต่อไปเรื่อยๆ เท่านั้น
--
-- ⚠️ สำคัญ: ใช้ CREATE TABLE IF NOT EXISTS เพื่อไม่แตะ production table ที่มีอยู่
-- แล้ว (มีข้อมูลจริงอยู่) — ตั้งใจ "ไม่เปิด RLS" ในไฟล์นี้ เพราะไม่ทราบว่า
-- production table เปิด RLS อยู่แล้วหรือไม่ (public route app/api/v1/banners/route.ts
-- อ่านผ่าน regular client สำเร็จอยู่ในปัจจุบัน) — ถ้าเปิด RLS โดยไม่มี policy ที่
-- ถูกต้องอาจทำให้แบนเนอร์หน้าบ้านหายทันที พี่หยัดต้องตรวจสอบสถานะ RLS จริงก่อน
-- (Supabase Dashboard > Table Editor > sponsor_banners > RLS) แล้วค่อยตัดสินใจ
-- เปิดในไฟล์แยกต่างหากทีหลัง
--
-- slot_position: ไม่ทราบว่า production เก็บเป็น Postgres ENUM type จริงหรือ
-- TEXT + CHECK constraint — ไฟล์นี้สมมติเป็น TEXT + CHECK (ปลอดภัยกว่าเพราะ
-- CREATE TYPE จะ error ถ้ามี type ชื่อชนกันอยู่แล้วในรูปแบบอื่น) โปรดตรวจสอบ
-- จริงก่อนรัน ถ้า production เป็น ENUM ให้ข้ามส่วน CREATE TABLE นี้ไปเลย
-- (ตารางมีอยู่แล้วคำสั่งนี้จะ no-op เพราะ IF NOT EXISTS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sponsor_banners (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title            TEXT NOT NULL,
    brand_name       TEXT,
    slot_position    TEXT NOT NULL CHECK (slot_position IN ('TOP_LEADERBOARD', 'LEFT_TOWER', 'RIGHT_TOWER')),
    image_url        TEXT NOT NULL,
    target_url       TEXT NOT NULL,
    priority         INTEGER NOT NULL DEFAULT 0,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at          TIMESTAMPTZ,
    impression_count INTEGER NOT NULL DEFAULT 0,
    click_count      INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Best-effort reconstruction จากพฤติกรรมที่เรียกใช้จริงใน
-- app/api/v1/banners/[id]/track/route.ts (p_metric_type: 'IMPRESSION' | 'CLICK').
-- ⚠️ ใช้ CREATE OR REPLACE เหมือน pattern เดิมของ move_ap() patch — พี่หยัดควร
-- diff กับ pg_get_functiondef('public.increment_banner_metric'::regproc) ของจริง
-- บน production ก่อนรัน เผื่อ implementation จริงมี logic เพิ่มเติมที่ไฟล์นี้ไม่รู้จัก
CREATE OR REPLACE FUNCTION public.increment_banner_metric(
    p_banner_id   UUID,
    p_metric_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_metric_type = 'IMPRESSION' THEN
        UPDATE public.sponsor_banners
        SET impression_count = impression_count + 1, updated_at = NOW()
        WHERE id = p_banner_id;
    ELSIF p_metric_type = 'CLICK' THEN
        UPDATE public.sponsor_banners
        SET click_count = click_count + 1, updated_at = NOW()
        WHERE id = p_banner_id;
    END IF;
END;
$$;
