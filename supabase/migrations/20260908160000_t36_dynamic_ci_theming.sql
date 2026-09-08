-- =============================================================================
-- MIGRATION: T3.6 — Dynamic CI Theming
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น
--
-- Verify กับ DB จริงก่อนเขียนไฟล์นี้แล้วพบว่า:
--   * public.brand_themes ไม่มีอยู่เลย ไม่มี ENUM ชื่อ theme/scope ชนด้วย — สร้างใหม่ได้เต็มที่
--   * public.seasons มีข้อมูล Spring/Summer/Fall/Winter 2026 อยู่แล้วจริง (ผ่าน circuit
--     เดียวกัน) จึง seed SEASON-scoped themes โดยอ้าง seasons.id ตัวจริงตรง ๆ แทนการ
--     เขียน dynamic lookup/สร้าง season ใหม่ซ้ำซ้อน — id ยืนยันจาก DB จริงมีดังนี้:
--       SPRING  e9be5b6a-9291-4306-9db9-0873e80fb810  (2026-01-01 .. 2026-03-31)
--       SUMMER  985763f3-2f28-44aa-a4bd-1897998f1ad4  (2026-04-01 .. 2026-06-30)
--       FALL    4f9b7947-e253-480f-8e86-35ac3296cddd  (2026-07-01 .. 2026-09-30)
--       WINTER  67758a49-2a1d-4560-b6b8-a9d878080acf  (2026-10-01 .. 2026-12-31)
--   * ค่าสี seed อ้างอิงตรงจาก CI_Color_Palette.md (Locked) เท่านั้น — ไม่ใช้ค่าจากดราฟต์
--     migration อื่นที่พี่หยัดส่งมาให้ดูเป็นตัวอย่าง เพราะดราฟต์นั้นมีสี SUMMER ผิด
--     (#E8B429 ซึ่งเป็นสี GLOBAL primary ไม่ใช่ #F5C542 ตามสเปคที่ล็อกไว้) และไม่ได้ตั้ง
--     active_from/active_until ตามช่วงฤดูกาลเลย ซึ่งเป็นหัวใจของ cascade logic ข้อนี้
--
-- Cascade model: "scope → fallback GLOBAL เสมอ" ตีความเป็น 3 ชั้นซ้อนแบบ CSS cascade
-- จริง (ไม่ใช่ winner-takes-all): GLOBAL (ฐาน) < SEASON ที่ active ตามวันที่ปัจจุบัน <
-- scope เจาะจงที่ผู้เรียก request มา (TOURNAMENT/ORGANIZATION/TEAM) — สอดคล้องกับ
-- seed data ที่ seasonal theme กำหนดแค่ "primary" คีย์เดียว (คีย์อื่นคาดว่า fallback
-- มาจาก GLOBAL) และ endpoint จะ merge ให้เป็น object เดียวก่อนส่งกลับ
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.brand_themes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(50) NOT NULL UNIQUE,
    name                VARCHAR(100) NOT NULL,
    scope_type          VARCHAR(30) NOT NULL CHECK (scope_type IN ('GLOBAL', 'SEASON', 'TOURNAMENT', 'ORGANIZATION', 'TEAM')),
    scope_id            UUID,
    colors              JSONB NOT NULL DEFAULT '{}'::jsonb,
    typography          JSONB NOT NULL DEFAULT '{}'::jsonb,
    assets              JSONB NOT NULL DEFAULT '{}'::jsonb,
    custom_css_vars     JSONB NOT NULL DEFAULT '{}'::jsonb,
    priority            SMALLINT NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    active_from         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active_until        TIMESTAMPTZ,
    created_by          UUID REFERENCES public.players(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_theme_scope CHECK (
        (scope_type = 'GLOBAL' AND scope_id IS NULL)
        OR (scope_type <> 'GLOBAL' AND scope_id IS NOT NULL)
    ),
    CONSTRAINT chk_theme_window CHECK (
        active_until IS NULL OR active_until > active_from
    )
);

CREATE INDEX IF NOT EXISTS idx_brand_themes_scope ON public.brand_themes(scope_type, scope_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_brand_themes_active ON public.brand_themes(priority DESC, active_from DESC) WHERE is_active = TRUE;

ALTER TABLE public.brand_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_themes_public_select" ON public.brand_themes;
CREATE POLICY "brand_themes_public_select" ON public.brand_themes
    FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "brand_themes_admin_all" ON public.brand_themes;
CREATE POLICY "brand_themes_admin_all" ON public.brand_themes
    FOR ALL USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- Seed: GLOBAL default theme (ค่าตรงจาก CI_Color_Palette.md ล็อกแล้ว)
-- -----------------------------------------------------------------------------
INSERT INTO public.brand_themes (code, name, scope_type, scope_id, colors, custom_css_vars, priority, is_active, active_from, active_until)
VALUES (
    'GLOBAL_DEFAULT',
    'Zodiac Arena — Global Default Theme',
    'GLOBAL',
    NULL,
    '{
        "primary": "#E8B429",
        "secondary": "#9184D9",
        "background": "#0D0E1A",
        "surface": "#1A1C2E",
        "text_primary": "#F9EDD8",
        "text_secondary": "#94A3B8"
    }'::jsonb,
    '{
        "--zodiac-color-primary": "#E8B429",
        "--zodiac-color-secondary": "#9184D9",
        "--zodiac-color-background": "#0D0E1A",
        "--zodiac-color-surface": "#1A1C2E",
        "--zodiac-color-text-primary": "#F9EDD8",
        "--zodiac-color-text-secondary": "#94A3B8"
    }'::jsonb,
    0,
    TRUE,
    '2026-01-01T00:00:00+00',
    NULL
)
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Seed: Seasonal themes 2026 — scope_id อ้างอิง seasons.id จริงตามที่ verify แล้ว
-- -----------------------------------------------------------------------------
INSERT INTO public.brand_themes (code, name, scope_type, scope_id, colors, custom_css_vars, priority, is_active, active_from, active_until)
VALUES
    (
        'SEASON_SPRING_2026',
        'Spring 2026 Season Theme',
        'SEASON',
        'e9be5b6a-9291-4306-9db9-0873e80fb810',
        '{"primary": "#63A66F"}'::jsonb,
        '{"--zodiac-color-primary": "#63A66F"}'::jsonb,
        10,
        TRUE,
        '2026-01-01T00:00:00+00',
        '2026-03-31T23:59:59+00'
    ),
    (
        'SEASON_SUMMER_2026',
        'Summer 2026 Season Theme',
        'SEASON',
        '985763f3-2f28-44aa-a4bd-1897998f1ad4',
        '{"primary": "#F5C542"}'::jsonb,
        '{"--zodiac-color-primary": "#F5C542"}'::jsonb,
        10,
        TRUE,
        '2026-04-01T00:00:00+00',
        '2026-06-30T23:59:59+00'
    ),
    (
        'SEASON_FALL_2026',
        'Fall 2026 Season Theme',
        'SEASON',
        '4f9b7947-e253-480f-8e86-35ac3296cddd',
        '{"primary": "#E87529"}'::jsonb,
        '{"--zodiac-color-primary": "#E87529"}'::jsonb,
        10,
        TRUE,
        '2026-07-01T00:00:00+00',
        '2026-09-30T23:59:59+00'
    ),
    (
        'SEASON_WINTER_2026',
        'Winter 2026 Season Theme',
        'SEASON',
        '67758a49-2a1d-4560-b6b8-a9d878080acf',
        '{"primary": "#5BA8D4"}'::jsonb,
        '{"--zodiac-color-primary": "#5BA8D4"}'::jsonb,
        10,
        TRUE,
        '2026-10-01T00:00:00+00',
        '2026-12-31T23:59:59+00'
    )
ON CONFLICT (code) DO NOTHING;
