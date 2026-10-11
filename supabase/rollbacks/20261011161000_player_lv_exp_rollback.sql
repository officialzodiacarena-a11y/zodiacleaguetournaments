-- ย้อนกลับ 20261011161000 (ไม่ต้องรันถ้าไม่มีปัญหา) · เลเวล/EXP/สมุด EXP ทั้งหมดที่เก็บไว้จะหาย
BEGIN;
DROP VIEW IF EXISTS public.player_lv_current;
DROP FUNCTION IF EXISTS public.apply_inactivity_decay(uuid, integer, date);
DROP FUNCTION IF EXISTS public.grant_player_exp(uuid, integer, text, uuid, smallint, text, text);
DROP FUNCTION IF EXISTS public.lv_apply_exp(uuid, smallint, integer, text, uuid, smallint, date, text, text, uuid);

DROP TABLE IF EXISTS public.player_exp_ledger;
DROP FUNCTION IF EXISTS public.trg_player_exp_ledger_append_only();
DROP TABLE IF EXISTS public.player_lv_state;
DROP TABLE IF EXISTS public.lv_rank_tiers;

ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_exp_not_with_linked_roster_check;
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_exp_config_object_check;
ALTER TABLE public.tournaments DROP COLUMN IF EXISTS exp_config;
ALTER TABLE public.tournaments DROP COLUMN IF EXISTS exp_enabled;

DROP FUNCTION IF EXISTS public.lv_current_season_year();
DROP FUNCTION IF EXISTS public.lv_is_lv_admin();
COMMIT;
