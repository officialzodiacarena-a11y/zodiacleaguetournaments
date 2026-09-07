-- =============================================================================
-- MIGRATION: T2.3 — Match State Machine, Check-In, Result Reporting & Lobby Chat
-- Specs: T2.3-C01, T2.3-C02, T2.3-C03, T2.3-C04
-- Corrections applied per 01_BRIEFS_SENT/T2.3-CORRECTION_Brief_for_Colt.md.md:
--   Fix 1 — audit_logs field names reconciled against the REAL production schema
--           (verified via live introspection: id, actor_id, actor_role, action,
--           entity_type, entity_id, before_data, after_data, diff, reason,
--           ip_address, user_agent, request_id, session_id, created_at).
--           `action` is an ENUM (public.audit_action_type) with no
--           MATCH-specific values, so all match-lifecycle audit rows below use
--           action = 'UPDATE', entity_type = 'matches', entity_id = match id,
--           and put the specific event name in `reason` / before_data / after_data.
--   Fix 2 — Dual no-show resolves to WALKOVER / winner_team_id = NULL /
--           outcome = 'WALKOVER' + referee notification (NOT the DISPUTED /
--           ADMIN_REFERRAL path floated in the C02 stress-test doc — that is
--           explicitly deferred to Sprint 2.4).
--   Fix 3 — System bot player seeded so lobby system messages have a valid
--           sender_id FK (see NOTE before the INSERT below — public.players
--           .user_id is NOT NULL in production; this needs a matching
--           auth.users row, which this migration does not create).
--   Fix 4 — lobby_code is read from matches.format_config->>'lobby_code'
--           (JSONB), not a flat column. matches.format_config does not exist
--           yet in production, so it is added by this migration.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Shared helper functions referenced by the RLS policies below.
--    public.is_admin() and public.current_player_id() already exist in
--    production; public.is_team_leader() and public.is_referee_of() do not
--    and are introduced here.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_team_leader(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = p_team_id
          AND player_id = public.current_player_id()
          AND role IN ('CAPTAIN', 'MANAGER', 'OWNER')
          AND status = 'ACTIVE'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_referee_of(p_match_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.matches
        WHERE id = p_match_id
          AND referee_id = public.current_player_id()
    );
$$;

-- -----------------------------------------------------------------------------
-- 1. T2.3-C01 — Match State Machine Guard (BEFORE UPDATE trigger)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_match_transition_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_allowed       BOOLEAN := FALSE;
    v_has_veto      BOOLEAN := FALSE;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Terminal states are locked. (FORFEITED / DISPUTED are valid enum values
    -- but are out of scope for this sprint per the correction brief — Fix 2 —
    -- and are intentionally NOT treated as terminal here.)
    IF OLD.status IN ('COMPLETED', 'WALKOVER', 'BYE', 'CANCELLED') THEN
        RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Terminal status % cannot be updated to %', OLD.status, NEW.status;
    END IF;

    CASE OLD.status
        WHEN 'SCHEDULED' THEN
            IF NEW.status IN ('READY_CHECK', 'WALKOVER', 'BYE', 'CANCELLED') THEN
                v_allowed := TRUE;
            END IF;

        WHEN 'READY_CHECK' THEN
            IF NEW.status = 'WALKOVER' THEN
                v_allowed := TRUE;
            ELSIF NEW.status IN ('VETO', 'LIVE') THEN
                SELECT (veto_format IS NOT NULL AND veto_format != '{}'::jsonb) INTO v_has_veto
                FROM public.tournament_stages s
                WHERE s.id = OLD.stage_id;

                IF NEW.status = 'VETO' AND v_has_veto THEN
                    v_allowed := TRUE;
                ELSIF NEW.status = 'LIVE' AND NOT v_has_veto THEN
                    v_allowed := TRUE;
                END IF;
            END IF;

        WHEN 'VETO' THEN
            IF NEW.status IN ('LIVE', 'CANCELLED') THEN
                v_allowed := TRUE;
            END IF;

        WHEN 'LIVE' THEN
            IF NEW.status IN ('PAUSED', 'AWAITING_RESULT') THEN
                v_allowed := TRUE;
            END IF;

        WHEN 'PAUSED' THEN
            IF NEW.status = 'LIVE' THEN
                v_allowed := TRUE;
            END IF;

        WHEN 'AWAITING_RESULT' THEN
            IF NEW.status = 'COMPLETED' THEN
                v_allowed := TRUE;
            END IF;

        ELSE
            v_allowed := FALSE;
    END CASE;

    IF NOT v_allowed THEN
        RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Cannot transition match % from % to %', OLD.id, OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_match_transition ON public.matches;
CREATE TRIGGER trg_validate_match_transition
    BEFORE UPDATE OF status ON public.matches
    FOR EACH ROW EXECUTE FUNCTION public.validate_match_transition_guard();

-- -----------------------------------------------------------------------------
-- 2. T2.3-C01 — Auto-Walkover Engine (Stored Procedure, Fix 2 applied)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_expired_ready_checks()
RETURNS TABLE (
    resolved_match_id   UUID,
    winner_team_id      UUID,
    final_status        VARCHAR
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    r_match RECORD;
    v_winner UUID;
BEGIN
    FOR r_match IN
        SELECT id, team_a_id, team_b_id, team_a_ready_at, team_b_ready_at, referee_id
        FROM public.matches
        WHERE status IN ('SCHEDULED', 'READY_CHECK')
          AND forfeit_deadline_at IS NOT NULL
          AND forfeit_deadline_at < NOW()
        FOR UPDATE
    LOOP
        resolved_match_id := r_match.id;

        IF r_match.team_a_ready_at IS NOT NULL AND r_match.team_b_ready_at IS NULL THEN
            v_winner := r_match.team_a_id;
        ELSIF r_match.team_b_ready_at IS NOT NULL AND r_match.team_a_ready_at IS NULL THEN
            v_winner := r_match.team_b_id;
        ELSE
            -- Fix 2: dual no-show (neither ready) is STILL a WALKOVER with a
            -- NULL winner, not a DISPUTED/ADMIN_REFERRAL branch — that path is
            -- deferred to Sprint 2.4 per the correction brief.
            v_winner := NULL;
        END IF;

        winner_team_id := v_winner;
        final_status := 'WALKOVER';

        UPDATE public.matches
        SET status = 'WALKOVER',
            winner_team_id = v_winner,
            outcome = 'WALKOVER',
            ended_at = NOW(),
            updated_at = NOW()
        WHERE id = r_match.id;

        -- Fix 1: audit_logs uses the REAL production schema.
        INSERT INTO public.audit_logs (action, entity_type, entity_id, before_data, after_data, reason)
        VALUES (
            'UPDATE',
            'matches',
            r_match.id,
            jsonb_build_object('team_a_ready_at', r_match.team_a_ready_at, 'team_b_ready_at', r_match.team_b_ready_at),
            jsonb_build_object('status', 'WALKOVER', 'winner_team_id', v_winner, 'outcome', 'WALKOVER'),
            'AUTO_WALKOVER_RESOLVE'
        );

        -- Fix 2: notify the referee, whichever branch fired (single no-show or
        -- dual no-show), so the assignment stays visible in-app on top of the
        -- realtime broadcast fired by the cron route.
        IF r_match.referee_id IS NOT NULL THEN
            INSERT INTO public.notifications (player_id, type, title, body, action_url)
            VALUES (
                r_match.referee_id,
                'MATCH_WALKOVER_REVIEW',
                'แมตช์ถูกปรับแพ้บายอัตโนมัติ',
                CASE
                    WHEN v_winner IS NOT NULL THEN 'ทีมคู่แข่งไม่เช็คอินภายในเวลา ระบบปรับแพ้บายให้อัตโนมัติแล้ว โปรดตรวจสอบ'
                    ELSE 'ทั้งสองทีมไม่เช็คอินภายในเวลา ระบบปรับแพ้บายทั้งคู่ (ไม่มีผู้ชนะ) โปรดตรวจสอบหน้างาน'
                END,
                '/matches/' || r_match.id::text || '/lobby'
            );
        END IF;

        RETURN NEXT;
    END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. T2.3-C02 — Match Check-In columns & RLS
--    (team_a_ready_at / team_b_ready_at / forfeit_deadline_at already exist in
--    production; these statements are no-ops there and only matter for other
--    environments, kept IF NOT EXISTS / IF NOT EXISTS for idempotency.)
-- -----------------------------------------------------------------------------
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS team_a_ready_at TIMESTAMPTZ;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS team_b_ready_at TIMESTAMPTZ;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS forfeit_deadline_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_matches_checkin_monitoring
ON public.matches (status, forfeit_deadline_at)
WHERE status IN ('SCHEDULED', 'READY_CHECK');

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches_checkin_update_policy" ON public.matches;
CREATE POLICY "matches_checkin_update_policy" ON public.matches
    FOR UPDATE USING (
        public.is_admin()
        OR public.is_referee_of(id)
        OR auth.uid() IN (
            SELECT p.user_id FROM public.team_members tm
            JOIN public.players p ON p.id = tm.player_id
            WHERE tm.team_id = matches.team_a_id
              AND tm.role IN ('CAPTAIN', 'MANAGER', 'OWNER')
              AND tm.status = 'ACTIVE'
        )
        OR auth.uid() IN (
            SELECT p.user_id FROM public.team_members tm
            JOIN public.players p ON p.id = tm.player_id
            WHERE tm.team_id = matches.team_b_id
              AND tm.role IN ('CAPTAIN', 'MANAGER', 'OWNER')
              AND tm.status = 'ACTIVE'
        )
    );

-- -----------------------------------------------------------------------------
-- 4. T2.3-C03 — Result Reporting Core (public.match_reports)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id            UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    reported_by_team    UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    reported_by_user    UUID NOT NULL REFERENCES public.players(id) ON DELETE SET NULL,

    winner_team_id      UUID NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
    score_a             SMALLINT NOT NULL CHECK (score_a >= 0),
    score_b             SMALLINT NOT NULL CHECK (score_b >= 0),

    evidence_urls       TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
    note                TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_match_report_per_team UNIQUE (match_id, reported_by_team)
);

CREATE INDEX IF NOT EXISTS idx_match_reports_lookup ON public.match_reports(match_id, reported_by_team);

ALTER TABLE public.match_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_reports_public_select" ON public.match_reports;
CREATE POLICY "match_reports_public_select" ON public.match_reports
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "match_reports_team_insert" ON public.match_reports;
CREATE POLICY "match_reports_team_insert" ON public.match_reports
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND public.is_team_leader(reported_by_team)
        AND EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id = match_id
              AND (m.team_a_id = reported_by_team OR m.team_b_id = reported_by_team)
              AND m.status = 'AWAITING_RESULT'
        )
    );

