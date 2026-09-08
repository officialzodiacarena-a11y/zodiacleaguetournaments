-- =============================================================================
-- MIGRATION: T3.1-BE-01 — Add finals_seed to circuit_standings
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น
-- =============================================================================

ALTER TABLE public.circuit_standings
  ADD COLUMN IF NOT EXISTS finals_seed SMALLINT CHECK (finals_seed BETWEEN 1 AND 12);

CREATE UNIQUE INDEX IF NOT EXISTS uq_finals_seed
  ON public.circuit_standings(circuit_id, finals_seed)
  WHERE finals_seed IS NOT NULL;
