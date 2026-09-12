// app/tournament/monthly/page.tsx
import { createClient } from '@/lib/supabase/server';
import { TournamentBracketView } from '@/components/tournament-bracket-view';
import type { TournamentBracketPageData, BracketMatchNode, BracketTeamParticipant } from '@/types/bracket';

interface TeamInfo {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
}

interface StandingRow {
  team_id: string;
  total_zp: number;
  counted_zp: number;
  rank: number | null;
  is_finals_qualified: boolean;
  teams: { name: string; tag: string } | { name: string; tag: string }[] | null;
}

interface TournamentRecord {
  id: string;
  name: string;
  type?: string | null;
  start_at?: string | null;
  starts_at?: string | null;
  season_id?: string | null;
  created_at?: string | null;
}

function one<T>(rel: T[] | T | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

// Monthly Major Hub — ดึงข้อมูลจริง: tournaments -> tournament_stages -> bracket_nodes
export default async function MonthlyTournamentPage() {
  const supabase = await createClient();

  // ดึงรายการ tournaments แบบ Safe-type
  const { data: rawTournaments } = (await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)) as unknown as { data: TournamentRecord[] | null };

  const tournament = (rawTournaments ?? []).find(
    (t: TournamentRecord) => t.type === 'MONTHLY' || t.name?.toLowerCase().includes('monthly')
  );

  let bracketData: TournamentBracketPageData | null = null;
  let standings: StandingRow[] = [];

  if (tournament) {
    const { data: stages } = await supabase
      .from('tournament_stages')
      .select('id, format, teams_in')
      .eq('tournament_id', tournament.id)
      .order('stage_order', { ascending: false });

    const stage = stages?.[0] ?? null;

    let matches: BracketMatchNode[] = [];
    if (stage) {
      const { data: nodes } = await supabase
        .from('bracket_nodes')
        .select('id, bracket_type, round_number, position_in_round, label, team_a_id, team_b_id, status, is_bye, best_of')
        .eq('stage_id', stage.id)
        .order('bracket_type', { ascending: true })
        .order('round_number', { ascending: true })
        .order('position_in_round', { ascending: true });

      const teamIds = Array.from(
        new Set((nodes ?? []).flatMap((n) => [n.team_a_id, n.team_b_id]).filter((id): id is string => id !== null))
      );
      const teamById = new Map<string, TeamInfo>();
      if (teamIds.length > 0) {
        const { data: teams } = await supabase.from('teams').select('id, name, tag, logo_url').in('id', teamIds);
        for (const t of teams ?? []) teamById.set(t.id, t as TeamInfo);
      }

      const toParticipant = (id: string | null): BracketTeamParticipant | undefined => {
        if (!id) return undefined;
        const t = teamById.get(id);
        if (!t) return undefined;
        return { id: t.id, name: t.name, tag: t.tag, logoUrl: t.logo_url };
      };

      matches = (nodes ?? []).map((n, idx) => ({
        id: n.id,
        stageId: stage.id,
        matchNumber: idx + 1,
        bracketType: n.bracket_type as BracketMatchNode['bracketType'],
        roundNumber: n.round_number,
        positionInRound: n.position_in_round,
        label: n.label ?? undefined,
        bestOf: n.best_of,
        status: n.status,
        teamA: toParticipant(n.team_a_id),
        teamB: toParticipant(n.team_b_id),
      }));
    }

    const startDate = tournament.start_at || tournament.starts_at;
    const dateText = startDate
      ? new Date(startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'TBA';

    bracketData = {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      subMetaText: `${dateText} · DOUBLE ELIMINATION · ${stage?.teams_in ?? '—'} TEAMS`,
      prizeZpText: '—',
      matches,
    };

    if (tournament.season_id) {
      const { data: season } = await supabase.from('seasons').select('circuit_id').eq('id', tournament.season_id).maybeSingle();
      if (season?.circuit_id) {
        const { data: rows } = await supabase
          .from('circuit_standings')
          .select('team_id, total_zp, counted_zp, rank, is_finals_qualified, teams!team_id(name, tag)')
          .eq('circuit_id', season.circuit_id)
          .order('rank', { ascending: true, nullsFirst: false })
          .limit(16);
        standings = (rows ?? []) as unknown as StandingRow[];
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#090D14] text-white font-sans">
      {bracketData ? (
        <TournamentBracketView data={bracketData} />
      ) : (
        <div className="p-10 text-center text-sm text-gray-400">ยังไม่มีทัวร์นาเมนต์รายเดือน (MONTHLY) เปิดอยู่ในระบบ</div>
      )}

      {standings.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 pb-10">
          <div className="bg-[#0D1117] border border-amber-500/30 rounded-xl overflow-hidden shadow-xl mt-6">
            <div className="p-5 border-b border-gray-800">
              <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-gray-300">
                Circuit Points Standings — โควตาสะสมแต้มฤดูกาล
              </h2>
            </div>
            <table className="w-full text-left text-sm font-mono">
              <thead className="bg-[#161B22] text-xs text-gray-400 uppercase border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Total ZP</th>
                  <th className="py-3 px-4">Counted ZP</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {standings.map((s) => {
                  const team = one<{ name: string; tag: string }>(s.teams);
                  return (
                    <tr key={s.team_id} className="hover:bg-[#161B22]/50">
                      <td className="py-3.5 px-4 font-bold text-amber-400">#{s.rank ?? '—'}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-200">
                        {team?.name ?? 'Unknown'} <span className="text-gray-500 text-xs">[{team?.tag}]</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-cyan-400">{s.total_zp} ZP</td>
                      <td className="py-3.5 px-4 text-emerald-400">{s.counted_zp} ZP</td>
                      <td className="py-3.5 px-4 text-center">
                        {s.is_finals_qualified ? (
                          <span className="text-[11px] px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
                            QUALIFIED
                          </span>
                        ) : (
                          <span className="text-[11px] px-2.5 py-1 rounded bg-gray-800 text-gray-400 border border-gray-700">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}