import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ResolveDisputeSchema } from '@/types/dispute-ops';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const matchId = resolvedParams.id;
    const idempotencyKey = req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key');
    const supabase = await createClient();

    if (!idempotencyKey) {
      return NextResponse.json(
        { error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'ต้องแนบ Idempotency-Key header มาด้วย' } },
        { status: 400 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' } },
        { status: 401 }
      );
    }

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

    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('player_id', player.id)
      .is('revoked_at', null)
      .single();

    const allowedRoles = ['REFEREE', 'ADMIN', 'SUPER_ADMIN'];
    if (roleError || !userRole || !allowedRoles.includes(userRole.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN_ROLE', message: 'สิทธิ์ในการชี้ขาดข้อพิพาทจำกัดเฉพาะกรรมการหรือแอดมินระบบเท่านั้น' } },
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

    const parseResult = ResolveDisputeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }
    const { disputeId, winnerTeamId, scoreA, scoreB, roundsWonA, roundsWonB, resolutionNotes, penalty } = parseResult.data;

    const adminSupabase = createAdminClient();
    const nowISO = new Date().toISOString();

    // Idempotency check
    const { data: dup } = await supabase
      .from('match_state_transitions')
      .select('id')
      .eq('match_id', matchId)
      .contains('state_snapshot', { idempotency_key: idempotencyKey })
      .maybeSingle();

    if (dup) {
      const { data: matchState } = await supabase.from('matches').select('*').eq('id', matchId).single();
      return NextResponse.json({ success: true, message: 'Already processed (Idempotency Locked)', data: matchState });
    }

    const { data: match } = await supabase.from('matches').select('status').eq('id', matchId).single();
    if (!match || match.status !== 'DISPUTED') {
      return NextResponse.json(
        { error: { code: 'MATCH_NOT_DISPUTED', message: 'แมตช์นี้ไม่ได้อยู่ในสถานะข้อพิพาทที่รอการชี้ขาด' } },
        { status: 422 }
      );
    }

    // Resolve dispute
    const { error: disputeErr } = await adminSupabase
      .from('disputes')
      .update({ status: 'RESOLVED', resolved_by: player.id, resolved_at: nowISO, resolution: resolutionNotes })
      .eq('id', disputeId);
    if (disputeErr) throw new Error(`Dispute resolve failed: ${disputeErr.message}`);

    // Penalties
    if (penalty?.penaltyType) {
      const { error: penaltyErr } = await adminSupabase.from('penalties').insert({
        player_id: penalty.penalizedPlayerId ?? null,
        team_id: penalty.penalizedTeamId ?? null,
        match_id: matchId,
        dispute_id: disputeId,
        type: penalty.penaltyType,
        ap_fine_amount: penalty.apFineAmount ?? 0,
        zp_deduction_amount: penalty.zpDeductionAmount ?? 0,
        notes: penalty.notes ?? 'ลงโทษวินัยจากการตรวจสอบคดี',
        suspended_until: penalty.suspensionDays
          ? new Date(Date.now() + penalty.suspensionDays * 86400000).toISOString()
          : null,
        created_by: player.id,
      });
      if (penaltyErr) throw new Error(`Penalty failed: ${penaltyErr.message}`);

      if (penalty.penalizedPlayerId && ['ATHLETE_SUSPENSION', 'ATHLETE_BAN'].includes(penalty.penaltyType)) {
        await adminSupabase
          .from('players')
          .update({
            status: penalty.penaltyType === 'ATHLETE_BAN' ? 'BANNED' : 'SUSPENDED',
            suspended_until: penalty.suspensionDays
              ? new Date(Date.now() + penalty.suspensionDays * 86400000).toISOString()
              : null,
            ban_reason: penalty.penaltyType === 'ATHLETE_BAN' ? (penalty.notes ?? resolutionNotes) : null,
            updated_at: nowISO,
          })
          .eq('id', penalty.penalizedPlayerId);
      }
    }

    // Finalize match
    const { data: updatedMatch, error: matchErr } = await adminSupabase
      .from('matches')
      .update({
        status: 'COMPLETED',
        winner_team_id: winnerTeamId,
        score_a: scoreA,
        score_b: scoreB,
        rounds_won_a: roundsWonA,
        rounds_won_b: roundsWonB,
        outcome: 'ADMIN_DECISION',
        result_source: 'ADMIN_OVERRIDE',
        result_confirmed_at: nowISO,
        ended_at: nowISO,
        updated_at: nowISO,
      })
      .eq('id', matchId)
      .select()
      .single();
    if (matchErr) throw new Error(`Match finalize failed: ${matchErr.message}`);

    // Bracket advance — explicit RPC call, must never roll back a resolved dispute
    const { error: bracketErr } = await adminSupabase.rpc('advance_bracket_node', {
      p_match_id: matchId,
      p_winner_team_id: winnerTeamId,
    });
    if (bracketErr) {
      await adminSupabase.from('audit_logs').insert({
        actor_id: player.id,
        action: 'UPDATE',
        entity_type: 'bracket_nodes',
        entity_id: matchId,
        reason: 'BRACKET_ADVANCE_FAILED_MANUAL_REQUIRED',
        after_data: { error: bracketErr.message },
      });
    }

    // State transition log
    await adminSupabase.from('match_state_transitions').insert({
      match_id: matchId,
      from_status: 'DISPUTED',
      to_status: 'COMPLETED',
      trigger_source: 'ADMIN',
      actor_id: player.id,
      reason: 'Dispute resolved by Referee Overwrite.',
      state_snapshot: { winner_team_id: winnerTeamId, score_a: scoreA, score_b: scoreB, idempotency_key: idempotencyKey },
    });

    // Audit log
    await adminSupabase.from('audit_logs').insert({
      actor_id: player.id,
      action: 'UPDATE',
      entity_type: 'matches',
      entity_id: matchId,
      reason: 'DISPUTE_RESOLUTION_OVERWRITE',
      after_data: { winner_team_id: winnerTeamId, score_a: scoreA, score_b: scoreB },
    });

    // Realtime broadcast
    await adminSupabase.channel(`match-realtime-${matchId}`).send({
      type: 'broadcast',
      event: 'match_completed',
      payload: { match_id: matchId, winner_team_id: winnerTeamId },
    });

    return NextResponse.json(
      { success: true, message: 'ชี้ขาดข้อพิพาท บันทึกโทษ และเดินสาย Bracket เรียบร้อย', data: updatedMatch },
      { status: 200 }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
