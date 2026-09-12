// app/tournament/weekly/page.tsx
import { createClient } from '@/lib/supabase/server';
import { WeeklyTournamentView, type SwissStanding, type WeeklyBracketMatch } from '@/components/weekly-tournament-view';

interface TeamInfo {
  id: string;
  name: string;
  tag: string;
}

interface TournamentRecord {
  id: string;
  name: string;
  type?: string | null;
  entry_fee_ap?: number | null;
  starts_at?: string | null;
  start_at?: string | null;
}

export default async function WeeklyTournamentPage() {
  const supabase = await createClient();

  // ดึงข้อมูล tournaments โดยไม่ใช้ explicit any เพื่อผ่านกฎ ESLint
  const { data: rawTournaments } = (await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)) as unknown as { data: TournamentRecord[] | null };

  // ค้นหาทัวร์นาเมนต์รายสัปดาห์จาก type หรือ name
  const tournament = (rawTournaments ?? []).find(
    (t: TournamentRecord) => t.type === 'WEEKLY' || t.name?.toLowerCase().includes('weekly')
  );

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#090D14] text-white p-10 font-sans flex items-center justify-center">
        <div className="text-center text-sm text-gray-400">
          ยังไม่มีทัวร์นาเมนต์รายสัปดาห์ (WEEKLY) เปิดอยู่ในระบบ
        </div>
      </div>
    );
  }

  const { data: stages } = await supabase
    .from('tournament_stages')
    .select('id, name, format, stage_order, teams_in')
    .eq('tournament_id', tournament.id)
    .order('stage_order', { ascending: true });

  const swissStage = (stages ?? []).find((s) => s.format === 'SWISS') ?? null;
  const bracketStage = (stages ?? []).find((s) => s.format !== 'SWISS') ?? null;

  // ---- Swiss standings (คำนวณสดจาก matches ที่จบแล้ว) ----
  let standings: SwissStanding[] = [];
  if (swissStage) {
    const { data: matches } = await supabase
      .from('matches')
      .select('team_a_id, team_b_id, winner_team_id, status')
      .eq('stage_id', swissStage.id)
      .eq('status', 'COMPLETED');

    const teamIds = Array.from(
      new Set((matches ?? []).flatMap((m) => [m.team_a_id, m.team_b_id]).filter((id): id is string => id !== null))
    );

    const teamById = new Map<string, TeamInfo>();
    if (teamIds.length > 0) {
      const { data: teams } = await supabase.from('teams').select('id, name, tag').in('id', teamIds);
      for (const t of teams ?? []) teamById.set(t.id, t as TeamInfo);
    }

    const record = new Map<string, { wins: number; losses: number }>();
    for (const id of teamIds) record.set(id, { wins: 0, losses: 0 });

    for (const m of matches ?? []) {
      if (!m.team_a_id || !m.team_b_id || !m.winner_team_id) continue;
      const loserId = m.winner_team_id === m.team_a_id ? m.team_b_id : m.team_a_id;
      const winnerRec = record.get(m.winner_team_id);
      const loserRec = record.get(loserId);
      if (winnerRec) winnerRec.wins += 1;
      if (loserRec) loserRec.losses += 1;
    }

    standings = teamIds
      .map((id) => {
        const rec = record.get(id) ?? { wins: 0, losses: 0 };
        const team = teamById.get(id);
        return {
          teamId: id,
          name: team?.name ?? 'Unknown',
          tag: team?.tag ?? '',
          wins: rec.wins,
          losses: rec.losses,
        };
      })
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
      .map((s, idx) => ({ ...s, rank: idx + 1 }));
  }

  // ---- Top-N bracket (สเตจที่ format ไม่ใช่ SWISS) ----
  let bracketMatches: WeeklyBracketMatch[] = [];
  if (bracketStage) {
    const { data: nodes } = await supabase
      .from('bracket_nodes')
      .select('id, round_number, position_in_round, label, team_a_id, team_b_id, status')
      .eq('stage_id', bracketStage.id)
      .order('round_number', { ascending: true })
      .order('position_in_round', { ascending: true });

    const teamIds = Array.from(
      new Set((nodes ?? []).flatMap((n) => [n.team_a_id, n.team_b_id]).filter((id): id is string => id !== null))
    );
    const teamById = new Map<string, TeamInfo>();
    if (teamIds.length > 0) {
      const { data: teams } = await supabase.from('teams').select('id, name, tag').in('id', teamIds);
      for (const t of teams ?? []) teamById.set(t.id, t as TeamInfo);
    }

    bracketMatches = (nodes ?? []).map((n) => ({
      id: n.id,
      roundNumber: n.round_number,
      label: n.label,
      status: n.status,
      teamAName: n.team_a_id ? teamById.get(n.team_a_id)?.name ?? null : null,
      teamBName: n.team_b_id ? teamById.get(n.team_b_id)?.name ?? null : null,
    }));
  }

  return (
    <WeeklyTournamentView
      tournamentName={tournament.name}
      entryFeeAp={tournament.entry_fee_ap ?? 0}
      swissRoundLabel={swissStage?.name ?? 'Swiss Stage'}
      standings={standings}
      bracketLabel={bracketStage?.name ?? 'Playoff Bracket'}
      bracketMatches={bracketMatches}
    />
  );
}