-- ย้อนกลับ 20261009020000 (ไม่ต้องรันถ้าไม่มีปัญหา) · ค่าซีดที่กรอกไว้จะหาย
BEGIN;
DROP INDEX IF EXISTS public.uq_tournament_registrations_seed;
ALTER TABLE public.tournament_registrations DROP CONSTRAINT IF EXISTS tournament_registrations_seed_check;
ALTER TABLE public.tournament_registrations DROP COLUMN IF EXISTS seed;
COMMIT;
