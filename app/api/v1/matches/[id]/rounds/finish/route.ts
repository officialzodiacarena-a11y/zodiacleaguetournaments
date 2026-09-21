import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireBroadcastRole } from '@/lib/auth/require-broadcast-role';
import { loadSeriesState } from '@/lib/overlay/match-series';
import { asInsert, asUpdate } from '@/types/supabase-helpers';

// จบแมพปัจจุบัน: บันทึกผลเกมจากสกอร์รอบที่กรอกไว้ ลงตาราง match_games แล้วรีเซ็ตสกอร์รอบเป็น 0–0
// - แมพ/เลขเกม มาจากลำดับ Veto และจำนวนเกมที่จบแล้ว (กติกาเดียวกับฉาก Overlay)
// - สถานะแมตช์ LIVE -> AWAITING_RESULT เฉพาะเมื่อซีรีส์ตัดสินผลครบ (ระหว่างซีรีส์คงเป็น LIVE เพราะ DB ไม่ให้กลับจาก AWAITING_RESULT)
// - ตั้งฉาก Overlay เป็น Intermission (จำใน format_config.overlay_scene ผูกกับจำนวนเกมที่จบแล้ว)
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: matchId } = await params;
    const supabase = await createClient();

    const auth = await requireBroadcastRole(supabase);
    if (!auth.ok) return auth.response;

    const admin = createAdminClient();
    const state = await loadSeriesState(admin, matchId);
    if (!state) {
      return NextResponse.json({ error: { code: 'MATCH_NOT_FOUND', message: 'ไม่พบข้อมูลแมตช์' } }, { status: 404 });
    }

    const { match } = state;
    if (match.status !== 'LIVE' && match.status !== 'AWAITING_RESULT') {
      return NextResponse.json(
        { error: { code: 'MATCH_NOT_FINISHABLE', message: `จบแมพได้เฉพาะสถานะ LIVE / AWAITING_RESULT (ตอนนี้ ${match.status}) — ถ้าหยุดพักอยู่ให้กลับเป็น LIVE ก่อน` } },
        { status: 422 }
      );
    }
    if (state.seriesOver || !state.currentGameNumber) {
      return NextResponse.json(
        { error: { code: 'SERIES_ALREADY_DECIDED', message: 'ซีรีส์นี้ตัดสินผลครบแล้ว ไม่มีแมพที่ต้องบันทึกเพิ่ม' } },
        { status: 422 }
      );
    }

    const roundsA = match.rounds_won_a ?? 0;
    const roundsB = match.rounds_won_b ?? 0;
    if (roundsA === roundsB) {
      return NextResponse.json(
        { error: { code: 'TIED_ROUNDS', message: `สกอร์รอบเสมอกัน (${roundsA}–${roundsB}) ยังหาผู้ชนะของแมพนี้ไม่ได้` } },
        { status: 422 }
      );
    }

    const winnerTeamId = roundsA > roundsB ? match.team_a_id : match.team_b_id;
    const nowIso = new Date().toISOString();

    const { error: insertErr } = await admin.from('match_games').insert(
      asInsert<'match_games'>({
        match_id: matchId,
        game_number: state.currentGameNumber,
        map_name: state.currentMapName,
        score_a: roundsA,
        score_b: roundsB,
        winner_team_id: winnerTeamId,
        went_overtime: roundsA >= 12 && roundsB >= 12,
        ended_at: nowIso,
        status: 'COMPLETED',
      })
    );

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json(
          { error: { code: 'GAME_ALREADY_REPORTED', message: 'เกมนี้ถูกบันทึกผลไปแล้ว' } },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: { code: 'TRANSACTION_FAILED', message: insertErr.message } }, { status: 500 });
    }

    const baseConfig =
      match.format_config && typeof match.format_config === 'object' && !Array.isArray(match.format_config)
        ? (match.format_config as Record<string, unknown>)
        : {};

    const winsAfterA = state.winsA + (roundsA > roundsB ? 1 : 0);
    const winsAfterB = state.winsB + (roundsB > roundsA ? 1 : 0);
    const completedAfter = state.completedCount + 1;
    const seriesOverAfter = winsAfterA >= state.winsNeeded || winsAfterB >= state.winsNeeded || completedAfter >= state.totalGames;

    const matchUpdate: Record<string, unknown> = {
      rounds_won_a: 0,
      rounds_won_b: 0,
      updated_at: nowIso,
      format_config: { ...baseConfig, overlay_scene: 'AWAITING_RESULT', overlay_scene_games: completedAfter },
    };
    if (match.status === 'LIVE' && seriesOverAfter) matchUpdate.status = 'AWAITING_RESULT';

    const { error: updateErr } = await admin.from('matches').update(asUpdate<'matches'>(matchUpdate)).eq('id', matchId);
    if (updateErr) {
      return NextResponse.json(
        { error: { code: 'PARTIAL_FAILURE', message: `บันทึกผลเกมแล้ว แต่รีเซ็ตสกอร์รอบ/สถานะไม่สำเร็จ: ${updateErr.message}` } },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        game_number: state.currentGameNumber,
        map_name: state.currentMapName,
        score_a: roundsA,
        score_b: roundsB,
        winner_team_id: winnerTeamId,
        maps_won_a: winsAfterA,
        maps_won_b: winsAfterB,
        series_over: seriesOverAfter,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
