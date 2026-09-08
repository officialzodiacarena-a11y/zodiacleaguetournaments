import { createClient } from '@/lib/supabase/server';

interface CompletedMatchRow {
  id: string;
  status: string;
  score_a: number;
  score_b: number;
  best_of: number;
  ended_at: string | null;
  winner_team_id: string | null;
  team_a: { id: string; name: string; tag: string } | { id: string; name: string; tag: string }[] | null;
  team_b: { id: string; name: string; tag: string } | { id: string; name: string; tag: string }[] | null;
}

function one<T>(rel: T[] | T | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

// Match History Vault — คลังประวัติผลแข่งขันระดับลีกที่จบแล้วทั้งหมด (public,
// ไม่ต้อง login) ดึงจาก matches จริง status=COMPLETED แทน mockMatches เดิม
export default async function MatchHistoryPage() {
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from('matches')
    .select(
      'id, status, score_a, score_b, best_of, ended_at, winner_team_id, team_a:teams!matches_team_a_id_fkey(id, name, tag), team_b:teams!matches_team_b_id_fkey(id, name, tag)'
    )
    .eq('status', 'COMPLETED')
    .order('ended_at', { ascending: false })
    .limit(30);

  const rows = ((matches ?? []) as unknown as CompletedMatchRow[]).map((m) => {
    const teamA = one(m.team_a);
    const teamB = one(m.team_b);
    const winnerName = m.winner_team_id === teamA?.id ? teamA?.name : m.winner_team_id === teamB?.id ? teamB?.name : null;
    return {
      id: m.id,
      teamAName: teamA?.name ?? 'TBD',
      teamBName: teamB?.name ?? 'TBD',
      score: `${m.score_a} - ${m.score_b}`,
      bestOf: m.best_of,
      winnerName,
      endedAt: m.ended_at,
    };
  });

  return (
    <div className="min-h-screen bg-[#07090E] text-white pt-24 pb-12 px-4 md:px-8 flex flex-col items-center font-mono selection:bg-[#00D4FF] selection:text-black">
      <div className="absolute inset-0 bg-[radial-gradient(#00D4FF_1px,transparent_1px)] bg-size-[28px_28px] opacity-10 pointer-events-none" />

      <header className="w-full max-w-6xl border-b border-[#00D4FF]/20 pb-4 mb-6 z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse" />
          <span className="text-[#00D4FF] text-xs tracking-widest uppercase font-bold">LEAGUE TRANSPARENCY LOG</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black tracking-wider text-white mt-1">MATCH HISTORY VAULT</h1>
      </header>

      <div className="w-full max-w-6xl z-10">
        {rows.length === 0 ? (
          <div className="text-center text-xs text-gray-500 py-16">ยังไม่มีแมตช์ที่จบการแข่งขันในระบบ</div>
        ) : (
          <div className="bg-[#12121A] border border-[#00D4FF]/30 rounded-xl overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800 bg-[#07090E]/80">
                  <th className="p-3.5">MATCH ID</th>
                  <th className="p-3.5">TEAMS</th>
                  <th className="p-3.5">SCORE</th>
                  <th className="p-3.5 text-right">WINNER</th>
                  <th className="p-3.5 text-right">DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {rows.map((m) => (
                  <tr key={m.id} className="hover:bg-white/2">
                    <td className="py-2.5 px-3.5 text-gray-400">{m.id.slice(0, 8)}</td>
                    <td className="py-2.5 px-3.5 text-white font-bold">{m.teamAName} vs {m.teamBName}</td>
                    <td className="py-2.5 px-3.5 text-gray-300">{m.score} (BO{m.bestOf})</td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-green-400">{m.winnerName ?? '—'}</td>
                    <td className="py-2.5 px-3.5 text-right text-gray-500">
                      {m.endedAt ? new Date(m.endedAt).toLocaleDateString('th-TH') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
