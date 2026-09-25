import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireBroadcastRole } from '@/lib/auth/require-broadcast-role';
import { loadSeriesState } from '@/lib/overlay/match-series';
import { WinConditionEnum } from '@/lib/overlay/telemetry-schema';
import { asUpdate } from '@/types/supabase-helpers';

// Manual round recording for broadcast staff. Writes through the same RPC and idempotency-key
// format as /telemetry, so a round already reported by Spectra/OCR is never inserted twice.
// The RPC only writes match_rounds, so rounds_won_a/b is bumped here (guarded against lost updates).
const EDITABLE_STATUSES = ['LIVE', 'PAUSED', 'AWAITING_RESULT'];

const RecordSchema = z.object({
  winner_team_id: z.string().uuid(),
  win_condition: WinConditionEnum.optional(),
});

type RpcResult = { success: boolean; message?: string; error?: string; round_id?: string; is_duplicate?: boolean };

const fail = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status });

async function loadEditableState(matchId: string) {
  const admin = createAdminClient();
  const state = await loadSeriesState(admin, matchId);
  if (!state) return { error: fail(404, 'MATCH_NOT_FOUND', 'ไม่พบข้อมูลแมตช์') } as const;
  if (!EDITABLE_STATUSES.includes(String(state.match.status))) {
    return { error: fail(422, 'MATCH_NOT_EDITABLE', `บันทึกผลรอบได้เฉพาะสถานะ ${EDITABLE_STATUSES.join(' / ')} (ตอนนี้ ${state.match.status})`) } as const;
  }
  if (!state.currentGameNumber) return { error: fail(422, 'SERIES_OVER', 'ซีรีส์จบแล้ว ไม่มีแมพที่กำลังแข่ง') } as const;
  return { admin, state, gameNumber: state.currentGameNumber } as const;
}

// Compare-and-set so two staff clicking at once can't silently overwrite each other's score.
async function setRoundsWon(
  admin: ReturnType<typeof createAdminClient>,
  matchId: string,
  from: { a: number; b: number },
  to: { a: number; b: number }
) {
  const { data } = await admin
    .from('matches')
    .update(asUpdate<'matches'>({ rounds_won_a: to.a, rounds_won_b: to.b, updated_at: new Date().toISOString() }))
    .eq('id', matchId)
    .eq('rounds_won_a', from.a)
    .eq('rounds_won_b', from.b)
    .select('rounds_won_a, rounds_won_b');
  return data && data.length === 1 ? data[0] : null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id: matchId } = await params;
    const auth = await requireBroadcastRole(await createClient());
    if (!auth.ok) return auth.response;

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return fail(400, 'BAD_REQUEST', 'รูปแบบ JSON Payload ไม่ถูกต้อง');
    }
    const parsed = RecordSchema.safeParse(rawBody);
    if (!parsed.success) return fail(400, 'VALIDATION_ERROR', 'ต้องระบุ winner_team_id (uuid) และ win_condition ถ้ามีต้องเป็นค่าที่ระบบรองรับ');

    const loaded = await loadEditableState(matchId);
    if ('error' in loaded) return loaded.error;
    const { admin, state, gameNumber } = loaded;

    const { winner_team_id, win_condition } = parsed.data;
    const teamAId = state.match.team_a_id;
    const teamBId = state.match.team_b_id;
    if (winner_team_id !== teamAId && winner_team_id !== teamBId) {
      return fail(422, 'INVALID_WINNER', 'winner_team_id ไม่ใช่ทีมในแมตช์นี้');
    }

    const a = state.match.rounds_won_a ?? 0;
    const b = state.match.rounds_won_b ?? 0;
    const roundNumber = a + b + 1;

    const { data: rpcData, error: rpcError } = await admin.rpc('record_match_round_event', {
      p_match_id: matchId,
      p_game_number: gameNumber,
      p_round_number: roundNumber,
      p_winner_team_id: winner_team_id,
      p_win_condition: win_condition ?? 'elimination',
      p_idempotency_key: `round-${matchId}-${gameNumber}-${roundNumber}`,
    });
    const rpc = rpcData as RpcResult | null;
    if (rpcError || !rpc?.success) {
      return fail(500, 'RECORD_FAILED', rpcError?.message || rpc?.error || 'บันทึกผลรอบไม่สำเร็จ');
    }

    // Round already reported (e.g. by Spectra/OCR): only accept it if the winner agrees.
    if (rpc.is_duplicate) {
      const { data: existing } = await admin
        .from('match_rounds')
        .select('winner_team_id')
        .eq('match_id', matchId)
        .eq('game_number', gameNumber)
        .eq('round_number', roundNumber)
        .maybeSingle();
      if (existing && existing.winner_team_id !== winner_team_id) {
        return fail(409, 'ROUND_CONFLICT', `รอบ ${roundNumber} ถูกบันทึกไว้แล้วว่าอีกทีมชนะ — กด "ย้อนรอบล่าสุด" ก่อนถ้าต้องการแก้`);
      }
    }

    const next = winner_team_id === teamAId ? { a: a + 1, b } : { a, b: b + 1 };
    const updated = await setRoundsWon(admin, matchId, { a, b }, next);
    if (!updated) return fail(409, 'SCORE_CHANGED', 'สกอร์รอบเพิ่งถูกแก้จากอีกเครื่อง — รีเฟรชแล้วลองใหม่');

    return NextResponse.json(
      { game_number: gameNumber, round_number: roundNumber, rounds_won_a: updated.rounds_won_a, rounds_won_b: updated.rounds_won_b },
      { status: 201 }
    );
  } catch (error: unknown) {
    return fail(500, 'SERVER_ERROR', error instanceof Error ? error.message : 'Internal Server Error');
  }
}

// Undo the latest recorded round of the current map (row + its point on the scoreboard).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id: matchId } = await params;
    const auth = await requireBroadcastRole(await createClient());
    if (!auth.ok) return auth.response;

    const loaded = await loadEditableState(matchId);
    if ('error' in loaded) return loaded.error;
    const { admin, state, gameNumber } = loaded;

    const { data: last } = await admin
      .from('match_rounds')
      .select('id, round_number, winner_team_id')
      .eq('match_id', matchId)
      .eq('game_number', gameNumber)
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!last) return fail(404, 'NO_ROUND', 'ยังไม่มีรอบที่บันทึกไว้ในแมพนี้');

    const a = state.match.rounds_won_a ?? 0;
    const b = state.match.rounds_won_b ?? 0;
    const next = {
      a: last.winner_team_id === state.match.team_a_id ? Math.max(0, a - 1) : a,
      b: last.winner_team_id === state.match.team_b_id ? Math.max(0, b - 1) : b,
    };

    const { error: delError } = await admin.from('match_rounds').delete().eq('id', last.id);
    if (delError) return fail(500, 'DELETE_FAILED', delError.message);

    const updated = await setRoundsWon(admin, matchId, { a, b }, next);
    if (!updated) return fail(409, 'SCORE_CHANGED', 'ลบผลรอบแล้ว แต่สกอร์รอบเพิ่งถูกแก้จากอีกเครื่อง — ตรวจสกอร์อีกครั้ง');

    return NextResponse.json({ removed_round: last.round_number, rounds_won_a: updated.rounds_won_a, rounds_won_b: updated.rounds_won_b });
  } catch (error: unknown) {
    return fail(500, 'SERVER_ERROR', error instanceof Error ? error.message : 'Internal Server Error');
  }
}
