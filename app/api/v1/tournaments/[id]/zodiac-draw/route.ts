import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ZODIAC_SIGNS, ZodiacDrawRequestSchema, type ZodiacDrawEntry, type ZodiacDrawResult } from '@/types/finals';
import { toJson } from '@/types/supabase-helpers';

const DEFAULT_SALT = 'ZODIAC_ARENA_SALT_2026';

interface QualifiedRow {
  team_id: string;
  finals_seed: number;
  teams: { name: string } | null;
}

interface TournamentRecord {
  id: string;
  name?: string;
  format_config?: Record<string, unknown> | null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const tournamentId = resolvedParams.id;
    const supabase = await createClient();

    const { data, error: tourError } = await supabase
      .from('tournaments' as never)
      .select('*')
      .eq('id' as never, tournamentId)
      .single();

    if (tourError || !data) {
      return NextResponse.json(
        { error: { code: 'TOURNAMENT_NOT_FOUND', message: 'ไม่พบข้อมูลทัวร์นาเมนต์นี้บนระบบ' } },
        { status: 404 }
      );
    }

    const tournament = data as unknown as TournamentRecord;
    const formatConfig = (tournament.format_config ?? {}) as { zodiac_draw?: ZodiacDrawResult };
    const draw = formatConfig.zodiac_draw ?? null;

    return NextResponse.json({
      success: true,
      locked: !!draw,
      draw,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const tournamentId = resolvedParams.id;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบผู้ดูแลระบบก่อนรันพิธีดรอสลาก' } },
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
        { error: { code: 'FORBIDDEN', message: 'สิทธิ์ในการรันพิธีสุ่มสลักสิทธิ์สงวนไว้เฉพาะผู้ดูแลระบบระดับสูงเท่านั้น' } },
        { status: 403 }
      );
    }

    let body: unknown = {};
    try {
      const rawText = await req.text();
      if (rawText) body = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } },
        { status: 400 }
      );
    }

    const parseResult = ZodiacDrawRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }
    const salt = parseResult.data.salt ?? DEFAULT_SALT;

    const adminSupabase = createAdminClient();

    const { data, error: tourError } = await adminSupabase
      .from('tournaments' as never)
      .select('*')
      .eq('id' as never, tournamentId)
      .single();

    if (tourError || !data) {
      return NextResponse.json(
        { error: { code: 'TOURNAMENT_NOT_FOUND', message: 'ไม่พบข้อมูลทัวร์นาเมนต์นี้บนระบบ' } },
        { status: 404 }
      );
    }

    const tournament = data as unknown as TournamentRecord;
    const existingConfig = (tournament.format_config ?? {}) as { zodiac_draw?: ZodiacDrawResult };
    if (existingConfig.zodiac_draw) {
      return NextResponse.json(
        { error: { code: 'DRAW_ALREADY_LOCKED', message: 'พิธีจับสลากราศีถูกล็อกถาวรแล้ว ไม่สามารถสุ่มซ้ำได้' } },
        { status: 409 }
      );
    }

    // ดึง 12 ทีมที่ล็อก finals_seed ไว้แล้วจาก /admin/finals/circuit-lock
    const { data: qualifiedRows, error: teamsError } = await adminSupabase
      .from('circuit_standings' as never)
      .select('team_id, finals_seed, teams!team_id(name)')
      .eq('is_finals_qualified' as never, true)
      .order('finals_seed' as never, { ascending: true });

    if (teamsError) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: teamsError.message } }, { status: 500 });
    }

    const qualifiedTeams = (qualifiedRows as unknown as QualifiedRow[] | null) ?? [];
    if (qualifiedTeams.length !== 12) {
      return NextResponse.json(
        { error: { code: 'INSUFFICIENT_QUALIFIED_TEAMS', message: `ต้องมีทีมผ่านสิทธิ์ finals_seed ครบ 12 ทีมก่อน (ปัจจุบัน ${qualifiedTeams.length} ทีม) — รัน /admin/finals/circuit-lock ก่อน` } },
        { status: 422 }
      );
    }

    // Deterministic Seeded Shuffle: MD5(finals_seed + salt) เรียงจากน้อยไปมาก
    const shuffled = qualifiedTeams
      .map((team) => ({
        hash: createHash('md5').update(`${team.finals_seed}_${salt}`).digest('hex'),
        team_id: team.team_id,
        team_name: team.teams?.name ?? 'Unknown Team',
        finals_seed: team.finals_seed,
      }))
      .sort((a, b) => a.hash.localeCompare(b.hash));

    const results = {} as Record<(typeof ZODIAC_SIGNS)[number], ZodiacDrawEntry>;
    ZODIAC_SIGNS.forEach((sign, index) => {
      const item = shuffled[index];
      results[sign] = { team_id: item.team_id, team_name: item.team_name, finals_seed: item.finals_seed };
    });

    const drawResult: ZodiacDrawResult = {
      algorithm: 'MD5_SEEDED_V1',
      salt,
      locked_at: new Date().toISOString(),
      locked_by: admin.id,
      results,
    };

    const updatePayload = {
      format_config: {
        ...existingConfig,
        zodiac_draw: drawResult,
      },
    };

    const { error: updateError } = await adminSupabase
      .from('tournaments' as never)
      .update(updatePayload as never)
      .eq('id' as never, tournamentId);

    if (updateError) {
      return NextResponse.json({ error: { code: 'DATABASE_UPDATE_FAILED', message: updateError.message } }, { status: 500 });
    }

    await adminSupabase.from('audit_logs' as never).insert({
      actor_id: admin.id,
      action: 'CREATE',
      entity_type: 'tournaments',
      entity_id: tournamentId,
      reason: 'ZODIAC_DRAW_PUBLISHED',
      after_data: toJson(drawResult),
    } as never);

    return NextResponse.json({
      success: true,
      locked: true,
      message: 'พิธีดรอสจับคู่ราศีเสร็จสิ้นสมบูรณ์ ล็อกประวัติการสุ่มถาวร',
      draw: drawResult,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}