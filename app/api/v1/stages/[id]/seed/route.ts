// POST /api/v1/stages/:id/seed
// T2.2-A05 — validate teams, generate the bracket, move the stage into SEEDING.
//
// Spec ambiguity, resolved explicitly (flagging this, not hiding it): the
// business rules in Sprint2.2_Spec.md 2.2.B say this call requires the stage
// to already be status = SEEDING ("422 STAGE_NOT_IN_SEEDING"), but the task
// table for T2.2-A05 itself says this endpoint's own job is to "set stage
// status -> SEEDING". Those two can't both be true. This implementation
// follows the task description: precondition is PENDING, and a successful
// call is what moves the stage to SEEDING (matching the documented
// PENDING -> SEEDING -> ACTIVE -> COMPLETED flow from 2.2.A). The error code
// for the precondition failure is STAGE_NOT_PENDING, not the spec's
// STAGE_NOT_IN_SEEDING, because that name only makes sense under the other
// reading. Flag this to product/spec owner if the intent was reversed.
//
// Only SINGLE_ELIMINATION is implemented here (lib/tournament/
// generateSingleEliminationBracket.ts) -- Double Elimination (T2.2-B03) and
// Round Robin/Group Stage (T2.2-B04) generators don't exist yet, so those
// formats are rejected with UNSUPPORTED_STAGE_FORMAT rather than silently
// mishandled.
//
// "Teams are CHECKED_IN" (per spec) is checked against
// tournament_registrations.status = 'APPROVED' -- the deployed
// tournament_registrations enum (PENDING/ELIGIBLE/APPROVED/REJECTED, from
// Sprint 2.1) has no CHECKED_IN value at all, and no Sprint 2.2 task adds a
// check-in step, so there is nothing else it could mean yet. APPROVED is the
// closest existing signal for "this team is confirmed for the tournament."

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { planSingleEliminationBracket, type SeededTeam } from '@/lib/tournament/generateSingleEliminationBracket';

