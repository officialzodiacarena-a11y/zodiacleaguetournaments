-- ระบบเลเวล/EXP ผู้เล่น (Rank F-L = เลเวล 1-8) แบบ "เลเวลไม่ลด" · ใบงาน K1 ใหม่ (TO_KOLT_20261011-1610)
-- กติกา: ถังต่อเลเวลขนาดตายตัว · เติมเต็มถังแล้วขึ้นเลเวล ส่วนเกินทบไป · EXP ในถังลดได้ต่ำสุด 0 แต่เลเวลไม่ลด
-- เลเวลเป็นรายปี (ขึ้นปีใหม่เริ่มเลเวล 1 ใหม่ · แถวปีเก่าเก็บเป็นประวัติ)
-- ไม่สร้างตัวตั้งเวลา (pg_cron) และไม่ตัดสินว่าใคร "ไม่แข่ง" · รันซ้ำได้ · ไม่แตะข้อมูลเดิม
BEGIN;

-- ---------------------------------------------------------------------------
-- 0) ตัวช่วย: ผู้เรียกเป็น ADMIN / SUPER_ADMIN ไหม (ไม่ใช้ is_admin() เพราะรวม REFEREE)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lv_is_lv_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.players p ON p.id = ur.player_id
    WHERE p.user_id = auth.uid()
      AND ur.role IN ('ADMIN', 'SUPER_ADMIN')
      AND ur.revoked_at IS NULL
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
$$;
REVOKE EXECUTE ON FUNCTION public.lv_is_lv_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lv_is_lv_admin() TO authenticated, service_role;

-- ปีปัจจุบันตามเวลาไทย
CREATE OR REPLACE FUNCTION public.lv_current_season_year()
RETURNS smallint
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT extract(year FROM (now() AT TIME ZONE 'Asia/Bangkok'))::smallint;
$$;

-- ---------------------------------------------------------------------------
-- 3.1) ขนาดถัง EXP ต่อเลเวล
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lv_rank_tiers (
  rank_code   text PRIMARY KEY,
  rank_order  smallint NOT NULL UNIQUE CHECK (rank_order BETWEEN 1 AND 8),
  exp_bucket  integer NOT NULL CHECK (exp_bucket > 0),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.lv_rank_tiers IS
  'ขนาดถัง EXP ต่อเลเวล · ค่าตั้งต้นจากบรีฟพี่ไอซ์ (ตัวเลขระหว่างกลางเป็นข้อเสนอ ChatGPT) · แก้ได้โดยแอดมิน · ภายหลังใช้กับเพดานโบนัสล็อกอินรายวันด้วย';

INSERT INTO public.lv_rank_tiers (rank_code, rank_order, exp_bucket) VALUES
  ('F', 1, 800), ('E', 2, 1600), ('D', 3, 3200), ('C', 4, 6400),
  ('B', 5, 12000), ('A', 6, 22000), ('S', 7, 40000), ('L', 8, 72400)
ON CONFLICT DO NOTHING;

ALTER TABLE public.lv_rank_tiers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lv_rank_tiers FROM anon, authenticated;
GRANT SELECT ON TABLE public.lv_rank_tiers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.lv_rank_tiers TO authenticated;
GRANT ALL ON TABLE public.lv_rank_tiers TO service_role;

DROP POLICY IF EXISTS lv_rank_tiers_read ON public.lv_rank_tiers;
CREATE POLICY lv_rank_tiers_read ON public.lv_rank_tiers FOR SELECT USING (true);
DROP POLICY IF EXISTS lv_rank_tiers_admin_insert ON public.lv_rank_tiers;
CREATE POLICY lv_rank_tiers_admin_insert ON public.lv_rank_tiers FOR INSERT WITH CHECK (public.lv_is_lv_admin());
DROP POLICY IF EXISTS lv_rank_tiers_admin_update ON public.lv_rank_tiers;
CREATE POLICY lv_rank_tiers_admin_update ON public.lv_rank_tiers FOR UPDATE USING (public.lv_is_lv_admin()) WITH CHECK (public.lv_is_lv_admin());
DROP POLICY IF EXISTS lv_rank_tiers_admin_delete ON public.lv_rank_tiers;
CREATE POLICY lv_rank_tiers_admin_delete ON public.lv_rank_tiers FOR DELETE USING (public.lv_is_lv_admin());

-- ---------------------------------------------------------------------------
-- 3.2) สถานะเลเวลผู้เล่น (1 แถว ต่อผู้เล่น ต่อปี) · เขียนผ่านฟังก์ชันเท่านั้น
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_lv_state (
  player_id    uuid NOT NULL REFERENCES public.players(id),
  season_year  smallint NOT NULL,
  rank_order   smallint NOT NULL DEFAULT 1 REFERENCES public.lv_rank_tiers(rank_order),
  exp_in_rank  integer NOT NULL DEFAULT 0 CHECK (exp_in_rank >= 0),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, season_year)
);

