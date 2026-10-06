// lib/bracket/walkoverAdvance.ts
// เลื่อนสายให้ทีมที่ชนะบาย (WALKOVER) — ฟังก์ชันฐานข้อมูล resolve_expired_ready_checks() แก้เฉพาะตาราง matches
// จึงต้องเรียกตรรกะกลาง advanceBracketFromMatch ต่อจากงานปรับแพ้ (ใช้ใน GET /api/cron/walkover)
// ทำซ้ำได้ปลอดภัย และเก็บตกแมตช์ที่เลื่อนสายพลาดในรอบก่อน (โหนดยังไม่ COMPLETED)
// ทดสอบด้วย: npx tsx --test tests/walkover-advance.test.ts
import type { createAdminClient } from '@/lib/supabase/admin';
import { advanceBracketFromMatch } from '@/lib/bracket/advanceBracketFromMatch';

type AdminClient = ReturnType<typeof createAdminClient>;

export interface WalkoverMatchRow {
  id: string;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_team_id: string | null;
  bracket_node_id: string | null;
}

export interface WalkoverNodeRow {
  id: string;
  status: string;
}

export interface WalkoverAdvanceResult {
  match_id: string;
  advanced: boolean;
  error: string | null;
}

// คัดเฉพาะแมตช์ที่ต้องเลื่อนสาย: มีผู้ชนะ · อยู่ในสาย · โหนดมีอยู่จริงและยังไม่ COMPLETED
export function pickWalkoversToAdvance(matches: WalkoverMatchRow[], nodes: WalkoverNodeRow[]): WalkoverMatchRow[] {
  const nodeStatusById = new Map(nodes.map((n) => [n.id, n.status]));
  return matches.filter((m) => {
    if (!m.winner_team_id || !m.bracket_node_id) return false;
    const nodeStatus = nodeStatusById.get(m.bracket_node_id);
    return nodeStatus !== undefined && nodeStatus !== 'COMPLETED';
  });
}

export async function advancePendingWalkovers(admin: AdminClient, nowIso: string): Promise<WalkoverAdvanceResult[]> {
  const { data: matchRows, error: matchErr } = await admin
    .from('matches' as never)
    .select('id, team_a_id, team_b_id, winner_team_id, bracket_node_id')
    .eq('status', 'WALKOVER')
    .not('winner_team_id', 'is', null)
    .not('bracket_node_id', 'is', null);

  if (matchErr) {
    console.error('[cron/walkover] read walkover matches failed', matchErr.message);
    return [];
  }

  const matches = (matchRows ?? []) as unknown as WalkoverMatchRow[];
  if (matches.length === 0) return [];

  const nodeIds = [...new Set(matches.map((m) => m.bracket_node_id as string))];
  const { data: nodeRows, error: nodeErr } = await admin
    .from('bracket_nodes' as never)
    .select('id, status')
    .in('id', nodeIds);

  if (nodeErr) {
    console.error('[cron/walkover] read bracket nodes failed', nodeErr.message);
    return [];
  }

  const pending = pickWalkoversToAdvance(matches, (nodeRows ?? []) as unknown as WalkoverNodeRow[]);
  const results: WalkoverAdvanceResult[] = [];

  for (const match of pending) {
    const advance = await advanceBracketFromMatch(admin, {
      matchId: match.id,
      teamAId: match.team_a_id,
      teamBId: match.team_b_id,
      winnerTeamId: match.winner_team_id as string,
      nowIso,
    });

    if (advance.ok) {
      results.push({ match_id: match.id, advanced: advance.advanced, error: null });
    } else {
      console.error('[cron/walkover] advance bracket failed', { matchId: match.id, error: advance.error });
      results.push({ match_id: match.id, advanced: false, error: advance.error });
    }
  }

  return results;
}
