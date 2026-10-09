-- ซีดของทีมในทัวร์นาเมนต์ (แสดงบนสายแข่ง "#N SEED") · เพิ่มคอลัมน์ล้วน ไม่แก้/ลบข้อมูลเดิม
-- ใช้ IF NOT EXISTS ทุกจุด รันซ้ำได้ ไม่กระทบแถวเดิม (seed = NULL = ยังไม่กำหนด)
BEGIN;

ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS seed smallint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tournament_registrations_seed_check'
  ) THEN
    ALTER TABLE public.tournament_registrations
      ADD CONSTRAINT tournament_registrations_seed_check CHECK (seed IS NULL OR (seed >= 1 AND seed <= 64));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tournament_registrations_seed
  ON public.tournament_registrations (tournament_id, seed)
  WHERE seed IS NOT NULL;

COMMIT;
