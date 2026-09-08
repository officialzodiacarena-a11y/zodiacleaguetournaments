import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SeasonArchiveSchema, ZODIAC_SIGNS, type ZodiacDrawResult } from '@/types/finals';

interface GrandFinalNodeRow {
  id: string;
  match_id: string | null;
  round_number: number;
  created_at: string;
}

interface RosterMemberRow {
  role: string;
  players: { id: string; athlete_id: string; display_name: string } | null;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } },
        { status: 401 }
      );
    }

    const { data: admin, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !admin) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } },
        { status: 404 }
      );
    }

    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('player_id', admin.id)
      .is('revoked_at', null)
      .single();

    if (roleError || !userRole || !['ADMIN', 'SUPER_ADMIN'].includes(userRole.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN_ROLE', message: 'บัญชีนี้ไม่มีสิทธิ์ Freeze ฤดูกาลและบันทึก Hall of Fame' } },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } },
        { status: 400 }
      );
    }

    const parseResult = SeasonArchiveSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด — ต้องระบุ tournament_id', details: parseResult.error.format() } },
        { status: 400 }
      );
    }
    const { tournament_id, year } = parseResult.data;

    const adminSupabase = createAdminClient();

    // 1. ทัวร์นาเมนต์ต้องผ่านพิธีจับสลากราศีล็อกแล้ว
    const { data: tournament, error: tourError } = await adminSupabase
      .from('tournaments')
      .select('id, season_id, format_config')
      .eq('id', tournament_id)
      .single();

    if (tourError || !tournament) {
      return NextResponse.json(
        { error: { code: 'TOURNAMENT_NOT_FOUND', message: 'ไม่พบข้อมูลทัวร์นาเมนต์นี้บนระบบ' } },
        { status: 404 }
      );
    }

    const formatConfig = (tournament.format_config ?? {}) as { zodiac_draw?: ZodiacDrawResult };
    const draw = formatConfig.zodiac_draw;
    if (!draw) {
      return NextResponse.json(
        { error: { code: 'DRAW_NOT_LOCKED', message: 'ต้องรันพิธีจับสลากราศี (zodiac-draw) ให้ล็อกก่อนจึงจะ Archive ฤดูกาลได้' } },
        { status: 409 }
      );
    }

    // 2. หาแมตช์ Grand Final ที่ COMPLETED ล่าสุดของทัวร์นาเมนต์นี้ เพื่อทราบผู้ชนะ
    const { data: stages, error: stagesError } = await adminSupabase
      .from('tournament_stages')
      .select('id')
      .eq('tournament_id', tournament_id);

    if (stagesError || !stages || stages.length === 0) {
      return NextResponse.json(
        { error: { code: 'STAGES_NOT_FOUND', message: 'ไม่พบ Stage ของทัวร์นาเมนต์นี้' } },
        { status: 404 }
      );
    }
    const stageIds = stages.map((s) => s.id);

    const { data: gfNodeRows, error: gfError } = await adminSupabase
      .from('bracket_nodes')
      .select('id, match_id, round_number, created_at')
      .in('stage_id', stageIds)
      .eq('bracket_type', 'GRAND_FINAL')
      .eq('status', 'COMPLETED')
      .order('round_number', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    if (gfError) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: gfError.message } }, { status: 500 });
    }

    const gfNode = (gfNodeRows as GrandFinalNodeRow[] | null)?.[0];
    if (!gfNode || !gfNode.match_id) {
      return NextResponse.json(
        { error: { code: 'GRAND_FINAL_NOT_COMPLETED', message: 'Grand Final ของทัวร์นาเมนต์นี้ยังไม่เสร็จสิ้น ไม่สามารถ Archive ได้' } },
        { status: 409 }
      );
    }

    const { data: match, error: matchError } = await adminSupabase
      .from('matches')
      .select('id, winner_team_id')
      .eq('id', gfNode.match_id)
      .single();

    if (matchError || !match || !match.winner_team_id) {
      return NextResponse.json(
        { error: { code: 'GRAND_FINAL_NOT_COMPLETED', message: 'ยังไม่พบผู้ชนะที่บันทึกไว้ในแมตช์ Grand Final' } },
        { status: 409 }
      );
    }
    const championTeamId = match.winner_team_id;

    // 3. ทวน finals_seed / total_zp จาก circuit_standings ของทีมแชมป์
    const { data: standing, error: standingError } = await adminSupabase
      .from('circuit_standings')
      .select('finals_seed, counted_zp, team_id')
      .eq('team_id', championTeamId)
      .eq('is_finals_qualified', true)
      .single();

    if (standingError || !standing || standing.finals_seed === null) {
      return NextResponse.json(
        { error: { code: 'STANDING_NOT_FOUND', message: 'ไม่พบข้อมูล finals_seed ของทีมแชมป์ใน circuit_standings' } },
        { status: 409 }
      );
    }

    // 4. หา zodiac_sign ของทีมแชมป์จากผลจับสลากที่ล็อกไว้
    const zodiacSign = ZODIAC_SIGNS.find((sign) => draw.results[sign]?.team_id === championTeamId);
    if (!zodiacSign) {
      return NextResponse.json(
        { error: { code: 'ZODIAC_SIGN_NOT_FOUND', message: 'ไม่พบราศีของทีมแชมป์ในผลจับสลากที่ล็อกไว้' } },
        { status: 409 }
      );
    }

    // 5. ดึง roster ACTIVE ของทีมแชมป์ ณ วันชิงแชมป์ (immutable snapshot)
    const { data: teamRow, error: teamError } = await adminSupabase
      .from('teams')
      .select('id, name')
      .eq('id', championTeamId)
      .single();

    if (teamError || !teamRow) {
      return NextResponse.json(
        { error: { code: 'TEAM_NOT_FOUND', message: 'ไม่พบข้อมูลทีมแชมป์' } },
        { status: 404 }
      );
    }

    const { data: rosterRows, error: rosterError } = await adminSupabase
      .from('team_members')
      .select('role, players!player_id(id, athlete_id, display_name)')
      .eq('team_id', championTeamId)
      .eq('status', 'ACTIVE');

    if (rosterError) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: rosterError.message } }, { status: 500 });
    }

    const rosterSnapshot = ((rosterRows as unknown as RosterMemberRow[]) ?? []).map((m) => ({
      player_id: m.players?.id ?? null,
      athlete_id: m.players?.athlete_id ?? null,
      display_name: m.players?.display_name ?? null,
      role: m.role,
    }));

    const resolvedYear = year ?? new Date().getFullYear();

    // 6. บันทึกลง Hall of Fame (append-only, immutable)
    const { data: hofRow, error: hofInsertError } = await adminSupabase
      .from('hall_of_fame')
      .insert({
        year: resolvedYear,
        team_id: championTeamId,
        team_name: teamRow.name,
        zodiac_sign: zodiacSign,
        total_zp: standing.counted_zp,
        roster_snapshot: rosterSnapshot,
        finals_seed: standing.finals_seed,
        achievements: ['CHAMPION'],
      })
      .select()
      .single();

    if (hofInsertError) {
      if (hofInsertError.code === '23505') {
        return NextResponse.json(
          { error: { code: 'HOF_ALREADY_ARCHIVED', message: 'ปีนี้มีการบันทึก Hall of Fame ของทีมนี้หรือราศีนี้ไปแล้ว' } },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: { code: 'INSERT_FAILED', message: hofInsertError.message } }, { status: 500 });
    }

    // 7. Freeze season → CONCLUDED (รันหลัง hall_of_fame commit สำเร็จเท่านั้น)
    const { error: seasonUpdateError } = await adminSupabase
      .from('seasons')
      .update({ status: 'CONCLUDED' })
      .eq('id', tournament.season_id);

    if (seasonUpdateError) {
      return NextResponse.json({ error: { code: 'SEASON_FREEZE_FAILED', message: seasonUpdateError.message } }, { status: 500 });
    }

    await adminSupabase.from('audit_logs').insert({
      actor_id: admin.id,
      action: 'CREATE',
      entity_type: 'hall_of_fame',
      entity_id: hofRow.id,
      reason: 'SEASON_ARCHIVE',
      after_data: { season_id: tournament.season_id, hall_of_fame: hofRow },
    });

    return NextResponse.json({
      success: true,
      message: 'บันทึก Hall of Fame และ Freeze ฤดูกาลเป็น CONCLUDED เรียบร้อย',
      data: { hall_of_fame: hofRow, season_id: tournament.season_id, season_status: 'CONCLUDED' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