DROP POLICY IF EXISTS "match_reports_team_update" ON public.match_reports;
CREATE POLICY "match_reports_team_update" ON public.match_reports
    FOR UPDATE USING (
        auth.role() = 'authenticated'
        AND public.is_team_leader(reported_by_team)
        AND EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id = match_id
              AND m.status = 'AWAITING_RESULT'
        )
    );

DROP POLICY IF EXISTS "match_reports_admin_all" ON public.match_reports;
CREATE POLICY "match_reports_admin_all" ON public.match_reports
    FOR ALL USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_reports_updated ON public.match_reports;
CREATE TRIGGER trg_match_reports_updated
    BEFORE UPDATE ON public.match_reports
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. T2.3-C04 — Match Lobby & Realtime Chat
-- -----------------------------------------------------------------------------

-- Fix 4: lobby_code lives in matches.format_config JSONB, which does not
-- exist yet in production — add it here.
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS format_config JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.match_lobby_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id        UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    sender_role     VARCHAR(20) NOT NULL CONSTRAINT chk_sender_role CHECK (sender_role IN ('TEAM_A', 'TEAM_B', 'REFEREE', 'SYSTEM')),
    message         TEXT NOT NULL CONSTRAINT chk_msg_length CHECK (char_length(message) <= 500),
    is_system       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lobby_messages_match ON public.match_lobby_messages (match_id, created_at DESC);

