// lib/bracket/advanceBracketFromMatch.ts
// เลื่อนสาย (bracket_nodes) หลังแมตช์จบ: ตั้งโหนดของแมตช์เป็น COMPLETED แล้วส่งผู้ชนะ/ผู้แพ้ไปโหนดถัดไป
// ย้ายตรรกะเดิมมาจาก POST /api/v1/matches/[id]/result โดยไม่เปลี่ยนกติกา (ใช้ร่วมกับ /report ที่กัปตันรายงานตรงกัน)
// เพิ่มอย่างเดียว: (1) คืน error แทนการกลืน (2) ทำซ้ำได้ปลอดภัย — ทีมที่ถูกวางไว้ในโหนดถัดไปแล้วจะไม่ถูกวางซ้ำอีกช่อง
// หมายเหตุ: ไม่ใช้ RPC advance_bracket_node เพราะฟังก์ชันใน baseline อ้างคอลัมน์ next_node_id/next_node_slot ที่ไม่มีใน bracket_nodes
import type { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

interface BracketNodeRow {
  id: string;
  winner_to_node_id: string | null;
  loser_to_node_id: string | null;
  bracket_type: string;
  team_a_id?: string | null;
  team_b_id?: string | null;
}

export interface AdvanceBracketInput {
  matchId: string;
  teamAId: string | null;
  teamBId: string | null;
  winnerTeamId: string;
  nowIso: string;
}

export type AdvanceBracketResult = { ok: true; advanced: boolean } | { ok: false; error: string };

// วางทีมลงโหนดถัดไป (ช่องว่างช่องแรก) — ถ้าทีมนี้อยู่ในโหนดนั้นแล้วให้ข้าม (กัน retry วางซ้ำ 2 ช่อง)
async function placeTeamInNextNode(
  admin: AdminClient,
  nodeId: string,
  teamId: string,
  nowIso: string
): Promise<string | null> {
  const { data: nextRaw, error: fetchErr } = await admin
    .from('bracket_nodes' as never)
    .select('id, team_a_id, team_b_id')
    .eq('id', nodeId)
    .single();

  if (fetchErr) return fetchErr.message;

  const next = nextRaw as unknown as BracketNodeRow | null;
  if (!next) return null;
  if (next.team_a_id === teamId || next.team_b_id === teamId) return null;

  const assignA = !next.team_a_id;
  const newTeamA = assignA ? teamId : next.team_a_id;
  const newTeamB = !assignA ? teamId : next.team_b_id;

  const { error: updateErr } = await admin
    .from('bracket_nodes' as never)
    .update({
      team_a_id: newTeamA,
      team_b_id: newTeamB,
      status: Boolean(newTeamA && newTeamB) ? 'READY' : 'PENDING',
      updated_at: nowIso,
    } as never)
    .eq('id', next.id);

  return updateErr ? updateErr.message : null;
}

export async function advanceBracketFromMatch(
  admin: AdminClient,
  { matchId, teamAId, teamBId, winnerTeamId, nowIso }: AdvanceBracketInput
): Promise<AdvanceBracketResult> {
  const { data: matchData, error: matchDataErr } = await admin.from('matches' as never).select('bracket_node_id').eq('id', matchId).single();
  if (matchDataErr) return { ok: false, error: matchDataErr.message };
  if (!matchData?.bracket_node_id) return { ok: true, advanced: false };

  const { data: bracketNodeRaw, error: nodeErr } = await admin.from('bracket_nodes' as never).select('id, winner_to_node_id, loser_to_node_id, bracket_type').eq('id', matchData.bracket_node_id).maybeSingle();

  if (nodeErr) return { ok: false, error: nodeErr.message };

  const bracketNode = bracketNodeRaw as unknown as BracketNodeRow | null;
  // แมตช์ที่ไม่ได้อยู่ในสาย (เช่น scrim) → ไม่มีอะไรให้เลื่อน
  if (!bracketNode) return { ok: true, advanced: false };

  const loserTeamId = winnerTeamId === teamAId ? teamBId : teamAId;

  const { error: completeErr } = await admin
    .from('bracket_nodes' as never)
    .update({
      
      status: 'COMPLETED',
      updated_at: nowIso,
    } as never)
    .eq('id', bracketNode.id);

  if (completeErr) return { ok: false, error: completeErr.message };

  if (bracketNode.winner_to_node_id) {
    const err = await placeTeamInNextNode(admin, bracketNode.winner_to_node_id, winnerTeamId, nowIso);
    if (err) return { ok: false, error: err };
  }

  if (bracketNode.loser_to_node_id && loserTeamId) {
    const err = await placeTeamInNextNode(admin, bracketNode.loser_to_node_id, loserTeamId, nowIso);
    if (err) return { ok: false, error: err };
  }

  return { ok: true, advanced: true };
}
