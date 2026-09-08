-- =============================================================================
-- MIGRATION: T4.0 — Manual Athlete Verification (Sprint 4.0 Bridge)
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น
--
-- Verify กับ DB จริงก่อนเขียนไฟล์นี้แล้วพบว่า (2026-09-08):
--   * verification_status_type ENUM มีค่าจริงคือ
--     UNVERIFIED / PENDING / VERIFIED / REJECTED / REVOKED / MANUAL_REVIEW
--     — ไม่มีค่า UNLINKED ตามดราฟต์สเปคเดิม จึงใช้ UNVERIFIED แทนตลอดทั้งไฟล์นี้และโค้ด API
--     และ Revoke ใช้ REVOKED (ค่า ENUM จริง) แทน SELF_DECLARED ที่ไม่มีอยู่จริง
--   * public.game_accounts มีคอลัมน์ rejection_reason, verified_at, verified_by,
--     rso_access_token, rso_refresh_token, rso_expires_at, rso_scopes อยู่แล้ว — ไม่ ALTER ซ้ำ
--     ยังขาดแค่ evidence_url และ reviewed_at (reviewed_by ใช้ verified_by แทนได้ ไม่สร้างคอลัมน์ใหม่)
--   * public.players ยังไม่มีคอลัมน์ unverified_data — ต้อง ALTER เพิ่ม
--   * public.is_admin() และ public.current_player_id() ถูกสร้างไว้แล้วใน
--     20260908000000_t24_referee_dispute_operations.sql — ไม่ต้องนิยามซ้ำในไฟล์นี้
--   * Storage bucket verification-evidence ยังไม่มี ต้องสร้างพร้อม RLS policies
-- =============================================================================

-- players: สลักธงแจ้งเตือนความน่าสงสัยของข้อมูลสถิติเดิม
ALTER TABLE public.players
    ADD COLUMN IF NOT EXISTS unverified_data BOOLEAN NOT NULL DEFAULT FALSE;

-- game_accounts: เพิ่มเฉพาะคอลัมน์ที่ยังไม่มีจริง
ALTER TABLE public.game_accounts
    ADD COLUMN IF NOT EXISTS evidence_url TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- region: บังคับค่าเริ่มต้นเป็นภูมิภาคเอเชียแปซิฟิก (ap)
ALTER TABLE public.game_accounts ALTER COLUMN region SET DEFAULT 'ap';

-- Unique constraint: game_name + tag_line + region ห้ามซ้ำภายในเกมเดียวกัน
ALTER TABLE public.game_accounts
    DROP CONSTRAINT IF EXISTS uq_game_name_tag_region_per_game;
ALTER TABLE public.game_accounts
    ADD CONSTRAINT uq_game_name_tag_region_per_game
    UNIQUE (game_id, game_name, tag_line, region);

-- Index สำหรับ Admin Verification Queue (เรียงเก่าสุดก่อนตามลำดับคิวตรวจ)
CREATE INDEX IF NOT EXISTS idx_game_accounts_pending_verifications
    ON public.game_accounts (created_at ASC)
    WHERE verification_status = 'PENDING';

-- Trigger: ล้าง RSO tokens และสลักธง unverified_data เมื่อแอดมินเพิกถอนสิทธิ์ (REVOKED)
CREATE OR REPLACE FUNCTION public.clean_revoked_game_account()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.verification_status = 'REVOKED' AND OLD.verification_status IS DISTINCT FROM 'REVOKED' THEN
        NEW.rso_access_token := NULL;
        NEW.rso_refresh_token := NULL;
        NEW.rso_expires_at := NULL;
        NEW.rso_scopes := NULL;
        UPDATE public.players
        SET unverified_data = TRUE, updated_at = NOW()
        WHERE id = NEW.player_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clean_revoked_game_account ON public.game_accounts;
CREATE TRIGGER trg_clean_revoked_game_account
    BEFORE UPDATE OF verification_status ON public.game_accounts
    FOR EACH ROW EXECUTE FUNCTION public.clean_revoked_game_account();

-- Storage bucket สำหรับหลักฐานภาพถ่ายยืนยันตัวตน
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'verification-evidence',
    'verification-evidence',
    false,
    5242880,
    ARRAY['image/png','image/jpeg','image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: เจ้าของอัปโหลดได้เฉพาะโฟลเดอร์ตัวเอง, แอดมินจัดการได้ทั้งหมด
DROP POLICY IF EXISTS "owner_upload_evidence" ON storage.objects;
CREATE POLICY "owner_upload_evidence" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'verification-evidence'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = 'evidence'
        AND (storage.foldername(name))[2] = public.current_player_id()::text
    );

DROP POLICY IF EXISTS "admin_manage_evidence" ON storage.objects;
CREATE POLICY "admin_manage_evidence" ON storage.objects
    FOR ALL USING (
        bucket_id = 'verification-evidence'
        AND public.is_admin()
    );
