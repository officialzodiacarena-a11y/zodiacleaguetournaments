import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CircuitLockSchema } from '@/types/finals';

interface CandidateRow {
  team_id: string;
  counted_zp: number;
  teams: { name: string } | null;
}

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } },
      { status: 401 }
    ) };
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (playerError || !player) {
    return { error: NextResponse.json(
      { error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } },
      { status: 404 }
    ) };
  }

  const { data: userRole, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('player_id', player.id)
    .is('revoked_at', null)
    .single();

  const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
  if (roleError || !userRole || !allowedRoles.includes(userRole.role)) {
    return { error: NextResponse.json(
      { error: { code: 'FORBIDDEN_ROLE', message: 'บัญชีนี้ไม่มีสิทธิ์ล็อกอันดับ Circuit Finals' } },
      { status: 403 }
    ) };
  }

  return { player };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const guard = await requireAdmin(supabase);
    if (guard.error) return guard.error;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } },
        { status: 400 }
      );
    }

    const parseResult = CircuitLockSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด — ต้องระบุ circuit_id', details: parseResult.error.format() } },
        { status: 400 }
      );
    }
    const { circuit_id } = parseResult.data;

    const adminSupabase = createAdminClient();

    // 1. ดึง TOP 12 ของ circuit นี้ ตาม counted_zp (ใช้ตัดสิน qualification/ranking จริง)
    const { data: candidateRows, error: candidatesError } = await adminSupabase
      .from('circuit_standings')
      .select('team_id, counted_zp, teams!team_id(name)')
      .eq('circuit_id', circuit_id)
      .not('counted_zp', 'is', null)
      .order('counted_zp', { ascending: false })
      .limit(12);

    if (candidatesError) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: candidatesError.message } }, { status: 500 });
    }

    const candidates = candidateRows as unknown as CandidateRow[] | null;

    if (!candidates || candidates.length < 12) {
      return NextResponse.json(
        { error: { code: 'INSUFFICIENT_QUALIFIED_TEAMS', message: `Circuit นี้มีทีมสะสมคะแนนเพียง ${candidates?.length ?? 0} ทีม ต้องครบ 12 ทีมจึงจะล็อก Finals ได้` } },
        { status: 422 }
      );
    }

    // 2. ปลด flag เดิมทั้งหมด (unique index เป็น global ไม่ผูก circuit_id) ก่อนมอบ seed ใหม่
    const { error: resetError } = await adminSupabase
      .from('circuit_standings')
      .update({ is_finals_qualified: false, finals_seed: null })
      .eq('is_finals_qualified', true);

    if (resetError) {
      return NextResponse.json({ error: { code: 'RESET_FAILED', message: resetError.message } }, { status: 500 });
    }

    // 3. มอบ finals_seed #1-12 ตามอันดับ counted_zp
    const seeded = candidates.map((row, index) => ({
      team_id: row.team_id,
      team_name: row.teams?.name ?? null,
      finals_seed: index + 1,
    }));

    const updateResults = await Promise.all(
      seeded.map((entry) =>
        adminSupabase
          .from('circuit_standings')
          .update({ is_finals_qualified: true, finals_seed: entry.finals_seed, qualified_at: new Date().toISOString() })
          .eq('circuit_id', circuit_id)
          .eq('team_id', entry.team_id)
      )
    );

    const failedUpdate = updateResults.find((r) => r.error);
    if (failedUpdate?.error) {
      return NextResponse.json({ error: { code: 'SEED_ASSIGN_FAILED', message: failedUpdate.error.message } }, { status: 500 });
    }

    await adminSupabase.from('audit_logs').insert({
      actor_id: guard.player.id,
      action: 'UPDATE',
      entity_type: 'circuit_standings',
      entity_id: circuit_id,
      reason: 'CIRCUIT_LOCK_TOP12',
      after_data: { circuit_id, seeded },
    });

    return NextResponse.json({
      success: true,
      message: 'ล็อกอันดับ TOP 12 ของ Circuit เรียบร้อย พร้อมเข้าสู่พิธีจับสลากราศี',
      data: seeded,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
