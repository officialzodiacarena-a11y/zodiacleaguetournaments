import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SeasonResetSchema } from '@/types/finals';

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
        { error: { code: 'FORBIDDEN_ROLE', message: 'บัญชีนี้ไม่มีสิทธิ์เปิดฤดูกาลใหม่' } },
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

    const parseResult = SeasonResetSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }
    const { circuit_id, new_season } = parseResult.data;

    const adminSupabase = createAdminClient();

    // ต้องรันหลัง season-archive เท่านั้น — เช็คว่าฤดูกาลล่าสุดของ circuit นี้ถูก Freeze แล้ว
    const { data: latestSeason, error: latestSeasonError } = await adminSupabase
      .from('seasons')
      .select('id, status')
      .eq('circuit_id', circuit_id)
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestSeasonError) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: latestSeasonError.message } }, { status: 500 });
    }

    if (latestSeason && latestSeason.status !== 'CONCLUDED') {
      return NextResponse.json(
        { error: { code: 'SEASON_NOT_ARCHIVED', message: 'ต้องรัน /admin/finals/season-archive ให้ฤดูกาลปัจจุบันเป็น CONCLUDED ก่อนจึงจะเปิดฤดูกาลใหม่ได้' } },
        { status: 409 }
      );
    }

    // 1. เปิด Season ใหม่
    const { data: createdSeason, error: createSeasonError } = await adminSupabase
      .from('seasons')
      .insert({
        circuit_id,
        name: new_season.name,
        starts_at: new_season.starts_at,
        ends_at: new_season.ends_at,
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (createSeasonError || !createdSeason) {
      return NextResponse.json({ error: { code: 'SEASON_CREATE_FAILED', message: createSeasonError?.message ?? 'สร้างฤดูกาลใหม่ไม่สำเร็จ' } }, { status: 500 });
    }

    // 2. รีเซ็ต circuit_standings ของ circuit นี้ทั้งหมด
    const { data: resetRows, error: resetError } = await adminSupabase
      .from('circuit_standings')
      .update({
        spring_zp: 0,
        summer_zp: 0,
        fall_zp: 0,
        winter_zp: 0,
        bonus_zp: 0,
        penalty_zp: 0,
        total_zp: 0,
        counted_zp: 0,
        rank: null,
        tiebreaker_applied: null,
        is_finals_qualified: false,
        finals_seed: null,
        qualified_at: null,
        last_calculated_at: new Date().toISOString(),
      })
      .eq('circuit_id', circuit_id)
      .select('team_id');

    if (resetError) {
      return NextResponse.json({ error: { code: 'RESET_FAILED', message: resetError.message } }, { status: 500 });
    }

    await adminSupabase.from('audit_logs').insert({
      actor_id: admin.id,
      action: 'CREATE',
      entity_type: 'seasons',
      entity_id: createdSeason.id,
      reason: 'SEASON_RESET',
      after_data: { circuit_id, new_season: createdSeason, reset_team_count: resetRows?.length ?? 0 },
    });

    return NextResponse.json({
      success: true,
      message: 'เปิดฤดูกาลใหม่และรีเซ็ต circuit_standings เรียบร้อย',
      data: { season: createdSeason, reset_team_count: resetRows?.length ?? 0 },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
