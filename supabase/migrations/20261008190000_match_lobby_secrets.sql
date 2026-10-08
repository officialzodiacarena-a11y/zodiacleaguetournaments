-- 20261008190000_match_lobby_secrets.sql
-- ย้ายรหัสห้องเกม (lobby_code) ออกจาก matches.format_config ไปตารางใหม่ที่ผู้ไม่เกี่ยวข้องอ่านไม่ได้
-- ปัญหา: policy matches_public_read เปิดอ่านทุกคอลัมน์ให้ anon (overlay/OBS ต้องใช้ format_config ส่วนอื่น)
--        รหัสห้องจึงอ่านได้ตรงๆ ผ่าน REST ด้วย anon key แม้ GET /api/v1/matches/[id]/lobby ต้องล็อกอินแล้ว (PR #127)
-- ลำดับ: (1) ตาราง+RLS (2) ฟังก์ชัน trigger ของ matches ตัดส่วน lobby_code ออก
--        (3) คัดลอกรหัสเดิม (4) trigger ข้อความระบบบนตารางใหม่ (5) ลบ lobby_code ออกจาก format_config
-- เขียนตารางนี้ผ่านเซิร์ฟเวอร์ (service_role) เท่านั้น · rollback: supabase/rollbacks/20261008190000_match_lobby_secrets_rollback.sql

CREATE TABLE public.match_lobby_secrets (
    match_id    uuid PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
    lobby_code  character varying(32) NOT NULL,
    updated_by  uuid,
    updated_at  timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.match_lobby_secrets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.match_lobby_secrets FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.match_lobby_secrets TO authenticated;
GRANT ALL ON public.match_lobby_secrets TO service_role;

-- อ่านได้: แอดมิน · กรรมการของแมตช์ · สมาชิก ACTIVE ของทีม A/B ในแมตช์นั้น (ไม่มี policy เขียนสำหรับผู้ใช้)
CREATE POLICY match_lobby_secrets_select ON public.match_lobby_secrets
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR public.is_referee_of(match_id)
        OR EXISTS (
            SELECT 1
            FROM public.matches m
            JOIN public.team_members tm
              ON tm.team_id IN (m.team_a_id, m.team_b_id)
             AND tm.player_id = public.current_player_id()
             AND tm.status = 'ACTIVE'
            WHERE m.id = match_lobby_secrets.match_id
        )
    );

-- (2) trigger ของ matches: ตัดส่วนข้อความรหัสล็อบบี้ออก (ย้ายไปอยู่บนตารางใหม่) ส่วนอื่นเหมือน 20261008170000
CREATE OR REPLACE FUNCTION public.log_lobby_system_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_msg           TEXT;
    v_team_name     TEXT;
BEGIN
    IF TG_TABLE_NAME = 'matches' AND TG_OP = 'UPDATE' THEN

        IF OLD.team_a_ready_at IS NULL AND NEW.team_a_ready_at IS NOT NULL THEN
            SELECT name INTO v_team_name FROM public.teams WHERE id = NEW.team_a_id;
            INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
            VALUES (NEW.id, NULL, 'SYSTEM', '[SYSTEM] สโมสร ' || COALESCE(v_team_name, 'TEAM_A') || ' กดยืนยันความพร้อมแข่งขันแล้ว ✅', TRUE);
        END IF;

        IF OLD.team_b_ready_at IS NULL AND NEW.team_b_ready_at IS NOT NULL THEN
            SELECT name INTO v_team_name FROM public.teams WHERE id = NEW.team_b_id;
            INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
            VALUES (NEW.id, NULL, 'SYSTEM', '[SYSTEM] สโมสร ' || COALESCE(v_team_name, 'TEAM_B') || ' กดยืนยันความพร้อมแข่งขันแล้ว ✅', TRUE);
        END IF;

        IF OLD.status != 'VETO' AND NEW.status = 'VETO' THEN
            INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
            VALUES (NEW.id, NULL, 'SYSTEM', '[SYSTEM] เริ่มต้นขั้นตอนดราฟต์เลือกแผนที่แข่ง (Map Veto Phase Active)', TRUE);
        END IF;

        IF OLD.status != 'LIVE' AND NEW.status = 'LIVE' THEN
            INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
            VALUES (NEW.id, NULL, 'SYSTEM', '[SYSTEM] สัญญาณภาพพร้อมรบแล้ว! การแข่งขันนัดประวัติศาสตร์เริ่มต้นอย่างเป็นทางการ ⚔️', TRUE);
        END IF;

        IF OLD.status != 'WALKOVER' AND NEW.status = 'WALKOVER' THEN
            IF NEW.winner_team_id IS NOT NULL THEN
                SELECT name INTO v_team_name FROM public.teams WHERE id = NEW.winner_team_id;
                v_msg := '[SYSTEM] ขีดจำกัดเช็คอินหมดลง ยื่นโทษปรับแพ้บายให้แก่คู่แข่ง ปรับทีม ' || COALESCE(v_team_name, 'WINNER_TEAM') || ' ชนะบายสำเร็จ 🏆';
            ELSE
                v_msg := '[SYSTEM] ทั้งสองทีมไม่กดยืนยันความพร้อมแข่งขันตามเกณฑ์ 15 นาที ปรับแพ้บายทั้งคู่ (Dual Walkover) รอผู้ตัดสินตรวจสอบ';
            END IF;

            INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
            VALUES (NEW.id, NULL, 'SYSTEM', v_msg, TRUE);
        END IF;

    END IF;
    RETURN NEW;
END;
$$;

-- (3) คัดลอกรหัสเดิม (ยังไม่มี trigger บนตารางใหม่ จึงไม่เกิดข้อความระบบซ้ำ)
INSERT INTO public.match_lobby_secrets (match_id, lobby_code)
SELECT id, left(format_config->>'lobby_code', 32)
FROM public.matches
WHERE nullif(trim(format_config->>'lobby_code'), '') IS NOT NULL
ON CONFLICT (match_id) DO NOTHING;

-- (4) ข้อความระบบในแชทล็อบบี้เมื่อตั้ง/เปลี่ยนรหัส (ข้อความเดิมทุกตัวอักษร)
CREATE OR REPLACE FUNCTION public.log_lobby_secret_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR OLD.lobby_code IS DISTINCT FROM NEW.lobby_code THEN
        INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
        VALUES (NEW.match_id, NULL, 'SYSTEM', '[SYSTEM] ผู้ตัดสินได้กรอกรหัสพาสเวิร์ดล็อบบี้: ' || NEW.lobby_code, TRUE);
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_lobby_secret_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_match_lobby_secret_message
    AFTER INSERT OR UPDATE ON public.match_lobby_secrets
    FOR EACH ROW EXECUTE FUNCTION public.log_lobby_secret_change();

-- (5) ลบรหัสออกจาก format_config (ที่สาธารณะอ่านได้)
UPDATE public.matches
SET format_config = format_config - 'lobby_code'
WHERE format_config ? 'lobby_code';
