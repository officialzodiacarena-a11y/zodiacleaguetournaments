-- 20261008160000_matches_update_staff_only.sql
-- ปิดช่องโหว่สิทธิ์ของตาราง matches (Gate Log 2026-10-06 13:40): เดิม CAPTAIN / MANAGER / OWNER ของทีม A หรือ B
-- แก้แถวแมตช์ของตัวเองได้ทุกคอลัมน์จากเบราว์เซอร์ (สถานะ ผู้ชนะ สกอร์ เส้นตาย) โดยไม่ผ่านกติกาใน API
-- ตอนนี้ UPDATE ตรงทำได้เฉพาะแอดมินหรือกรรมการของแมตช์ · API ทุกตัวที่เขียน matches ใช้ Admin Client (service role) อยู่แล้ว
-- ห้องคุมของกรรมการ (app/spectator/control/[match_id]/page.tsx) เขียนด้วย client ผู้ใช้ และยังผ่านด้วย is_referee_of / is_admin
-- ลำดับ: merge โค้ดก่อน แล้วค่อยรัน SQL นี้ (พี่หยัดรันบนของจริงคนเดียว) · ต้องเทสบนสนามซ้อมก่อน · ย้อนกลับ: supabase/rollbacks/20261008160000_matches_update_staff_only_rollback.sql
DROP POLICY IF EXISTS matches_checkin_update_policy ON public.matches;

CREATE POLICY matches_checkin_update_policy ON public.matches
  FOR UPDATE
  USING (public.is_admin() OR public.is_referee_of(id))
  WITH CHECK (public.is_admin() OR public.is_referee_of(id));
