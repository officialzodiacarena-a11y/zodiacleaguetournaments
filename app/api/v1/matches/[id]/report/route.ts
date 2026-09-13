import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cleanIds } from '@/types/supabase-helpers';

const TeamResultReportSchema = z.object({
  winnerTeamId: z.string().uuid({ message: 'winnerTeamId ต้องเป็น UUID ที่ถูกต้อง' }),
  scoreA: z.number().int().min(0).max(3, { message: 'คะแนนทีม A เกินโควตา Best of 5' }),
  scoreB: z.number().int().min(0).max(3, { message: 'คะแนนทีม B เกินโควตา Best of 5' }),
  evidenceUrls: z.array(z.string().url({ message: 'URL รูปภาพหลักฐานไม่ถูกต้อง' })).min(1, { message: 'ต้องแนบรูปสกรีนช็อตหลักฐานอย่างน้อย 1 ใบ' }),
  note: z.string().max(300, { message: 'หมายเหตุห้ามยาวเกิน 300 ตัวอักษร' }).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const matchId = resolvedParams.id;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' } },
        { status: 401 }
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

    const parseResult = TeamResultReportSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { winnerTeamId, scoreA, scoreB, evidenceUrls, note } = parseResult.data;

    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!player) {
      return NextResponse.json(
        { error: { code: 'PLAYER_NOT_FOUND', message: 'ไม่พบโปรไฟล์ผู้เล่นของบัญชีนี้' } },
        { status: 404 }
      );
    }

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json(
        { error: { code: 'MATCH_NOT_FOUND', message: 'ไม่พบข้อมูลแมตช์แข่งขันบนระบบ' } },
        { status: 404 }
      );
    }

    if (match.status !== 'AWAITING_RESULT') {
      return NextResponse.json(
        { error: { code: 'MATCH_NOT_AWAITING_RESULT', message: 'สล็อตแมตช์นี้ไม่ได้อยู่ในช่วงรายงานผลการแข่งขัน' } },
        { status: 422 }
      );
    }

    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('player_id', player.id)
      .eq('status', 'ACTIVE')
      .in('team_id', cleanIds(match.team_a_id, match.team_b_id))
      .in('role', ['CAPTAIN', 'MANAGER', 'OWNER']);

    if (memberError || !member || member.length === 0) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED_TEAM_ROLE', message: 'สิทธิ์ในการส่งรายงานคะแนนจำกัดเฉพาะกัปตันหรือผู้จัดการทีมเท่านั้น' } },
        { status: 403 }
      );
    }

    const callerTeamId = member[0].team_id;
    if (winnerTeamId !== match.team_a_id && winnerTeamId !== match.team_b_id) {
      return NextResponse.json(
        { error: { code: 'INVALID_WINNER_ID', message: 'ไอดีผู้ชนะที่คุณเลือกไม่ตรงกับคู่แข่งขัน' } },
        { status: 422 }
      );
    }

    const adminSupabase = createAdminClient();
    const nowISO = new Date().toISOString();

    const { error: reportError } = await adminSupabase
      .from('match_reports')
      .upsert({
        match_id: matchId,
        reported_by_team: callerTeamId,
        reported_by_user: player.id,
        winner_team_id: winnerTeamId,
        score_a: scoreA,
        score_b: scoreB,
        evidence_urls: evidenceUrls,
        note: note || '',
        updated_at: nowISO,
      }, { onConflict: 'match_id,reported_by_team' });

    if (reportError) {
      return NextResponse.json(
        { error: { code: 'UPSERT_REPORT_FAILED', message: reportError.message } },
        { status: 500 }
      );
    }

    const { data: siblingReports, error: siblingsFetchError } = await adminSupabase
      .from('match_reports')
      .select('*')
      .eq('match_id', matchId);

    let autoConfirmTriggered = false;
    if (!siblingsFetchError && siblingReports && siblingReports.length === 2) {
      const [report1, report2] = siblingReports;

      if (
        report1.winner_team_id === report2.winner_team_id &&
        report1.score_a === report2.score_a &&
        report1.score_b === report2.score_b
      ) {
        autoConfirmTriggered = true;

        const { error: matchCompletedError } = await adminSupabase
          .from('matches')
          .update({
            status: 'COMPLETED',
            winner_team_id: report1.winner_team_id,
            score_a: report1.score_a,
            score_b: report1.score_b,
            outcome: 'NORMAL',
            result_source: 'PLAYER_REPORT',
            result_confirmed_at: nowISO,
            ended_at: nowISO,
            updated_at: nowISO,
          })
          .eq('id', matchId);

        if (!matchCompletedError) {
          await adminSupabase.from('match_state_transitions').insert({
            match_id: matchId,
            from_status: 'AWAITING_RESULT',
            to_status: 'COMPLETED',
            trigger_source: 'PLAYER',
            actor_id: player.id,
            reason: 'Auto-confirmed: both teams reported matching scores',
            state_snapshot: { winner_team_id: report1.winner_team_id, score_a: report1.score_a, score_b: report1.score_b },
          });

          await adminSupabase.channel(`match-realtime-${matchId}`).send({
            type: 'broadcast',
            event: 'match_completed',
            payload: { match_id: matchId, winner_team_id: report1.winner_team_id },
          });
        }
      }
    }

    return NextResponse.json({
      match_id: matchId,
      team_id: callerTeamId,
      reported_at: nowISO,
      both_teams_reported: Boolean(siblingReports && siblingReports.length === 2),
      auto_confirmed: autoConfirmTriggered,
      next_status: autoConfirmTriggered ? 'COMPLETED' : 'AWAITING_OPPONENT_REPORT',
    }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
