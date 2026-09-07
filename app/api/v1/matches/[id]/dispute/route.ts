import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CreateDisputeSchema } from '@/types/dispute-ops';

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
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนยื่นข้อพิพาท' } },
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

    const parseResult = CreateDisputeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }
    const { category, title, description, evidenceUrls } = parseResult.data;

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
        { error: { code: 'MATCH_NOT_FOUND', message: 'ไม่พบข้อมูลแมตช์การแข่งขันที่ระบุ' } },
        { status: 404 }
      );
    }

    if (!['LIVE', 'PAUSED', 'AWAITING_RESULT'].includes(match.status)) {
      return NextResponse.json(
        { error: { code: 'INVALID_DISPUTE_STATE', message: 'ไม่สามารถยื่นข้อพิพาทได้ในสถานะแมตช์ปัจจุบัน' } },
        { status: 422 }
      );
    }

    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('player_id', player.id)
      .eq('status', 'ACTIVE')
      .in('team_id', [match.team_a_id, match.team_b_id])
      .in('role', ['CAPTAIN', 'MANAGER', 'OWNER']);

    if (memberError || !member || member.length === 0) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED_TEAM_ROLE', message: 'สิทธิ์ในการยื่นข้อพิพาทจำกัดเฉพาะกัปตันหรือผู้จัดการทีมเท่านั้น' } },
        { status: 403 }
      );
    }

    const callerTeamId = member[0].team_id;
    const againstTeamId = callerTeamId === match.team_a_id ? match.team_b_id : match.team_a_id;

    const { data: dispute, error: insertErr } = await supabase
      .from('disputes')
      .insert({
        match_id: matchId,
        filed_by: player.id,
        filed_by_team_id: callerTeamId,
        against_team_id: againstTeamId,
        category,
        title,
        description,
        evidence_urls: evidenceUrls,
        status: 'OPEN',
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json(
        { error: { code: 'DISPUTE_FILING_FAILED', message: insertErr.message } },
        { status: 500 }
      );
    }

    const adminSupabase = createAdminClient();

    await adminSupabase
      .from('matches')
      .update({ status: 'DISPUTED', updated_at: new Date().toISOString() })
      .eq('id', matchId);

    await adminSupabase.from('match_state_transitions').insert({
      match_id: matchId,
      from_status: match.status,
      to_status: 'DISPUTED',
      trigger_source: 'PLAYER',
      actor_id: player.id,
      reason: `Dispute filed: ${title}`,
    });

    await adminSupabase.channel(`match-lobby-${matchId}`).send({
      type: 'broadcast',
      event: 'match_status_changed',
      payload: { status: 'DISPUTED' },
    });

    return NextResponse.json(
      { success: true, dispute_number: dispute.dispute_number, next_status: 'DISPUTED' },
      { status: 201 }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