function bestOfForRound(bestOfConfig: unknown, roundNumber: number, totalRounds: number): number {
  const config = (bestOfConfig ?? {}) as Record<string, unknown>;
  const pick = (key: string): number | null => {
    const v = config[key];
    return typeof v === 'number' && v > 0 ? v : null;
  };
  if (roundNumber === totalRounds) return pick('final') ?? pick('default') ?? 1;
  if (roundNumber === totalRounds - 1) return pick('semifinal') ?? pick('default') ?? 1;
  return pick('default') ?? 1;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: stageId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'กรุณาเข้าสู่ระบบก่อน' } },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'invalid JSON body' } }, { status: 400 });
  }

  const rawSeededTeams = body.seeded_teams;
  if (!Array.isArray(rawSeededTeams) || rawSeededTeams.length < 2) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'seeded_teams must be an array of at least 2 { team_id, seed }' } },
      { status: 400 }
    );
  }

  const seededTeams: SeededTeam[] = [];
  const seenSeeds = new Set<number>();
  for (const entry of rawSeededTeams) {
    const e = entry as Record<string, unknown>;
    if (typeof e.team_id !== 'string' || typeof e.seed !== 'number' || !Number.isInteger(e.seed) || e.seed <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'each seeded_teams entry needs a string team_id and a positive integer seed' } },
        { status: 400 }
      );
    }
    if (seenSeeds.has(e.seed)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `duplicate seed number: ${e.seed}` } },
        { status: 400 }
      );
    }
    seenSeeds.add(e.seed);
    seededTeams.push({ team_id: e.team_id, seed: e.seed });
  }

  const { data: stage } = await supabase
    .from('tournament_stages')
    .select('id, tournament_id, status, format, teams_in, best_of_config')
    .eq('id', stageId)
    .maybeSingle();

  if (!stage) {
    return NextResponse.json({ error: { code: 'STAGE_NOT_FOUND', message: 'ไม่พบ stage นี้' } }, { status: 404 });
  }

  if (stage.status !== 'PENDING') {
    return NextResponse.json(
      {
        error: {
          code: 'STAGE_NOT_PENDING',
          message: 'seed ได้เฉพาะตอน stage ยังเป็นสถานะ PENDING',
          details: { current_status: stage.status },
        },
      },
      { status: 422 }
    );
  }

  if (stage.format !== 'SINGLE_ELIMINATION') {
    return NextResponse.json(
      {
        error: {
          code: 'UNSUPPORTED_STAGE_FORMAT',
          message: `ยังไม่รองรับ bracket generator สำหรับ ${stage.format} (มีแค่ SINGLE_ELIMINATION ตอนนี้)`,
        },
      },
      { status: 422 }
    );
  }

  if (stage.teams_in !== null && seededTeams.length !== stage.teams_in) {
    return NextResponse.json(
      {
        error: {
          code: 'TEAM_COUNT_MISMATCH',
          message: `จำนวนทีมที่ seed (${seededTeams.length}) ไม่ตรงกับ teams_in ของ stage (${stage.teams_in})`,
        },
      },
      { status: 422 }
    );
  }

  const { count: existingNodeCount } = await supabase
    .from('bracket_nodes')
    .select('id', { count: 'exact', head: true })
    .eq('stage_id', stageId);
  if (existingNodeCount && existingNodeCount > 0) {
    return NextResponse.json(
      { error: { code: 'BRACKET_ALREADY_GENERATED', message: 'Bracket ของ stage นี้ถูก generate ไปแล้ว' } },
      { status: 409 }
    );
  }

  // tournament_registrations RLS only lets a caller read their OWN team's
  // registration (registrations_team_read) -- an Org Admin checking every
  // competing team's approval status is a legitimate cross-team read that
  // policy doesn't cover, so this specific lookup needs the admin client.
  const teamIds = seededTeams.map((t) => t.team_id);
  const admin = createAdminClient();
  const { data: approvedRegs } = await admin
    .from('tournament_registrations')
    .select('team_id')
    .eq('tournament_id', stage.tournament_id)
    .eq('status', 'APPROVED')
    .in('team_id', teamIds);

  const approvedTeamIds = new Set((approvedRegs ?? []).map((r) => r.team_id));
  const notApproved = teamIds.filter((id) => !approvedTeamIds.has(id));
  if (notApproved.length > 0) {
    return NextResponse.json(
      {
        error: {
          code: 'TEAM_NOT_CHECKED_IN',
          message: 'มีทีมที่ยังไม่ได้รับการอนุมัติ (APPROVED) เข้าทัวร์นาเมนต์นี้',
          details: { team_ids: notApproved },
        },
      },
      { status: 422 }
    );
  }

  const rounds = planSingleEliminationBracket(seededTeams);
  const totalRounds = rounds.length;

  // Phase 1: insert every node with only its self-contained fields, keep
  // track of (round,position) -> id so phase 2 can wire cross-round links
  // in either direction regardless of insert order.
  const idByRoundPosition = new Map<string, string>();
  const insertedIds: string[] = [];
  let updatedStage: { id: string; status: string };

  try {
    for (const round of rounds) {
      for (const node of round) {
        const { data: inserted, error } = await supabase
          .from('bracket_nodes')
          .insert({
            stage_id: stageId,
            bracket_type: 'MAIN',
            round_number: node.round_number,
            position_in_round: node.position_in_round,
            team_a_id: node.team_a_id,
            team_b_id: node.team_b_id,
            is_bye: node.is_bye,
            status: node.status,
            best_of: bestOfForRound(stage.best_of_config, node.round_number, totalRounds),
          })
          .select('id')
          .single();

        if (error || !inserted) {
          throw new Error(error?.message ?? 'failed to insert bracket node');
        }
        insertedIds.push(inserted.id);
        idByRoundPosition.set(`${node.round_number}-${node.position_in_round}`, inserted.id);
      }
    }

    // Phase 2: wire winner_to_node_id/slot (child -> parent) and
    // source_a/b_node_id (parent -> child) now that every id is known.
    for (const round of rounds) {
      for (const node of round) {
        const nodeId = idByRoundPosition.get(`${node.round_number}-${node.position_in_round}`)!;
        const patch: Record<string, unknown> = {};

        if (node.winner_to) {
          patch.winner_to_node_id = idByRoundPosition.get(`${node.winner_to.round}-${node.winner_to.position}`) ?? null;
          patch.winner_to_slot = node.winner_to.slot;
        }

        if (node.round_number > 1) {
          const sourceAId = idByRoundPosition.get(`${node.round_number - 1}-${node.position_in_round * 2 - 1}`);
          const sourceBId = idByRoundPosition.get(`${node.round_number - 1}-${node.position_in_round * 2}`);
          if (sourceAId) {
            patch.source_a_node_id = sourceAId;
            patch.source_a_outcome = 'WINNER';
          }
          if (sourceBId) {
            patch.source_b_node_id = sourceBId;
            patch.source_b_outcome = 'WINNER';
          }
        }

        if (Object.keys(patch).length > 0) {
          const { error } = await supabase.from('bracket_nodes').update(patch).eq('id', nodeId);
          if (error) throw new Error(error.message);
        }
      }
    }

    // Flip the stage to SEEDING as part of the same attempt -- if this fails,
    // the compensating cleanup below must still run, otherwise the bracket
    // rows would be committed while the stage stays PENDING, and a retry
    // would immediately hit BRACKET_ALREADY_GENERATED with no way out.
    const { data: stageUpdateData, error: stageUpdateError } = await supabase
      .from('tournament_stages')
      .update({ status: 'SEEDING' })
      .eq('id', stageId)
      .select('id, status')
      .single();
    if (stageUpdateError || !stageUpdateData) {
      throw new Error(stageUpdateError?.message ?? 'failed to move stage into SEEDING');
    }
    updatedStage = stageUpdateData;
  } catch (err) {
    // Compensating cleanup -- delete everything this call created so a
    // failed generation doesn't leave a half-built bracket behind. Uses
    // admin client since a mid-request RLS/permission hiccup shouldn't
    // block cleanup of rows this same call just wrote.
    if (insertedIds.length > 0) {
      await admin.from('bracket_nodes').delete().in('id', insertedIds);
    }
    const message = err instanceof Error ? err.message : 'failed to generate bracket';
    return NextResponse.json({ error: { code: 'BRACKET_GENERATION_FAILED', message } }, { status: 500 });
  }

  return NextResponse.json(
    {
      data: {
        stage_id: stageId,
        status: updatedStage.status,
        total_rounds: totalRounds,
        node_count: insertedIds.length,
      },
    },
    { status: 201 }
  );
}
