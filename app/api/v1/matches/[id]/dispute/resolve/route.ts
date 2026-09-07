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

    // 1. Validation: Idempotency Key
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'ต้องแนบ Idempotency-Key header มาด้วย' } },
        { status: 400 }
      );
    }

    // 2. Auth & Player Profile Check
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

    // 3. Permission Gate: Role Verification
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

    // 4. Payload Parsing & Schema Validation
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

    const {
      disputeId,
      winnerTeamId,
      scoreA,
      scoreB,
      roundsWonA,
      roundsWonB,
      resolutionNotes,
      penalty
    } = parseResult.data;

    const adminSupabase = createAdminClient();
    const nowISO = new Date().toISOString();

    // 5. Idempotency Check
    const { data: dup } = await supabase
      .from('match_state_transitions')
      .select('id')
      .eq('match_id', matchId)
      .contains('state_snapshot', { idempotency_key: idempotencyKey })
      .maybeSingle();

    if (dup) {
      const { data: matchState } = await supabase.from('matches').select('*').eq('id', matchId).single();
      return NextResponse.json({
        success: true,
        message: 'Already processed (Idempotency Locked)',
        data: matchState
      });
    }

    // 6. Match Status Verification
    const { data: match } = await supabase
      .from('matches')
      .select('status')
      .eq('id', matchId)
      .single();

    if (!match || match.status !== 'DISPUTED') {
      return NextResponse.json(
        { error: { code: 'MATCH_NOT_DISPUTED', message: 'แมตช์นี้ไม่ได้อยู่ในสถานะข้อพิพาทที่รอการชี้ขาด' } },
        { status: 422 }
      );
    }

    // 7. Update Disputes (ERD Table 2.16 - dispute_status_type: RESOLVED)
    const { error: disputeErr } = await adminSupabase
      .from('disputes')
      .update({
        status: 'RESOLVED',
        resolved_by: player.id,
        resolved_at: nowISO,
        resolution: resolutionNotes,
        updated_at: nowISO,
      })
      .eq('id', disputeId);

    if (disputeErr) throw new Error(`Dispute resolve failed: ${disputeErr.message}`);

    // 8. Record Match Decision & Penalties (ERD Table 2.23 - match_decisions)
    if (penalty?.penaltyType) {
      const penaltyEffects = {
        penalized_player_id: penalty.penalizedPlayerId ?? null,
        penalized_team_id: penalty.penalizedTeamId ?? null,
        penalty_type: penalty.penaltyType,
        ap_fine_amount: penalty.apFineAmount ?? 0,
        zp_deduction_amount: penalty.zpDeductionAmount ?? 0,
        suspension_days: penalty.suspensionDays ?? 0,
        suspended_until: penalty.suspensionDays
          ? new Date(Date.now() + penalty.suspensionDays * 86400000).toISOString()
          : null,
      };

      const { error: decisionErr } = await adminSupabase
        .from('match_decisions')
        .insert({
          match_id: matchId,
          dispute_id: disputeId,
          decision_type: 'PENALTY',
          decided_by: player.id,
          reason: penalty.notes ?? resolutionNotes,
          effects: penaltyEffects,
          created_at: nowISO,
        });

      if (decisionErr) throw new Error(`Decision recording failed: ${decisionErr.message}`);

      // Call RPC for AP fine deduction if applicable
      if (penalty.penalizedPlayerId && (penalty.apFineAmount ?? 0) > 0) {
        const { error: fineErr } = await adminSupabase.rpc('deduct_player_ap_fine', {
          p_player_id: penalty.penalizedPlayerId,
          p_amount: penalty.apFineAmount,
          p_reason: `Dispute Penalty: ${penalty.notes ?? resolutionNotes}`,
        });
        if (fineErr) console.error('AP fine RPC warning:', fineErr.message);
      }

      // Update Athlete Status if suspended/banned
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

    // 9. Finalize Match State
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

    // 10. Advance Bracket Node (RPC Call)
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

    // 11. Log State Transition & Audit Log
    await adminSupabase.from('match_state_transitions').insert({
      match_id: matchId,
      from_status: 'DISPUTED',
      to_status: 'COMPLETED',
      trigger_source: 'ADMIN',
      actor_id: player.id,
      reason: 'Dispute resolved by Referee Overwrite.',
      state_snapshot: {
        winner_team_id: winnerTeamId,
        score_a: scoreA,
        score_b: scoreB,
        idempotency_key: idempotencyKey,
      },
    });

    await adminSupabase.from('audit_logs').insert({
      actor_id: player.id,
      action: 'UPDATE',
      entity_type: 'matches',
      entity_id: matchId,
      reason: 'DISPUTE_RESOLUTION_OVERWRITE',
      after_data: { winner_team_id: winnerTeamId, score_a: scoreA, score_b: scoreB },
    });

    // 12. Realtime Broadcast
    await adminSupabase.channel(`match-realtime-${matchId}`).send({
      type: 'broadcast',
      event: 'match_completed',
      payload: { match_id: matchId, winner_team_id: winnerTeamId },
    });

    return NextResponse.json(
      { success: true, message: 'ชี้ขาดข้อพิพาท บันทึกคำตัดสิน และเดินสาย Bracket เรียบร้อย', data: updatedMatch },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
