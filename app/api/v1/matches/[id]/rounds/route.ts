import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireBroadcastRole } from '@/lib/auth/require-broadcast-role';
import { loadSeriesState } from '@/lib/overlay/match-series';
import { asUpdate } from '@/types/supabase-helpers';

// สกอร์รอบของเกม (แมพ) ที่กำลังแข่ง — ผู้คุมการถ่ายทอด (REFEREE/ADMIN/SUPER_ADMIN) กรอกจาก Spectator Control
// Overlay รับค่าใหม่ผ่าน Supabase Realtime (matches) ทันที
const EDITABLE_STATUSES = ['LIVE', 'PAUSED', 'AWAITING_RESULT'];

const RoundsSchema = z.object({
  rounds_won_a: z.number().int().min(0).max(50),
  rounds_won_b: z.number().int().min(0).max(50),
});

// สถานะปัจจุบันของซีรีส์ สำหรับแผงควบคุม (อ่านอย่างเดียว)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id: matchId } = await params;
  const state = await loadSeriesState(createAdminClient(), matchId);
  if (!state) {
    return NextResponse.json({ error: { code: 'MATCH_NOT_FOUND', message: 'ไม่พบข้อมูลแมตช์' } }, { status: 404 });
  }

  return NextResponse.json({
    match_id: matchId,
    status: state.match.status,
    best_of: state.totalGames,
    rounds_won_a: state.match.rounds_won_a,
    rounds_won_b: state.match.rounds_won_b,
    maps_won_a: state.winsA,
    maps_won_b: state.winsB,
    wins_needed: state.winsNeeded,
    completed_games: state.completedCount,
    series_over: state.seriesOver,
    current_game_number: state.currentGameNumber,
    current_map_name: state.currentMapName,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: matchId } = await params;
    const supabase = await createClient();

    const auth = await requireBroadcastRole(supabase);
    if (!auth.ok) return auth.response;

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ขาเข้าไม่ถูกต้อง' } }, { status: 400 });
    }

    const parsed = RoundsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'สกอร์รอบต้องเป็นจำนวนเต็ม 0–50', details: parsed.error.format() } },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: match } = await admin.from('matches').select('id, status').eq('id', matchId).maybeSingle();
    if (!match) {
      return NextResponse.json({ error: { code: 'MATCH_NOT_FOUND', message: 'ไม่พบข้อมูลแมตช์' } }, { status: 404 });
    }
    if (!EDITABLE_STATUSES.includes(String(match.status))) {
      return NextResponse.json(
        { error: { code: 'MATCH_NOT_EDITABLE', message: `แก้สกอร์รอบได้เฉพาะสถานะ ${EDITABLE_STATUSES.join(' / ')} (ตอนนี้ ${match.status})` } },
        { status: 422 }
      );
    }

    const { data: updated, error } = await admin
      .from('matches')
      .update(asUpdate<'matches'>({ ...parsed.data, updated_at: new Date().toISOString() }))
      .eq('id', matchId)
      .select('rounds_won_a, rounds_won_b')
      .single();

    if (error) {
      return NextResponse.json({ error: { code: 'TRANSACTION_FAILED', message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ rounds_won_a: updated.rounds_won_a, rounds_won_b: updated.rounds_won_b });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
