// GET /api/v1/bracket-nodes/:id
// T2.2-B06 (part 1) — single bracket node detail, with team info joined in.
// Public -- bracket_nodes and teams both have public-read RLS, same as
// T2.2-B05's GET /stages/:id/bracket. See that route's header comment for
// why `match_id` and `winner_team_id` are deliberately not included.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = await params;
  const supabase = await createClient();

  const { data: node, error } = await supabase
    .from('bracket_nodes')
    .select(
      'id, stage_id, bracket_type, round_number, position_in_round, label, team_a_id, team_b_id, source_a_node_id, source_a_outcome, source_b_node_id, source_b_outcome, winner_to_node_id, winner_to_slot, loser_to_node_id, loser_to_slot, status, is_bye, best_of, voided_reason, created_at, updated_at'
    )
    .eq('id', nodeId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }
  if (!node) {
    return NextResponse.json(
      { error: { code: 'NODE_NOT_FOUND', message: 'ไม่พบ bracket node นี้' } },
      { status: 404 }
    );
  }

  const teamIds = [node.team_a_id, node.team_b_id].filter((id): id is string => id !== null);
  const teamById = new Map<string, { id: string; name: string; tag: string; logo_url: string | null }>();
  if (teamIds.length > 0) {
    const { data: teams } = await supabase.from('teams').select('id, name, tag, logo_url').in('id', teamIds);
    for (const t of teams ?? []) teamById.set(t.id, t);
  }

  return NextResponse.json(
    {
      data: {
        ...node,
        team_a: node.team_a_id ? teamById.get(node.team_a_id) ?? null : null,
        team_b: node.team_b_id ? teamById.get(node.team_b_id) ?? null : null,
      },
    },
    { status: 200 }
  );
}
