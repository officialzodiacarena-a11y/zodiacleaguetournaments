-- supabase/migrations/20260917_athlete_telemetry_hud_real_data.sql
-- =============================================================================
-- ZODIAC ARENA — ATHLETE TELEMETRY HUD (A5) — REAL DATA REWRITE (V26 FIXES)
-- Document Code: SPEC-TELEMETRY-HUD-A5-V26-FIXES
-- QA: PASS (Alis) — see Vault path:
--   01_System_Workflow/Hub2_Dev_Tools_Env/❌ -Fast-Fixing/
--   ZODIAC_ARENA_SPEC_ATHLETE_TELEMETRY_HUD_A5_V26_REAL_DATA_FIXES.md
--
-- ส่งให้พี่หยัดรันใน Supabase SQL Editor เท่านั้น — Claude ไม่มีสิทธิ์รัน SQL
--
-- แก้ไขจาก draft ต้นฉบับ (00_0Hub_Product_Vision/Patch_V7.01/
-- ZODIAC_ARENA_SPEC_ATHLETE_TELEMETRY_HUD_A5_FULL_CODE.md) หลังตรวจกับ schema
-- จริงใน types/database.types.ts:
--
--   1. players.zodiac_sign / players.zp_balance — ไม่มีคอลัมน์นี้จริง
--      zodiac_sign คำนวณจาก players.date_of_birth แทน (ดูฟังก์ชันด้านล่าง)
--      zp_balance ตัดออกจาก payload ทั้งหมด — พี่หยัดยืนยันว่า ZP wallet ผู้เล่น
--      ยังไม่ถูกสร้าง รอพี่ไอซ์ส่งบัญชีมาผูกก่อน คืนค่า null +
--      zpBalanceAvailable: false ให้ UI ซ่อน tile นี้แทนโชว์เลขปลอม/0
--
--   2. matches.score_summary / matches.match_type — ไม่มีคอลัมน์นี้จริง
--      ใช้ score_a/score_b (มีจริง) ต่อ string เป็น score summary แทน
--      ใช้ matches.round_label (มีจริง) แทน match_type ที่ไม่มี
--
--   3. match_participants.damage_delta — ไม่มีคอลัมน์นี้จริง
--      ใช้ match_participants.adr (Average Damage per Round, มีจริง) แทน
--
--   4. draft เดิม query v_verification (rank_snapshot) และ v_stats
--      (player_stats เต็ม) มาถูกต้อง แต่ hardcode ค่าคงที่ทับตอน build response
--      (เช่น 'Radiant', 647, ACS 251.5) แทนที่จะอ่านจากตัวแปรที่ query มาแล้ว —
--      แก้ให้ใช้ v_verification/v_stats จริงทุกจุด
--
--   5. accuracyAnatomy (head/body/leg hit %) และ topWeapons ต้องการ telemetry
--      ระดับ per-bullet/per-weapon ซึ่งไม่มีตารางไหนเก็บอยู่เลย (ปกติมาจาก
--      Riot Game API แต่ integration พักไว้ก่อน ใช้ Manual Verification แทน)
--      เพิ่มตาราง match_participant_hit_stats / match_participant_weapons
--      แบบ manual-entry ให้ staff/ผู้เล่นกรอกทีหลังได้ — RPC อ่านข้อมูลจริง
--      จากตารางนี้ คืนค่า NULL/[] เมื่อยังไม่มีใครกรอก (ไม่ fabricate ตัวเลข)
--
--   6. rolesBreakdown ใช้ match_participants.role_played กลุ่มจริง — แต่ยังไม่
--      พบ endpoint ไหนเขียนค่าลงคอลัมน์นี้ในโค้ดปัจจุบัน (open question ที่ QA
--      ทิ้งไว้ให้พี่หยัดตัดสินใจภายหลังว่าจะแก้ flow การกรอกผลแมตช์ตอนไหน) —
--      ไม่ block การรัน migration นี้ แค่ผลลัพธ์จะว่างเปล่าจนกว่าจะมีข้อมูลจริง
--
--   7. [พบหลัง QA ผ่าน ตอนวางแผนว่าจะเอา HUD นี้ไปแปะหน้าไหน] anti-BOLA guard
--      เดิมเทียบ p_player_id (players.id) ตรงๆ กับ auth.uid() — สองค่านี้คนละ
--      UUID space กัน (players.id เป็น PK ของตัวเอง, players.user_id ถึงจะตรงกับ
--      auth.uid() ตามแพทเทิร์นเดียวกับ create_scrim_room()/claim_mercy_sub_slot()
--      ใน 20260914_match_room_mercy_scrim_v7_01.sql) เดิมเลยจะโดน
--      UNAUTHORIZED_ACCESS ทุกครั้งแม้แต่ตอนดูของตัวเอง แก้โดย lookup
--      players.user_id มาเทียบแทน และขยายสิทธิ์ให้ดูของคนอื่นได้ด้วย (พี่หยัด
--      อยากให้ HUD นี้โผล่ได้ทุกหน้าที่กดดูโปรไฟล์ใครก็ตามในระบบ ไม่ใช่แค่ของ
--      ตัวเอง) — ยังคงต้อง sign in อยู่ (auth.uid() ต้องไม่ NULL) แต่ apBalance
--      จะโชว์เฉพาะตอน isSelf = true เท่านั้น ข้อมูลอื่นทั้งหมดเป็น public stats
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Manual-Entry Raw Telemetry Tables (Fix 5)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_participant_hit_stats (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_participant_id  UUID NOT NULL UNIQUE REFERENCES public.match_participants(id) ON DELETE CASCADE,
    head_hits             INTEGER NOT NULL DEFAULT 0 CHECK (head_hits >= 0),
    body_hits             INTEGER NOT NULL DEFAULT 0 CHECK (body_hits >= 0),
    leg_hits              INTEGER NOT NULL DEFAULT 0 CHECK (leg_hits >= 0),
    entered_by            UUID REFERENCES public.players(id) ON DELETE SET NULL,
    is_verified           BOOLEAN NOT NULL DEFAULT false,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.match_participant_weapons (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_participant_id  UUID NOT NULL REFERENCES public.match_participants(id) ON DELETE CASCADE,
    weapon_name           VARCHAR(50) NOT NULL,
    weapon_category       VARCHAR(30) NOT NULL DEFAULT 'Other',
    kills                 INTEGER NOT NULL DEFAULT 0 CHECK (kills >= 0),
    head_hits             INTEGER NOT NULL DEFAULT 0 CHECK (head_hits >= 0),
    body_hits             INTEGER NOT NULL DEFAULT 0 CHECK (body_hits >= 0),
    leg_hits              INTEGER NOT NULL DEFAULT 0 CHECK (leg_hits >= 0),
    entered_by            UUID REFERENCES public.players(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_participant_weapon UNIQUE (match_participant_id, weapon_name)
);

CREATE INDEX IF NOT EXISTS idx_mph_stats_lookup ON public.match_participant_hit_stats (match_participant_id);
CREATE INDEX IF NOT EXISTS idx_mpw_lookup ON public.match_participant_weapons (match_participant_id);

ALTER TABLE public.match_participant_hit_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participant_weapons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Hit Stats" ON public.match_participant_hit_stats;
CREATE POLICY "Public Read Hit Stats" ON public.match_participant_hit_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Weapon Stats" ON public.match_participant_weapons;
CREATE POLICY "Public Read Weapon Stats" ON public.match_participant_weapons FOR SELECT USING (true);

-- Writes only via admin client from a dedicated Server Action (entry-form UI
-- is a separate follow-up task, out of scope here) — no INSERT policy
-- required for the app to function, documented read-only like the other
-- manual-entry tables in this project.

-- -----------------------------------------------------------------------------
-- 2. RPC: get_athlete_telemetry_dashboard_v26 (Real Data)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_athlete_telemetry_dashboard_v26(p_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_player RECORD;
    v_owner_auth_id UUID;
    v_is_self BOOLEAN;
    v_verification RECORD;
    v_stats RECORD;
    v_zodiac_sign TEXT;
    v_dob_month INT;
    v_dob_day INT;
    v_recent_20_tiles JSONB;
    v_recent_20_matches JSONB;
    v_accuracy_anatomy JSONB;
    v_roles_breakdown JSONB;
    v_top_weapons JSONB;
    v_rolling20_wins INT;
    v_rolling20_count INT;
BEGIN
    SET LOCAL lock_timeout = '3s';

    -- Fix 7 [bug found before merge]: the check below originally compared
    -- p_player_id (players.id, the row's own primary key) directly against
    -- auth.uid() (the auth user id, stored separately as players.user_id) —
    -- those are two different UUID spaces in this schema (see the same
    -- lookup pattern in create_scrim_room()/claim_mercy_sub_slot() in
    -- 20260914_match_room_mercy_scrim_v7_01.sql), so the old check raised
    -- UNAUTHORIZED_ACCESS on every real call, including a player viewing
    -- their own telemetry. Also broadened per พี่หยัด: this HUD is meant to
    -- show up on any athlete's profile view system-wide (Tracker.gg-style
    -- public passport), not just the signed-in player's own page — so this
    -- now requires only that *some* user is signed in, and exposes
    -- balance-type fields (AP) only when the viewer is the profile owner.
    IF auth.uid() IS NULL AND auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'UNAUTHORIZED_ACCESS: Sign in to view athlete telemetry.' USING ERRCODE = '42501';
    END IF;

    -- 1. Player Base Profile (Fix 1: dropped zodiac_sign/zp_balance columns —
    -- neither exists; zodiac computed below, zp_balance omitted)
    SELECT p.id, p.athlete_id, p.display_name, p.avatar_url, p.ap_balance, p.date_of_birth, p.user_id
    INTO v_player
    FROM public.players p
    WHERE p.id = p_player_id;

    IF v_player.id IS NULL THEN
        RAISE EXCEPTION 'PLAYER_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    v_owner_auth_id := v_player.user_id;
    v_is_self := (v_owner_auth_id = auth.uid()) OR (auth.role() = 'service_role');

    -- Fix 1: zodiac sign computed from date_of_birth (no stored column) —
    -- casing matches the existing CHECK constraint on public.hall_of_fame
    v_dob_month := EXTRACT(MONTH FROM v_player.date_of_birth);
    v_dob_day := EXTRACT(DAY FROM v_player.date_of_birth);
    v_zodiac_sign := CASE
        WHEN v_player.date_of_birth IS NULL THEN NULL
        WHEN (v_dob_month = 3 AND v_dob_day >= 21) OR (v_dob_month = 4 AND v_dob_day <= 19) THEN 'Aries'
        WHEN (v_dob_month = 4 AND v_dob_day >= 20) OR (v_dob_month = 5 AND v_dob_day <= 20) THEN 'Taurus'
        WHEN (v_dob_month = 5 AND v_dob_day >= 21) OR (v_dob_month = 6 AND v_dob_day <= 20) THEN 'Gemini'
        WHEN (v_dob_month = 6 AND v_dob_day >= 21) OR (v_dob_month = 7 AND v_dob_day <= 22) THEN 'Cancer'
        WHEN (v_dob_month = 7 AND v_dob_day >= 23) OR (v_dob_month = 8 AND v_dob_day <= 22) THEN 'Leo'
        WHEN (v_dob_month = 8 AND v_dob_day >= 23) OR (v_dob_month = 9 AND v_dob_day <= 22) THEN 'Virgo'
        WHEN (v_dob_month = 9 AND v_dob_day >= 23) OR (v_dob_month = 10 AND v_dob_day <= 22) THEN 'Libra'
        WHEN (v_dob_month = 10 AND v_dob_day >= 23) OR (v_dob_month = 11 AND v_dob_day <= 21) THEN 'Scorpio'
        WHEN (v_dob_month = 11 AND v_dob_day >= 22) OR (v_dob_month = 12 AND v_dob_day <= 21) THEN 'Sagittarius'
        WHEN (v_dob_month = 12 AND v_dob_day >= 22) OR (v_dob_month = 1 AND v_dob_day <= 19) THEN 'Capricorn'
        WHEN (v_dob_month = 1 AND v_dob_day >= 20) OR (v_dob_month = 2 AND v_dob_day <= 18) THEN 'Aquarius'
        ELSE 'Pisces'
    END;

    -- 2. Verification & Rank Snapshot (Fix 4: real — read the JSONB shape
    -- below, not hardcoded 'Radiant'/647 like the draft did)
    SELECT game_name, tag_line, verification_status, rank_snapshot
    INTO v_verification
    FROM public.game_accounts
    WHERE player_id = p_player_id AND is_primary = true
    ORDER BY created_at DESC LIMIT 1;

    -- 3. Aggregate Player Stats (Fix 4: real)
    SELECT matches_played, matches_won, matches_lost, win_rate,
           avg_acs, avg_kd, avg_kda, avg_adr, headshot_pct,
           agent_pool, map_performance
    INTO v_stats
    FROM public.player_stats
    WHERE player_id = p_player_id
    ORDER BY updated_at DESC LIMIT 1;

    -- 4. Rolling 20 Sparkline Tiles (Fix 2/3: real score + adr instead of
    -- score_summary/damage_delta, neither of which exist)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'matchId', m.id,
            'timeAgo', CASE
                WHEN EXTRACT(EPOCH FROM (NOW() - m.updated_at)) / 3600 < 1 THEN 'Just now'
                WHEN EXTRACT(EPOCH FROM (NOW() - m.updated_at)) / 3600 < 24 THEN ROUND(EXTRACT(EPOCH FROM (NOW() - m.updated_at)) / 3600)::text || 'h ago'
                ELSE ROUND(EXTRACT(EPOCH FROM (NOW() - m.updated_at)) / 86400)::text || 'd ago'
            END,
            'isWin', (m.winner_team_id = mp.team_id),
            'scoreSummary', mp.score_a::text || ' : ' || mp.score_b::text,
            'kdRatio', ROUND(mp.kills::numeric / GREATEST(1, mp.deaths), 1)
        )
    ), '[]'::jsonb)
    INTO v_recent_20_tiles
    FROM (
        SELECT mp.match_id, mp.team_id, mp.kills, mp.deaths, m2.score_a, m2.score_b
        FROM public.match_participants mp
        JOIN public.matches m2 ON m2.id = mp.match_id
        WHERE mp.player_id = p_player_id AND m2.status = 'COMPLETED'
        ORDER BY mp.created_at DESC
        LIMIT 20
    ) mp
    JOIN public.matches m ON m.id = mp.match_id;

    -- 5. Full 20 Detailed Match Rows (Fix 2/3: match_type -> round_label,
    -- score_summary -> score_a/score_b, damage_delta -> adr)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'matchId', m.id,
            'playedAt', m.updated_at,
            'dateLabel', TO_CHAR(m.updated_at, 'Mon DD'),
            'mapName', COALESCE(mg.map_name, 'Unknown'),
            'agentPlayed', mp.agent_played,
            'agentCode', UPPER(LEFT(COALESCE(mp.agent_played, '???'), 3)),
            'roundLabel', COALESCE(m.round_label, 'Match'),
            'isWin', (m.winner_team_id = mp.team_id),
            'scoreSummary', m.score_a::text || ' : ' || m.score_b::text,
            'teamScore', m.score_a,
            'opponentScore', m.score_b,
            'kills', mp.kills,
            'deaths', mp.deaths,
            'assists', mp.assists,
            'kdRatio', ROUND(mp.kills::numeric / GREATEST(1, mp.deaths), 2),
            'acs', mp.acs,
            'adr', mp.adr,
            'headshotPct', mp.headshot_pct
        )
    ), '[]'::jsonb)
    INTO v_recent_20_matches
    FROM (
        SELECT id, match_id, match_game_id, team_id, kills, deaths, assists, acs, headshot_pct, adr, agent_played
        FROM public.match_participants
        WHERE player_id = p_player_id
        ORDER BY created_at DESC
        LIMIT 20
    ) mp
    JOIN public.matches m ON m.id = mp.match_id
    LEFT JOIN public.match_games mg ON mg.id = mp.match_game_id
    WHERE m.status = 'COMPLETED';

    -- 6. Accuracy Anatomy (Fix 5: real, from manual-entry table, gracefully
    -- NULL when nothing's been entered yet)
    SELECT CASE WHEN SUM(head_hits + body_hits + leg_hits) > 0 THEN
        jsonb_build_object(
            'headPct', ROUND(100.0 * SUM(head_hits) / SUM(head_hits + body_hits + leg_hits), 1),
            'headHits', SUM(head_hits),
            'bodyPct', ROUND(100.0 * SUM(body_hits) / SUM(head_hits + body_hits + leg_hits), 1),
            'bodyHits', SUM(body_hits),
            'legPct', ROUND(100.0 * SUM(leg_hits) / SUM(head_hits + body_hits + leg_hits), 1),
            'legHits', SUM(leg_hits)
        )
    ELSE NULL END
    INTO v_accuracy_anatomy
    FROM public.match_participant_hit_stats hs
    JOIN public.match_participants mp ON mp.id = hs.match_participant_id
    WHERE mp.player_id = p_player_id;

    -- 7. Roles Breakdown (Fix 6: real, grouped by role_played — see header
    -- open question on whether this column is populated by any flow yet)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'roleName', INITCAP(r.role_played),
            'roleKey', UPPER(r.role_played),
            'wins', r.wins,
            'losses', r.losses,
            'winRatePct', ROUND(100.0 * r.wins / GREATEST(1, r.wins + r.losses), 1),
            'kdaRatio', ROUND((r.kills + r.assists)::numeric / GREATEST(1, r.deaths), 2),
            'kills', r.kills,
            'deaths', r.deaths,
            'assists', r.assists
        )
    ), '[]'::jsonb)
    INTO v_roles_breakdown
    FROM (
        SELECT mp.role_played,
               COUNT(*) FILTER (WHERE m.winner_team_id = mp.team_id) AS wins,
               COUNT(*) FILTER (WHERE m.winner_team_id IS DISTINCT FROM mp.team_id) AS losses,
               SUM(mp.kills) AS kills,
               SUM(mp.deaths) AS deaths,
               SUM(mp.assists) AS assists
        FROM public.match_participants mp
        JOIN public.matches m ON m.id = mp.match_id
        WHERE mp.player_id = p_player_id AND mp.role_played IS NOT NULL AND m.status = 'COMPLETED'
        GROUP BY mp.role_played
    ) r;

    -- 8. Top Weapons (Fix 5: real, from manual-entry table)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'weaponName', w.weapon_name,
            'category', w.weapon_category,
            'kills', w.total_kills,
            'headPct', ROUND(100.0 * w.head_hits / GREATEST(1, w.head_hits + w.body_hits + w.leg_hits), 0),
            'bodyPct', ROUND(100.0 * w.body_hits / GREATEST(1, w.head_hits + w.body_hits + w.leg_hits), 0),
            'legPct', ROUND(100.0 * w.leg_hits / GREATEST(1, w.head_hits + w.body_hits + w.leg_hits), 0)
        ) ORDER BY w.total_kills DESC
    ), '[]'::jsonb)
    INTO v_top_weapons
    FROM (
        SELECT mw.weapon_name, mw.weapon_category,
               SUM(mw.kills) AS total_kills, SUM(mw.head_hits) AS head_hits,
               SUM(mw.body_hits) AS body_hits, SUM(mw.leg_hits) AS leg_hits
        FROM public.match_participant_weapons mw
        JOIN public.match_participants mp ON mp.id = mw.match_participant_id
        WHERE mp.player_id = p_player_id
        GROUP BY mw.weapon_name, mw.weapon_category
        ORDER BY SUM(mw.kills) DESC
        LIMIT 5
    ) w;

    -- 9. Rolling 20 record summary (real, computed from the same tile set)
    SELECT COUNT(*) FILTER (WHERE (v->>'isWin')::boolean), COUNT(*)
    INTO v_rolling20_wins, v_rolling20_count
    FROM jsonb_array_elements(v_recent_20_tiles) v;

    -- 10. Final Composite Payload — every field below traces to a real query
    -- above; nothing here is a literal placeholder value.
    RETURN jsonb_build_object(
        'overview', jsonb_build_object(
            'playerId', v_player.id,
            'athleteId', v_player.athlete_id,
            'displayName', v_player.display_name,
            'avatarUrl', v_player.avatar_url,
            'gameName', v_verification.game_name,
            'tagLine', v_verification.tag_line,
            'isVerified', (v_verification.verification_status = 'VERIFIED'),
            'zodiacSign', v_zodiac_sign,
            'isSelf', v_is_self,
            'apBalance', CASE WHEN v_is_self THEN v_player.ap_balance ELSE NULL END,
            'zpBalance', NULL,
            'zpBalanceAvailable', false,
            'currentRankTier', v_verification.rank_snapshot->>'tier',
            'currentRankRr', (v_verification.rank_snapshot->>'rr')::numeric,
            'peakRr', (v_verification.rank_snapshot->>'peakRr')::numeric,
            'peakSeason', v_verification.rank_snapshot->>'peakSeason',
            'metrics', jsonb_build_object(
                'acs', v_stats.avg_acs,
                'kdRatio', v_stats.avg_kd,
                'kdaRatio', v_stats.avg_kda,
                'adr', v_stats.avg_adr,
                'headshotPct', v_stats.headshot_pct,
                'winRatePct', v_stats.win_rate,
                'wins', v_stats.matches_won,
                'losses', v_stats.matches_lost
            ),
            'rolling20Record', COALESCE(v_rolling20_wins, 0)::text || 'W - ' || COALESCE(v_rolling20_count - v_rolling20_wins, 0)::text || 'L',
            'rolling20WinRatePct', CASE WHEN COALESCE(v_rolling20_count, 0) > 0 THEN ROUND(100.0 * v_rolling20_wins / v_rolling20_count, 1) ELSE NULL END
        ),
        'accuracyAnatomy', v_accuracy_anatomy,
        'rolesBreakdown', v_roles_breakdown,
        'topWeapons', v_top_weapons,
        'rolling20Tiles', v_recent_20_tiles,
        'recent20Matches', v_recent_20_matches,
        'lastUpdatedIso', NOW()
    );
END;
$$;

COMMIT;
