-- 20261008160000_matches_update_staff_only_rollback.sql
-- คืนกฎเดิมของ matches_checkin_update_policy ตามตัวอักษรจาก supabase/baseline/20260927_baseline_public.sql (บรรทัด 11866)
DROP POLICY IF EXISTS matches_checkin_update_policy ON public.matches;

CREATE POLICY matches_checkin_update_policy ON public.matches FOR UPDATE USING ((public.is_admin() OR public.is_referee_of(id) OR (auth.uid() IN ( SELECT p.user_id
   FROM (public.team_members tm
     JOIN public.players p ON ((p.id = tm.player_id)))
  WHERE ((tm.team_id = matches.team_a_id) AND (tm.role = ANY (ARRAY['CAPTAIN'::public.team_role_type, 'MANAGER'::public.team_role_type, 'OWNER'::public.team_role_type])) AND (tm.status = 'ACTIVE'::public.membership_status_type)))) OR (auth.uid() IN ( SELECT p.user_id
   FROM (public.team_members tm
     JOIN public.players p ON ((p.id = tm.player_id)))
  WHERE ((tm.team_id = matches.team_b_id) AND (tm.role = ANY (ARRAY['CAPTAIN'::public.team_role_type, 'MANAGER'::public.team_role_type, 'OWNER'::public.team_role_type])) AND (tm.status = 'ACTIVE'::public.membership_status_type))))));