CREATE INDEX IF NOT EXISTS idx_player_lv_state_leaderboard
  ON public.player_lv_state (season_year, rank_order DESC, exp_in_rank DESC);

COMMENT ON TABLE public.player_lv_state IS
  'เลเวลและ EXP ในถังของผู้เล่นต่อปี · เลเวลไม่ลด · แถวปีเก่าเก็บเป็นประวัติ (เลเวลปลายปี = เลเวลสูงสุดของปีนั้น) · เขียนผ่าน lv_apply_exp เท่านั้น';

ALTER TABLE public.player_lv_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.player_lv_state FROM anon, authenticated;
GRANT SELECT ON TABLE public.player_lv_state TO anon, authenticated;
GRANT ALL ON TABLE public.player_lv_state TO service_role;

DROP POLICY IF EXISTS player_lv_state_read ON public.player_lv_state;
CREATE POLICY player_lv_state_read ON public.player_lv_state FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- 3.4) สมุด EXP (เขียนต่อท้ายอย่างเดียว)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_exp_ledger (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id           uuid NOT NULL REFERENCES public.players(id),
  season_year         smallint NOT NULL,
  amount              integer NOT NULL CHECK (amount <> 0),
  applied_amount      integer NOT NULL,
  rank_order_after    smallint NOT NULL,
  exp_in_rank_after   integer NOT NULL,
  source              text NOT NULL CHECK (source IN ('TOURNAMENT_PLACEMENT', 'ADMIN_ADJUSTMENT', 'INACTIVITY_DECAY')),
  tournament_id       uuid REFERENCES public.tournaments(id),
  placement           smallint,
  decay_week_start    date,
  reason              text,
  idempotency_key     text UNIQUE,
  created_by          uuid REFERENCES public.players(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_exp_ledger_placement_check
    CHECK (source <> 'TOURNAMENT_PLACEMENT' OR (tournament_id IS NOT NULL AND amount > 0)),
  CONSTRAINT player_exp_ledger_admin_reason_check
    CHECK (source <> 'ADMIN_ADJUSTMENT' OR length(btrim(coalesce(reason, ''))) > 0),
  CONSTRAINT player_exp_ledger_decay_check
    CHECK (source <> 'INACTIVITY_DECAY' OR (amount < 0 AND decay_week_start IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_player_exp_ledger_placement
  ON public.player_exp_ledger (tournament_id, player_id) WHERE source = 'TOURNAMENT_PLACEMENT';
CREATE UNIQUE INDEX IF NOT EXISTS uq_player_exp_ledger_decay
  ON public.player_exp_ledger (player_id, decay_week_start) WHERE source = 'INACTIVITY_DECAY';
CREATE INDEX IF NOT EXISTS idx_player_exp_ledger_player_year
  ON public.player_exp_ledger (player_id, season_year);

COMMENT ON TABLE public.player_exp_ledger IS
  'สมุด EXP แก้/ลบไม่ได้ · amount = ค่าที่สั่ง · applied_amount = ค่าที่เกิดจริง (หลังชนเพดาน/ติดศูนย์) = ความคืบหน้ารวมหลัง - ก่อน';

CREATE OR REPLACE FUNCTION public.trg_player_exp_ledger_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'player_exp_ledger is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_player_exp_ledger_append_only ON public.player_exp_ledger;
CREATE TRIGGER trg_player_exp_ledger_append_only
  BEFORE UPDATE OR DELETE ON public.player_exp_ledger
  FOR EACH ROW EXECUTE FUNCTION public.trg_player_exp_ledger_append_only();

ALTER TABLE public.player_exp_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.player_exp_ledger FROM anon, authenticated;
GRANT SELECT ON TABLE public.player_exp_ledger TO authenticated;
GRANT ALL ON TABLE public.player_exp_ledger TO service_role;

DROP POLICY IF EXISTS player_exp_ledger_read ON public.player_exp_ledger;
CREATE POLICY player_exp_ledger_read ON public.player_exp_ledger FOR SELECT USING (
  player_id IN (SELECT p.id FROM public.players p WHERE p.user_id = auth.uid())
  OR public.lv_is_lv_admin()
);

-- ---------------------------------------------------------------------------
-- 3.6) สวิตช์ EXP ของทัวร์
-- ---------------------------------------------------------------------------
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS exp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exp_config jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_exp_config_object_check;
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_exp_config_object_check CHECK (jsonb_typeof(exp_config) = 'object');

COMMENT ON COLUMN public.tournaments.exp_enabled IS
  'เปิดให้ทัวร์นี้แจก EXP จากอันดับหรือไม่ (ค่าเริ่มต้นปิด · ทัวร์พี่ไอซ์ต้องปิด)';
COMMENT ON COLUMN public.tournaments.exp_config IS
  'ตั้งค่า EXP ของทัวร์ (โครงข้างในยังไม่กำหนด)';

-- tournaments.roster_check อยู่ในไฟล์ EntryFee_SQL (ไม่อยู่ใน repo) → เพิ่มกติกาเฉพาะเมื่อคอลัมน์มีจริง
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tournaments' AND column_name = 'roster_check'
  ) THEN
    ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_exp_not_with_linked_roster_check;
    ALTER TABLE public.tournaments
      ADD CONSTRAINT tournaments_exp_not_with_linked_roster_check
      CHECK (NOT (exp_enabled AND roster_check = 'LINKED'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3.5 ข้อ 1) ตัวกลางตัวเดียวที่แก้สถานะเลเวล (ไม่ให้ใครเรียกตรง)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lv_apply_exp(
  p_player_id        uuid,
  p_season_year      smallint,
  p_amount           integer,
  p_source           text,
  p_tournament_id    uuid DEFAULT NULL,
  p_placement        smallint DEFAULT NULL,
  p_decay_week_start date DEFAULT NULL,
  p_reason           text DEFAULT NULL,
  p_idempotency_key  text DEFAULT NULL,
  p_created_by       uuid DEFAULT NULL
)
RETURNS public.player_exp_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state     public.player_lv_state%ROWTYPE;
  v_existing  public.player_exp_ledger%ROWTYPE;
  v_row       public.player_exp_ledger%ROWTYPE;
  v_enabled   boolean;
  v_rank      smallint;
  v_exp       integer;
  v_bucket    integer;
  v_max_rank  smallint;
  v_before    integer;
  v_after     integer;
BEGIN
  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  INSERT INTO public.player_lv_state (player_id, season_year)
  VALUES (p_player_id, p_season_year)
  ON CONFLICT (player_id, season_year) DO NOTHING;

  SELECT * INTO v_state
  FROM public.player_lv_state
  WHERE player_id = p_player_id AND season_year = p_season_year
  FOR UPDATE;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.player_exp_ledger WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  IF p_source = 'TOURNAMENT_PLACEMENT' THEN
    SELECT t.exp_enabled INTO v_enabled FROM public.tournaments t WHERE t.id = p_tournament_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND';
    END IF;
    IF NOT v_enabled THEN
      RAISE EXCEPTION 'EXP_DISABLED_FOR_TOURNAMENT';
    END IF;
  END IF;

  v_rank := v_state.rank_order;
  v_exp  := v_state.exp_in_rank;

  SELECT coalesce(sum(exp_bucket), 0) INTO v_before FROM public.lv_rank_tiers WHERE rank_order < v_rank;
  v_before := v_before + v_exp;
  SELECT max(rank_order) INTO v_max_rank FROM public.lv_rank_tiers;

  IF p_amount > 0 THEN
    v_exp := v_exp + p_amount;
    LOOP
      SELECT exp_bucket INTO v_bucket FROM public.lv_rank_tiers WHERE rank_order = v_rank;
      EXIT WHEN v_rank >= v_max_rank OR v_exp < v_bucket;   -- ถังเต็มพอดี = ขึ้นเลเวล
      v_exp  := v_exp - v_bucket;
      v_rank := v_rank + 1;
    END LOOP;
    IF v_rank >= v_max_rank AND v_exp > v_bucket THEN
      v_exp := v_bucket;                                    -- ถึงเลเวลสูงสุดแล้ว ส่วนเกินทิ้ง
    END IF;
  ELSE
    v_exp := greatest(v_exp + p_amount, 0);                 -- เลเวลไม่เปลี่ยน
  END IF;

  SELECT coalesce(sum(exp_bucket), 0) INTO v_after FROM public.lv_rank_tiers WHERE rank_order < v_rank;
  v_after := v_after + v_exp;

  IF p_amount < 0 AND v_after - v_before = 0 THEN
    RETURN NULL;                                            -- ถังว่างอยู่แล้ว ไม่ต้องใส่แถวสมุด
  END IF;

  INSERT INTO public.player_exp_ledger (
    player_id, season_year, amount, applied_amount, rank_order_after, exp_in_rank_after,
    source, tournament_id, placement, decay_week_start, reason, idempotency_key, created_by
  ) VALUES (
    p_player_id, p_season_year, p_amount, v_after - v_before, v_rank, v_exp,
    p_source, p_tournament_id, p_placement, p_decay_week_start, p_reason, p_idempotency_key, p_created_by
  ) RETURNING * INTO v_row;

  UPDATE public.player_lv_state
  SET rank_order = v_rank, exp_in_rank = v_exp, updated_at = now()
  WHERE player_id = p_player_id AND season_year = p_season_year;

  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.lv_apply_exp(uuid, smallint, integer, text, uuid, smallint, date, text, text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3.5 ข้อ 2) แอดมินแจก/ปรับ EXP
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_player_exp(
  p_player_id        uuid,
  p_amount           integer,
  p_source           text,
  p_tournament_id    uuid DEFAULT NULL,
  p_placement        smallint DEFAULT NULL,
  p_reason           text DEFAULT NULL,
  p_idempotency_key  text DEFAULT NULL
)
RETURNS public.player_exp_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
BEGIN
  IF NOT public.lv_is_lv_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_source NOT IN ('TOURNAMENT_PLACEMENT', 'ADMIN_ADJUSTMENT') THEN
    RAISE EXCEPTION 'INVALID_SOURCE';
  END IF;

  SELECT id INTO v_actor FROM public.players WHERE user_id = auth.uid();

  RETURN public.lv_apply_exp(
    p_player_id, public.lv_current_season_year(), p_amount, p_source,
    p_tournament_id, p_placement, NULL, p_reason, p_idempotency_key, v_actor
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_player_exp(uuid, integer, text, uuid, smallint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_player_exp(uuid, integer, text, uuid, smallint, text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3.5 ข้อ 3) ลด EXP เพราะไม่แข่ง (ใบนี้ทำแค่ "วิธีลด" · ไม่ตัดสินว่าใครไม่แข่ง · ไม่มีตัวตั้งเวลา)
-- ผู้เรียกที่อนุญาต: ADMIN/SUPER_ADMIN · service_role (JWT) · เซสชัน DB ของ postgres/supabase_admin (เช่น pg_cron ในอนาคต)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_inactivity_decay(
  p_player_id   uuid,
  p_amount      integer,
  p_week_start  date
)
RETURNS public.player_exp_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.lv_is_lv_admin()
    OR coalesce(auth.role(), '') = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;
  IF p_week_start IS NULL THEN
    RAISE EXCEPTION 'WEEK_START_REQUIRED';
  END IF;

  RETURN public.lv_apply_exp(
    p_player_id, public.lv_current_season_year(), -p_amount, 'INACTIVITY_DECAY',
    NULL, NULL, p_week_start, NULL, NULL, NULL
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_inactivity_decay(uuid, integer, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_inactivity_decay(uuid, integer, date) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3.7) view หน้าจัดอันดับ/โปรไฟล์ (ผู้เล่นที่ยังไม่มีแถว = เลเวล 1 EXP 0)
-- ลำดับหน้าจัดอันดับ: rank_order DESC, exp_in_rank DESC · ไม่เปิดแถวสมุดของคนอื่น
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.player_lv_current
WITH (security_invoker = true) AS
SELECT
  p.id                                   AS player_id,
  public.lv_current_season_year()        AS season_year,
  coalesce(s.rank_order, 1)::smallint    AS rank_order,
  t.rank_code                            AS rank_code,
  coalesce(s.exp_in_rank, 0)             AS exp_in_rank,
  t.exp_bucket                           AS exp_bucket
FROM public.players p
LEFT JOIN public.player_lv_state s
  ON s.player_id = p.id AND s.season_year = public.lv_current_season_year()
JOIN public.lv_rank_tiers t
  ON t.rank_order = coalesce(s.rank_order, 1);

GRANT SELECT ON public.player_lv_current TO anon, authenticated, service_role;

COMMIT;
