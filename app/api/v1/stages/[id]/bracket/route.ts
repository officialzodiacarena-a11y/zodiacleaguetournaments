// GET /api/v1/stages/:id/bracket
// T2.2-B05 — full bracket for a stage: every bracket_nodes row, with team
// info (id, name, tag, logo_url) joined in for whichever slots are filled.
// Public -- bracket_nodes and teams both have public-read RLS
// (bracket_nodes_public_read from migration_block2_sprint2.2.sql;
// teams_public_read from Block 1), so the regular RLS-respecting client is
// enough, no auth check needed.
//
// Shape matches Sprint2.2_Spec.md 2.2.B's example response: a flat `nodes`
// array, not a nested tree -- exactly like T2.2-A02's `?include=bracket`
// summary and every other bracket_nodes consumer so far, the client walks
// the tree itself via each node's winner_to/loser_to/source_a/source_b
// pointers rather than the server nesting it server-side.
//
// Two fields the spec's example response shows that this deliberately does
// NOT return, flagged rather than faked:
//
// - `match_id`: the ERD's `matches` table has a `bracket_node_id` column to
//   join on, but the actually deployed `matches` table (Sprint 2.1) doesn't
//   have that column at all (see migration_block2_sprint2.2.sql's own "NOT
//   in scope here" note), and no Sprint 2.2 task has created it yet either
//   -- that's T2.2-C02 (Match Auto-Create after Bracket), which hasn't been
//   built. There is currently no way to look this up, so it isn't included
//   rather than being silently null-padded as if the lookup ran.
//
// - `winner_team_id`: bracket_nodes has no such column (see ERD_Draft.md
//   2.7). For most nodes it's derivable from the downstream node's
//   already-populated team_a_id/team_b_id slot (whichever slot this node's
//   winner_to_slot points at), but that derivation has no answer for a
//   node with no downstream node at all -- single-elimination's final
//   round, and double-elimination's Grand Final -- which are exactly the
//   two matches this field matters most for. A partial "sometimes derived,
//   sometimes null" field would be more confusing than not shipping it;
//   the honest fix is a real column (mirroring how `matches` would carry
//   winner_team_id), left as a follow-up.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface TeamInfo {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: stageId } = await params;
  const supabase = await createClient();

  const { data: stage } = await supabase
    .from('tournament_stages')
    .select('id, format')
    .eq('id', stageId)
    .maybeSingle();

  if (!stage) {
    return NextResponse.json(
      { error: { code: 'STAGE_NOT_FOUND', message: 'ไม่พบ stage นี้' } },
      { status: 404 }
    );
  }

  const { data: nodes, error } = await supabase
    .from('bracket_nodes')
    .select(
      'id, bracket_type, round_number, position_in_round, label, team_a_id, team_b_id, source_a_node_id, source_a_outcome, source_b_node_id, source_b_outcome, winner_to_node_id, winner_to_slot, loser_to_node_id, loser_to_slot, status, is_bye, best_of, voided_reason'
    )
    .eq('stage_id', stageId)
    .order('bracket_type', { ascending: true })
    .order('round_number', { ascending: true })
    .order('position_in_round', { ascending: true });

  if (error) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }

  const teamIds = Array.from(
    new Set((nodes ?? []).flatMap((n) => [n.team_a_id, n.team_b_id]).filter((id): id is string => id !== null))
  );

  const teamById = new Map<string, TeamInfo>();
  if (teamIds.length > 0) {
    const { data: teams } = await supabase.from('teams').select('id, name, tag, logo_url').in('id', teamIds);
    for (const t of teams ?? []) teamById.set(t.id, t);
  }

  const data = (nodes ?? []).map((n) => ({
    id: n.id,
    bracket_type: n.bracket_type,
    round_number: n.round_number,
    position_in_round: n.position_in_round,
    label: n.label,
    status: n.status,
    is_bye: n.is_bye,
    best_of: n.best_of,
    voided_reason: n.voided_reason,
    team_a: n.team_a_id ? teamById.get(n.team_a_id) ?? null : null,
    team_b: n.team_b_id ? teamById.get(n.team_b_id) ?? null : null,
    source_a_node_id: n.source_a_node_id,
    source_a_outcome: n.source_a_outcome,
    source_b_node_id: n.source_b_node_id,
    source_b_outcome: n.source_b_outcome,
    winner_to_node_id: n.winner_to_node_id,
    winner_to_slot: n.winner_to_slot,
    loser_to_node_id: n.loser_to_node_id,
    loser_to_slot: n.loser_to_slot,
  }));

  return NextResponse.json(
    {
      data: {
        stage_id: stageId,
        format: stage.format,
        nodes: data,
      },
    },
    { status: 200 }
  );
}
