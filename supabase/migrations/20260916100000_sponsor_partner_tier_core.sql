-- =============================================================================
-- MIGRATION: Sponsor & Partner Tier Management — Core (sponsors table)
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น (Claude ไม่มีสิทธิ์รัน SQL)
-- รันหลัง 20260916090000_backfill_sponsor_banners_and_metric_rpc.sql เสมอ
--
-- อ้างอิง: Master Brief Sponsor And Partner Tier Management System.md +
-- QA Gate approval จากอลิส (2026-09-16)
--
-- หมายเหตุการปรับจาก Tech Spec ต้นฉบับ (SPEC-SPT-001) ให้ตรงกับ convention จริง
-- ของโปรเจกต์ (พบระหว่าง QA pre-implementation):
--   - Owner/actor columns อ้างอิง public.players(id) ไม่ใช่ auth.users(id) ตรงๆ
--     (ตาม pattern audit_logs.actor_id, ap_ledger.player_id, move_ap() ทั้งหมด)
--   - Role check ใน RLS ใช้ public.user_roles (player_id, role, revoked_at)
--     ไม่ใช่ players.role ตรงๆ (ตาม pattern lib/admin/requireAdminRole.ts)
-- =============================================================================

-- ==========================================
-- 1. ENUMS
-- ==========================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sponsor_tier') THEN
        CREATE TYPE public.sponsor_tier AS ENUM ('SPONSOR', 'SPONSOR_PARTNER', 'PARTNER_COOP');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sponsor_status') THEN
        CREATE TYPE public.sponsor_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
    END IF;
END $$;

-- ==========================================
-- 2. SPONSORS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.sponsors (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name       TEXT NOT NULL,
    brand_logo_url     TEXT NOT NULL,
    contact_email      TEXT NOT NULL,
    partner_player_id  UUID REFERENCES public.players(id) ON DELETE SET NULL,
    tier               public.sponsor_tier NOT NULL DEFAULT 'SPONSOR',
    status             public.sponsor_status NOT NULL DEFAULT 'PENDING',
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_by         UUID REFERENCES public.players(id) ON DELETE SET NULL,
    approved_by        UUID REFERENCES public.players(id) ON DELETE SET NULL,
    rejection_reason   TEXT,
    metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsors_tier_status ON public.sponsors(tier, status, is_active);
CREATE INDEX IF NOT EXISTS idx_sponsors_partner_player ON public.sponsors(partner_player_id);

-- ==========================================
-- 3. ROW-LEVEL SECURITY
-- ==========================================
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Approved Active Sponsors" ON public.sponsors;
CREATE POLICY "Public Read Approved Active Sponsors" ON public.sponsors
    FOR SELECT USING (status = 'APPROVED' AND is_active = TRUE);

DROP POLICY IF EXISTS "Partner Read Own Sponsor Record" ON public.sponsors;
CREATE POLICY "Partner Read Own Sponsor Record" ON public.sponsors
    FOR SELECT USING (
        partner_player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
    );

-- ⚠️ นโยบายนี้เป็น defense-in-depth เท่านั้น — เส้นทาง admin จริงทั้งหมดใช้
-- createAdminClient() (service role key) ที่ bypass RLS อยู่แล้ว และมี
-- requireAdminRole() gate ที่ application layer เป็นด่านหลัก
DROP POLICY IF EXISTS "Admin Full Access Sponsors" ON public.sponsors;
CREATE POLICY "Admin Full Access Sponsors" ON public.sponsors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.players p
            JOIN public.user_roles ur ON ur.player_id = p.id
            WHERE p.user_id = auth.uid()
              AND ur.revoked_at IS NULL
              AND ur.role IN ('SUPER_ADMIN', 'ADMIN', 'MARKETPLACE_ADMIN')
        )
    );
