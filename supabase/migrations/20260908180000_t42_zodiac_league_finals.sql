-- =============================================================================
-- MIGRATION: T4.2 — The Grand Event (Zodiac League Finals)
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น
--
-- หมายเหตุความสอดคล้องกับ DB จริง (2026-09-08):
--   * public.circuit_standings มีคอลัมน์ finals_seed อยู่แล้วจาก
--     20260908100000_t31_finals_seed.sql (พร้อม unique index เดิมชื่อ uq_finals_seed
--     ที่ scope ต่อ circuit_id) — ALTER ... ADD COLUMN IF NOT EXISTS ด้านล่างจึงเป็น no-op
--     ปลอดภัย ส่วน uq_finals_seed_per_circuit เป็น unique index ใหม่เพิ่มเติมตามที่ระบุ
--     (สโคป global ไม่ผูก circuit_id ตามชื่อ — สอดคล้องกับสถาปัตยกรรมที่มี "1 Annual Circuit
--     ระดับประเทศ" ที่ทำ Finals ในคราวเดียว ไม่มีสองวงจรแข่งขันคู่ขนานที่ต้อง qualify พร้อมกัน)
--   * public.tournaments.format_config ยังไม่ยืนยันว่ามีอยู่จริงใน DB คอลัมน์นี้ไม่ปรากฏใน
--     types/supabase.ts ที่ generate ไว้ก่อนหน้า — ใส่ ALTER ... ADD COLUMN IF NOT EXISTS
--     เป็นตาข่ายนิรภัยแบบ idempotent (ไม่กระทบข้อมูลเดิมถ้ามีคอลัมน์อยู่แล้วจริง) เพื่อรองรับ
--     business rule ที่ระบุให้เก็บผล Zodiac Draw ไว้ที่ tournaments.format_config JSONB
--   * public.bracket_nodes.match_id มีอยู่จริงแล้ว (ใช้งานจริงใน advance_bracket_node()
--     ของ 20260908000000_t24_referee_dispute_operations.sql) — ไม่ต้อง ALTER
--   * public.is_admin() ถูกสร้างไว้แล้วในไมเกรชันเดียวกันข้างต้น — ไม่ต้องนิยามซ้ำ
-- =============================================================================

-- circuit_standings: คอลัมน์ seed/qualified (no-op ถ้ามีอยู่แล้ว)
ALTER TABLE public.circuit_standings
    ADD COLUMN IF NOT EXISTS finals_seed SMALLINT CHECK (finals_seed >= 1 AND finals_seed <= 12),
    ADD COLUMN IF NOT EXISTS is_finals_qualified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_finals_seed_per_circuit
    ON public.circuit_standings (finals_seed)
    WHERE is_finals_qualified = TRUE;

-- tournaments: ตาข่ายนิรภัยรองรับการเก็บผล Zodiac Draw แบบ JSONB
ALTER TABLE public.tournaments
    ADD COLUMN IF NOT EXISTS format_config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- hall_of_fame (ตารางใหม่ — APPEND-ONLY)
CREATE TABLE IF NOT EXISTS public.hall_of_fame (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year            INTEGER NOT NULL CHECK (year >= 2026),
    team_id         UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    team_name       VARCHAR(100) NOT NULL,
    zodiac_sign     VARCHAR(20) NOT NULL CHECK (zodiac_sign IN (
        'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
        'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
    )),
    total_zp        BIGINT NOT NULL CHECK (total_zp >= 0),
    roster_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    finals_seed     SMALLINT NOT NULL CHECK (finals_seed >= 1 AND finals_seed <= 12),
    achievements    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_hall_of_fame_team_year UNIQUE (year, team_id),
    CONSTRAINT uq_hall_of_fame_zodiac_year UNIQUE (year, zodiac_sign)
);

CREATE INDEX IF NOT EXISTS idx_hall_of_fame_lookup
    ON public.hall_of_fame (year, team_id);

-- RLS
ALTER TABLE public.hall_of_fame ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hof_public_select" ON public.hall_of_fame;
CREATE POLICY "hof_public_select" ON public.hall_of_fame FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "hof_admin_mutate" ON public.hall_of_fame;
CREATE POLICY "hof_admin_mutate" ON public.hall_of_fame FOR ALL USING (public.is_admin());

-- Immutable trigger (ห้าม UPDATE/DELETE)
CREATE OR REPLACE FUNCTION public.prevent_hof_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RAISE EXCEPTION 'IMMUTABLE_HOF_BLOCK: Hall of Fame records are immutable.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_hof_mutation ON public.hall_of_fame;
CREATE TRIGGER trg_prevent_hof_mutation
    BEFORE UPDATE OR DELETE ON public.hall_of_fame
    FOR EACH ROW EXECUTE FUNCTION public.prevent_hof_mutation();