ALTER TABLE public.match_lobby_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lobby_messages_select_policy" ON public.match_lobby_messages;
CREATE POLICY "lobby_messages_select_policy" ON public.match_lobby_messages
    FOR SELECT USING (
        auth.role() = 'authenticated'
        AND (
            public.is_admin()
            OR public.is_referee_of(match_id)
            OR EXISTS (
                SELECT 1 FROM public.matches m
                WHERE m.id = match_id
                  AND (
                      m.team_a_id IN (
                          SELECT team_id FROM public.team_members
                          WHERE player_id = public.current_player_id() AND status = 'ACTIVE'
                      )
                      OR m.team_b_id IN (
                          SELECT team_id FROM public.team_members
                          WHERE player_id = public.current_player_id() AND status = 'ACTIVE'
                      )
                  )
            )
        )
    );

DROP POLICY IF EXISTS "lobby_messages_insert_policy" ON public.match_lobby_messages;
CREATE POLICY "lobby_messages_insert_policy" ON public.match_lobby_messages
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND is_system = FALSE
        AND (
            public.is_admin()
            OR public.is_referee_of(match_id)
            OR EXISTS (
                SELECT 1 FROM public.matches m
                WHERE m.id = match_id
                  AND (
                      m.team_a_id IN (
                          SELECT team_id FROM public.team_members
                          WHERE player_id = public.current_player_id() AND status = 'ACTIVE'
                      )
                      OR m.team_b_id IN (
                          SELECT team_id FROM public.team_members
                          WHERE player_id = public.current_player_id() AND status = 'ACTIVE'
                      )
                  )
            )
        )
    );

