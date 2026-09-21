import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cleanIds, asInsert } from '@/types/supabase-helpers';
import { teamIdForSide, validateAction } from '@/lib/veto/engine';
import { loadVetoContext, resolveVetoProgress } from '@/lib/veto/service';

// Ban / Pick แมพ โดยกัปตัน / ผู้จัดการ / โค้ชของทีมที่ถึงตา
// ลำดับสเต็ป ทีมที่ต้องทำ ชนิด action และเวลา 60 วินาทีต่อสเต็ป มาจาก tournament_stages.veto_format (Veto Step Engine: lib/veto/engine.ts)
// - สเต็ปที่หมดเวลาแล้วระบบเลือกแมพให้ก่อน (Auto-pick) แล้วจึงตรวจคำสั่งนี้
// - DECIDER เลือกอัตโนมัติ และสถานะแมตช์เปลี่ยน VETO -> LIVE เมื่อครบทุกสเต็ป
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const supabase = await createClient();
  const { id: matchId } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: player } = await supabase.from('players').select('id').eq('user_id', user.id).single();
  if (!player) {
    return NextResponse.json({ error: 'Player profile not found' }, { status: 404 });
  }

  let body: { action?: unknown; map_name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const mapName = typeof body.map_name === 'string' ? body.map_name.trim() : '';
  const action = typeof body.action === 'string' ? body.action : null;
  if (!mapName) {
    return NextResponse.json({ error: 'map_name is required' }, { status: 400 });
  }

  const admin = createAdminClient();
  let ctx = await loadVetoContext(admin, matchId);
  if (!ctx) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }
  if (ctx.match.status !== 'VETO') {
    return NextResponse.json({ error: 'MATCH_NOT_IN_VETO: Match is not in VETO status' }, { status: 422 });
  }

  // 1) เติมสเต็ปที่หมดเวลาไปแล้ว (Auto-pick) ก่อนตรวจว่าตอนนี้ถึงตาใคร
  const before = await resolveVetoProgress(admin, matchId);
  if (before?.complete) {
    return NextResponse.json({ error: 'VETO_COMPLETE: Veto ครบทุกสเต็ปแล้ว (สเต็ปที่หมดเวลาถูกระบบเลือกให้)' }, { status: 409 });
  }
  ctx = (await loadVetoContext(admin, matchId)) ?? ctx;

  // 2) สิทธิ์: ต้องเป็น CAPTAIN / MANAGER / COACH ที่ ACTIVE ของทีมใดทีมหนึ่งในแมตช์นี้
  const { data: memberships, error: memberError } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('player_id', player.id)
    .eq('status', 'ACTIVE')
    .in('team_id', cleanIds(ctx.match.team_a_id, ctx.match.team_b_id))
    .in('role', ['CAPTAIN', 'MANAGER', 'COACH']);

  if (memberError || !memberships || memberships.length === 0) {
    return NextResponse.json({ error: 'FORBIDDEN: Must be Captain, Manager, or Coach' }, { status: 403 });
  }
  const side = memberships[0].team_id === ctx.match.team_a_id ? 'A' : 'B';

  // 3) ตรวจตามลำดับใน veto_format (ตาของทีม, ชนิด action, แมพใน Pool, แมพซ้ำ)
  const check = validateAction(ctx.config, ctx.pool, ctx.rows, { side, action, mapName }, ctx.vetoStartMs);
  if (!check.ok) {
    return NextResponse.json({ error: `${check.code}: ${check.message}` }, { status: check.httpStatus });
  }

  const { data: newVeto, error: insertErr } = await admin
    .from('map_vetoes')
    .insert(
      asInsert<'map_vetoes'>({
        match_id: matchId,
        step_order: check.step.step,
        action: check.step.action,
        team_id: teamIdForSide(check.step.team, ctx.match.team_a_id, ctx.match.team_b_id),
        map_name: check.mapName,
        was_auto: false,
        deadline_at: check.deadlineMs === null ? null : new Date(check.deadlineMs).toISOString(),
      })
    )
    .select()
    .single();

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json({ error: 'STEP_ALREADY_TAKEN: สเต็ปนี้ถูกบันทึกไปแล้ว' }, { status: 409 });
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // 4) เติม DECIDER อัตโนมัติและปิด Veto (VETO -> LIVE) ถ้าถึงสเต็ปสุดท้าย
  const after = await resolveVetoProgress(admin, matchId);

  return NextResponse.json(
    { ...newVeto, veto_complete: Boolean(after?.complete), match_status: after?.status ?? ctx.match.status },
    { status: 201 }
  );
}
