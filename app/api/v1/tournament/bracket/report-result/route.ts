import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface ReportResultRequestBody {
  matchId: string;
  winnerTeamId: string;
  scoreA?: number;
  scoreB?: number;
  tournamentId?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReportResultRequestBody;
    const { matchId, winnerTeamId, scoreA = 0, scoreB = 0, tournamentId } = body;

    if (!matchId || !winnerTeamId) {
      return NextResponse.json(
        { error: 'Missing required parameters: matchId, winnerTeamId' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. ดึงข้อมูล Node การแข่งขันปัจจุบัน
    const { data: matchNode, error: fetchErr } = await supabase
      .from('bracket_nodes')
      .select('*')
      .eq('id', matchId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    // Fallback: ถ้าไม่พบใน bracket_nodes ให้ตรวจสอบในตาราง matches
    if (!matchNode) {
      const { data: matchRow, error: matchFetchErr } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .maybeSingle();

      if (matchFetchErr || !matchRow) {
        return NextResponse.json(
          { error: 'Match or bracket node not found' },
          { status: 404 }
        );
      }

      // อัปเดตผลในตาราง matches
      const { error: updateMatchErr } = await supabase
        .from('matches')
        .update({
          score_a: scoreA,
          score_b: scoreB,
          winner_team_id: winnerTeamId,
          status: 'COMPLETED',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      if (updateMatchErr) {
        return NextResponse.json({ error: updateMatchErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Match result updated successfully in matches table',
        matchId,
        winnerTeamId,
      });
    }

    // 2. ตรวจสอบว่าผู้ชนะเป็นหนึ่งในทีมที่ลงแข่งจริง
    const teamAId = matchNode.team_a_id;
    const teamBId = matchNode.team_b_id;

    if (winnerTeamId !== teamAId && winnerTeamId !== teamBId) {
      return NextResponse.json(
        { error: 'winnerTeamId does not belong to this match' },
        { status: 422 }
      );
    }

    const loserTeamId = winnerTeamId === teamAId ? teamBId : teamAId;

    // 3. อัปเดต Node ปัจจุบันเป็น COMPLETED
    const { error: updateCurrentErr } = await supabase
      .from('bracket_nodes')
      .update({
        status: 'COMPLETED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId);

    if (updateCurrentErr) {
      return NextResponse.json({ error: updateCurrentErr.message }, { status: 500 });
    }

    // 4. ส่งทีมผู้ชนะไปยัง Winner Node ถัดไป (Auto-Advance)
    if (matchNode.winner_to_node_id) {
      const targetSlot = matchNode.winner_to_slot === 'B' ? 'team_b_id' : 'team_a_id';
      await supabase
        .from('bracket_nodes')
        .update({
          [targetSlot]: winnerTeamId,
          status: 'READY',
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchNode.winner_to_node_id);
    }

    // 5. ส่งทีมผู้แพ้ไปยัง Lower Bracket Node (Double Elimination)
    if (matchNode.loser_to_node_id && loserTeamId) {
      const targetSlot = matchNode.loser_to_slot === 'B' ? 'team_b_id' : 'team_a_id';
      await supabase
        .from('bracket_nodes')
        .update({
          [targetSlot]: loserTeamId,
          status: 'READY',
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchNode.loser_to_node_id);
    }

    // 6. บันทึกผลลงใน matches ควบคู่กัน (ถ้ามี record)
    await supabase
      .from('matches')
      .update({
        score_a: scoreA,
        score_b: scoreB,
        winner_team_id: winnerTeamId,
        status: 'COMPLETED',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('bracket_node_id', matchId);

    return NextResponse.json({
      success: true,
      message: 'Match result processed and bracket advanced successfully',
      matchId,
      winnerTeamId,
      tournamentId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