DROP POLICY IF EXISTS "lobby_messages_no_update" ON public.match_lobby_messages;
CREATE POLICY "lobby_messages_no_update" ON public.match_lobby_messages FOR UPDATE USING (false);

DROP POLICY IF EXISTS "lobby_messages_no_delete" ON public.match_lobby_messages;
CREATE POLICY "lobby_messages_no_delete" ON public.match_lobby_messages FOR DELETE USING (false);

-- Fix 3: system bot player so lobby system messages have a valid sender_id.
--
-- NOTE (production caveat — please read before running this migration):
-- public.players.user_id is NOT NULL and is a 1:1 mirror of an auth.users
-- row. This INSERT can only succeed once a matching auth.users row with id
-- '00000000-0000-0000-0000-000000000001' exists (e.g. created once via the
-- Supabase Admin API / dashboard as a service account with no login). If that
-- row does not exist yet, run that step first, then this migration.
INSERT INTO public.players (id, user_id, athlete_id, display_name, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'SYSTEM-BOT-001',
    '[SYSTEM]',
    'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.log_lobby_system_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_msg           TEXT;
    v_team_name     TEXT;
    SYSTEM_SENDER   CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    IF TG_TABLE_NAME = 'matches' AND TG_OP = 'UPDATE' THEN

        IF OLD.team_a_ready_at IS NULL AND NEW.team_a_ready_at IS NOT NULL THEN
            SELECT name INTO v_team_name FROM public.teams WHERE id = NEW.team_a_id;
            INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
            VALUES (NEW.id, SYSTEM_SENDER, 'SYSTEM', '[SYSTEM] สโมสร ' || COALESCE(v_team_name, 'TEAM_A') || ' กดยืนยันความพร้อมแข่งขันแล้ว ✅', TRUE);
        END IF;

        IF OLD.team_b_ready_at IS NULL AND NEW.team_b_ready_at IS NOT NULL THEN
            SELECT name INTO v_team_name FROM public.teams WHERE id = NEW.team_b_id;
            INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
            VALUES (NEW.id, SYSTEM_SENDER, 'SYSTEM', '[SYSTEM] สโมสร ' || COALESCE(v_team_name, 'TEAM_B') || ' กดยืนยันความพร้อมแข่งขันแล้ว ✅', TRUE);
        END IF;

        IF OLD.status != 'VETO' AND NEW.status = 'VETO' THEN
            INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
            VALUES (NEW.id, SYSTEM_SENDER, 'SYSTEM', '[SYSTEM] เริ่มต้นขั้นตอนดราฟต์เลือกแผนที่แข่ง (Map Veto Phase Active)', TRUE);
        END IF;

        IF OLD.status != 'LIVE' AND NEW.status = 'LIVE' THEN
            INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
            VALUES (NEW.id, SYSTEM_SENDER, 'SYSTEM', '[SYSTEM] สัญญาณภาพพร้อมรบแล้ว! การแข่งขันนัดประวัติศาสตร์เริ่มต้นอย่างเป็นทางการ ⚔️', TRUE);
        END IF;

        -- Fix 4: lobby_code lives in format_config JSONB, not a flat column.
        IF (OLD.format_config->>'lobby_code' IS NULL AND NEW.format_config->>'lobby_code' IS NOT NULL)
           OR (OLD.format_config->>'lobby_code' IS DISTINCT FROM NEW.format_config->>'lobby_code') THEN
            INSERT INTO public.match_lobby_messages (match_id, sender_id, sender_role, message, is_system)
            VALUES (
                NEW.id,
                SYSTEM_SENDER,
                'SYSTEM',
                '[SYSTEM] ผู้ตัดสินได้กรอกรหัสพาสเวิร์ดล็อบบี้: ' || NEW.format_config->>'lobby_code',
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
            VALUES (NEW.id, SYSTEM_SENDER, 'SYSTEM', v_msg, TRUE);
        END IF;

    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_lobby_system_messages ON public.matches;
CREATE TRIGGER trg_match_lobby_system_messages
    AFTER UPDATE ON public.matches
    FOR EACH ROW EXECUTE FUNCTION public.log_lobby_system_message();
