import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { planSingleEliminationBracket, type SeededTeam } from '@/lib/tournament/generateSingleEliminationBracket';
import { planDoubleEliminationBracket, type PlannedDENode } from '@/lib/tournament/generateDoubleEliminationBracket';
import { planRoundRobinBracket } from '@/lib/tournament/generateRoundRobinBracket';

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

function bestOfForDoubleEliminationNode(
  bestOfConfig: unknown,
  node: PlannedDENode,
  upperTotalRounds: number,
  lowerTotalRounds: number
): number {
  const config = (bestOfConfig ?? {}) as Record<string, unknown>;
  const pick = (key: string): number | null => {
    const v = config[key];
    return typeof v === 'number' && v > 0 ? v : null;
  };
  if (node.bracket_type === 'GRAND_FINAL') return pick('final') ?? pick('default') ?? 1;
  if (node.bracket_type === 'UPPER' && node.round_number === upperTotalRounds) {
    return pick('semifinal') ?? pick('default') ?? 1;
  }
  if (node.bracket_type === 'LOWER' && node.round_number === lowerTotalRounds) {
    return pick('semifinal') ?? pick('default') ?? 1;
  }
  return pick('default') ?? 1;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: stageId } = await context.params;
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
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'invalid JSON body' } },
      { status: 400 }
    );
  }

  const rawSeededTeams = body.seeded_teams;
  if (!Array.isArray(rawSeededTeams) || rawSeededTeams.length < 2) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'seeded_teams must be an array of at least 2 { team_id, seed }',
        },
      },
      { status: 400 }
    );
  }

  const seededTeams: SeededTeam[] = [];
  const seenSeeds = new Set<number>();
  for (const entry of rawSeededTeams) {
    const e = entry as Record<string, unknown>;
    if (
      typeof e.team_id !== 'string' ||
      typeof e.seed !== 'number' ||
      !Number.isInteger(e.seed) ||
      e.seed <= 0
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'each seeded_teams entry needs a string team_id and a positive integer seed',
          },
        },
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
    .select('id, tournament_id, status, format, teams_in, best_of_config, format_config')
    .eq('id', stageId)
    .maybeSingle();

  if (!stage) {
    return NextResponse.json(
      { error: { code: 'STAGE_NOT_FOUND', message: 'ไม่พบ stage นี้' } },
      { status: 404 }
    );
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

  const SUPPORTED_FORMATS = ['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'GROUP_STAGE'];
  if (!SUPPORTED_FORMATS.includes(stage.format)) {
    return NextResponse.json(
      {
        error: {
          code: 'UNSUPPORTED_STAGE_FORMAT',
          message: `ยังไม่รองรับ bracket generator สำหรับ ${stage.format} (มีแค่ ${SUPPORTED_FORMATS.join(', ')} ตอนนี้)`,
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

  async function cleanupAndFail(insertedIds: string[], err: unknown, groupLabelTeamIds: string[] = []) {
    if (insertedIds.length > 0) {
      await admin.from('bracket_nodes').delete().in('id', insertedIds);
    }
    if (groupLabelTeamIds.length > 0 && stage) {
      await admin
        .from('tournament_registrations')
        .update({ group_label: null })
        .eq('tournament_id', stage.tournament_id)
        .in('team_id', groupLabelTeamIds);
    }
    const message = err instanceof Error ? err.message : 'failed to generate bracket';
    return NextResponse.json({ error: { code: 'BRACKET_GENERATION_FAILED', message } }, { status: 500 });
  }

  async function moveStageToSeeding(): Promise<{ id: string; status: string }> {
    const { data: stageUpdateData, error: stageUpdateError } = await supabase
      .from('tournament_stages')
      .update({ status: 'SEEDING' })
      .eq('id', stageId)
      .select('id, status')
      .single();

    if (stageUpdateError || !stageUpdateData) {
      throw new Error(stageUpdateError?.message ?? 'failed to move stage into SEEDING');
    }
    return stageUpdateData;
  }

  if (stage.format === 'SINGLE_ELIMINATION') {
    const rounds = planSingleEliminationBracket(seededTeams);
    const totalRounds = rounds.length;

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

      updatedStage = await moveStageToSeeding();
    } catch (err) {
      return cleanupAndFail(insertedIds, err);
    }

    return NextResponse.json(
      {
        data: {
          stage_id: stageId,
          status: updatedStage.status,
          format: stage.format,
          total_rounds: totalRounds,
          node_count: insertedIds.length,
        },
      },
      { status: 201 }
    );
  }

  if (stage.format === 'DOUBLE_ELIMINATION') {
    let plannedNodes: PlannedDENode[];
    try {
      plannedNodes = planDoubleEliminationBracket(seededTeams);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'failed to plan double elimination bracket';
      return NextResponse.json({ error: { code: 'UNSUPPORTED_TEAM_COUNT_FOR_FORMAT', message } }, { status: 422 });
    }

    const upperTotalRounds = Math.max(...plannedNodes.filter((n) => n.bracket_type === 'UPPER').map((n) => n.round_number));
    const lowerTotalRounds = Math.max(...plannedNodes.filter((n) => n.bracket_type === 'LOWER').map((n) => n.round_number));

    const idByRef = new Map<string, string>();
    const insertedIds: string[] = [];
    let updatedStage: { id: string; status: string };

    try {
      for (const node of plannedNodes) {
        const refKey = `${node.bracket_type}:${node.round_number}:${node.position_in_round}`;
        const { data: inserted, error } = await supabase
          .from('bracket_nodes')
          .insert({
            stage_id: stageId,
            bracket_type: node.bracket_type,
            round_number: node.round_number,
            position_in_round: node.position_in_round,
            team_a_id: node.team_a_id,
            team_b_id: node.team_b_id,
            is_bye: node.is_bye,
            status: node.status,
            best_of: bestOfForDoubleEliminationNode(stage.best_of_config, node, upperTotalRounds, lowerTotalRounds),
          })
          .select('id')
          .single();

        if (error || !inserted) {
          throw new Error(error?.message ?? 'failed to insert bracket node');
        }
        insertedIds.push(inserted.id);
        idByRef.set(refKey, inserted.id);
      }

      for (const node of plannedNodes) {
        const nodeId = idByRef.get(`${node.bracket_type}:${node.round_number}:${node.position_in_round}`)!;
        const patch: Record<string, unknown> = {};

        if (node.source_a) {
          const ref = node.source_a.ref;
          patch.source_a_node_id = idByRef.get(`${ref.bracket_type}:${ref.round}:${ref.position}`) ?? null;
          patch.source_a_outcome = node.source_a.outcome;
        }
        if (node.source_b) {
          const ref = node.source_b.ref;
          patch.source_b_node_id = idByRef.get(`${ref.bracket_type}:${ref.round}:${ref.position}`) ?? null;
          patch.source_b_outcome = node.source_b.outcome;
        }
        if (node.winner_to) {
          const ref = node.winner_to.ref;
          patch.winner_to_node_id = idByRef.get(`${ref.bracket_type}:${ref.round}:${ref.position}`) ?? null;
          patch.winner_to_slot = node.winner_to.slot;
        }
        if (node.loser_to) {
          const ref = node.loser_to.ref;
          patch.loser_to_node_id = idByRef.get(`${ref.bracket_type}:${ref.round}:${ref.position}`) ?? null;
          patch.loser_to_slot = node.loser_to.slot;
        }

        if (Object.keys(patch).length > 0) {
          const { error } = await supabase.from('bracket_nodes').update(patch).eq('id', nodeId);
          if (error) throw new Error(error.message);
        }
      }

      updatedStage = await moveStageToSeeding();
    } catch (err) {
      return cleanupAndFail(insertedIds, err);
    }

    return NextResponse.json(
      {
        data: {
          stage_id: stageId,
          status: updatedStage.status,
          format: stage.format,
          upper_rounds: upperTotalRounds,
          lower_rounds: lowerTotalRounds,
          node_count: insertedIds.length,
        },
      },
      { status: 201 }
    );
  }

  const formatConfig = (stage.format_config ?? {}) as Record<string, unknown>;
  let roundRobinPlan: ReturnType<typeof planRoundRobinBracket>;
  try {
    roundRobinPlan = planRoundRobinBracket(seededTeams, {
      groups: typeof formatConfig.groups === 'number' ? formatConfig.groups : undefined,
      doubleRound: formatConfig.double_round === true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to plan round robin schedule';
    return NextResponse.json({ error: { code: 'INVALID_ROUND_ROBIN_CONFIG', message } }, { status: 422 });
  }

  const roundRobinBestOfConfig = (stage.best_of_config ?? {}) as Record<string, unknown>;
  const roundRobinBestOf =
    typeof roundRobinBestOfConfig.default === 'number' && roundRobinBestOfConfig.default > 0
      ? roundRobinBestOfConfig.default
      : 1;

  const insertedIds: string[] = [];
  const groupLabelTeamIds: string[] = [];
  let updatedStage: { id: string; status: string };

  try {
    for (const group of roundRobinPlan.groups) {
      const { error } = await admin
        .from('tournament_registrations')
        .update({ group_label: group.label })
        .eq('tournament_id', stage.tournament_id)
        .in('team_id', group.team_ids);
      if (error) throw new Error(error.message);
      groupLabelTeamIds.push(...group.team_ids);
    }

    for (const node of roundRobinPlan.nodes) {
      const { data: inserted, error } = await supabase
        .from('bracket_nodes')
        .insert({
          stage_id: stageId,
          bracket_type: 'MAIN',
          round_number: node.round_number,
          position_in_round: node.position_in_round,
          team_a_id: node.team_a_id,
          team_b_id: node.team_b_id,
          is_bye: false,
          status: 'READY',
          best_of: roundRobinBestOf,
        })
        .select('id')
        .single();

      if (error || !inserted) {
        throw new Error(error?.message ?? 'failed to insert bracket node');
      }
      insertedIds.push(inserted.id);
    }

    updatedStage = await moveStageToSeeding();
  } catch (err) {
    return cleanupAndFail(insertedIds, err, groupLabelTeamIds);
  }

  return NextResponse.json(
    {
      data: {
        stage_id: stageId,
        status: updatedStage.status,
        format: stage.format,
        groups: roundRobinPlan.groups.map((g) => ({ label: g.label, team_count: g.team_ids.length })),
        node_count: insertedIds.length,
      },
    },
    { status: 201 }
  );
}
