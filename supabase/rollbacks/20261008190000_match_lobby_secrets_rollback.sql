-- 20261008190000_match_lobby_secrets_rollback.sql
-- คืนรหัสห้องกลับเข้า matches.format_config แล้วลบตาราง/trigger ใหม่ · คืนฟังก์ชัน log_lobby_system_message() เป็นของ 20261008170000
-- หมายเหตุ: หลัง rollback รหัสห้องจะอ่านได้สาธารณะอีกครั้ง และต้องคืนโค้ดเว็บ (revert PR ที่ใช้ตารางนี้) ด้วย

DROP TRIGGER IF EXISTS trg_match_lobby_secret_message ON public.match_lobby_secrets;

UPDATE public.matches m
SET format_config = jsonb_set(coalesce(m.format_config, '{}'::jsonb), '{lobby_code}', to_jsonb(s.lobby_code))
FROM public.match_lobby_secrets s
WHERE s.match_id = m.id;

-- คืนฟังก์ชันหลัง UPDATE (ฟังก์ชันปัจจุบันไม่มีส่วนรหัสล็อบบี้ จึงไม่เกิดข้อความระบบซ้ำตอนคืนรหัส)
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

        -- Fix 4: lobby_code lives in format_config JSONB, not a flat column.
        IF (OLD.format_config->>'lobby_code' IS NULL AND NEW.format_config->>'lobby_code' IS NOT NULL)
           OR (OLD.format_config->>'lobby_code' IS DISTINCT FROM NEW.format_config->>'lobby_code') THEN
            INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
            VALUES (
                NEW.id,
                NULL,
                'SYSTEM',
                '[SYSTEM] ผู้ตัดสินได้กรอกรหัสพาสเวิร์ดล็อบบี้: ' || (NEW.format_config->>'lobby_code'),
                TRUE
            );
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

DROP FUNCTION IF EXISTS public.log_lobby_secret_change();
DROP TABLE IF EXISTS public.match_lobby_secrets;
