import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ matchid: string }>;
}

interface TeamInfo {
  id: string;
  name: string;
  tag: string;
}

function one<T>(rel: T[] | T | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

// Intermission Scoreboard — สรุปผลการแข่งขันหลังจบซีรีส์ แสดง Scoreboard แยกราย
// map และ MVP ประจำแมตช์ ดึงจาก matches/match_games/match_participants จริงทั้งหมด
//
// หมายเหตุ: ระบบโหวต MVP ระหว่างเพื่อนร่วมทีม/คู่แข่ง (allies 5-4-3-2, opponents
// 5-4-3-2-1 ที่ยิงไป /api/v1/match/settlement/submit-votes) ที่มีในดีไซน์เดิมไม่มี
// backend รองรับจริงเลย (ไม่มี API route, ไม่มีตารางเก็บโหวต) และสร้างตารางใหม่เอง
// ไม่ได้ตามข้อกำหนด จึงตัดฟีเจอร์นี้ออก เหลือแค่ MVP ที่คำนวณจริงได้ (ACS สูงสุดของ
// เกมล่าสุดที่จบ — ใช้ตรรกะเดียวกับ app/overlay/match/[id]/mvp/route.ts)
export default async function MatchResultPage({ params }: PageProps) {
  const { matchid } = await params;
  const supabase = await createClient();

  const { data: match } = await supabase
    .from('matches')
    .select(
      'id, status, score_a, score_b, best_of, ended_at, team_a:teams!matches_team_a_id_fkey(id, name, tag), team_b:teams!matches_team_b_id_fkey(id, name, tag)'
    )
    .eq('id', matchid)
    .maybeSingle();

  if (!match) notFound();

  const teamA = one<TeamInfo>(match.team_a as never);
  const teamB = one<TeamInfo>(match.team_b as never);

  const { data: games } = await supabase
    .from('match_games')
    .select('id, game_number, map_name, score_a, score_b, winner_team_id, status')
    .eq('match_id', matchid)
    .order('game_number', { ascending: true });

  const latestCompleted = (games ?? []).filter((g) => g.status === 'COMPLETED').sort((a, b) => b.game_number - a.game_number)[0];
  const targetGame = latestCompleted ?? games?.[0] ?? null;

  let mvp: {
    displayName: string;
    teamTag: string;
    kills: number;
    deaths: number;
    assists: number;
    acs: number;
    adr: number;
    headshotPct: number;
    agentPlayed: string;
  } | null = null;

  if (targetGame) {
    const { data: participant } = await supabase
      .from('match_participants')
      .select('kills, deaths, assists, acs, adr, headshot_pct, agent_played, player:player_id(display_name), team:team_id(tag)')
      .eq('match_game_id', targetGame.id)
      .order('acs', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (participant) {
      const playerRec = one<{ display_name: string }>(participant.player as never);
      const teamRec = one<{ tag: string }>(participant.team as never);
      mvp = {
        displayName: playerRec?.display_name ?? 'ไม่ทราบชื่อ',
        teamTag: teamRec?.tag ?? '',
        kills: participant.kills,
        deaths: participant.deaths,
        assists: participant.assists,
        acs: Number(participant.acs ?? 0),
        adr: Number(participant.adr ?? 0),
        headshotPct: Number(participant.headshot_pct ?? 0),
        agentPlayed: participant.agent_played ?? 'ไม่ระบุ',
      };
    }
  }

  return (
    <main className="min-h-screen bg-[#07090E] text-[#E0E0E0] p-4 md:p-8 font-mono">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="border border-[#00D4FF]/30 bg-[#0A0A12] p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${match.status === 'COMPLETED' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase">{match.status}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-wider">
              {teamA?.name ?? 'TBD'} <span className="text-[#00D4FF]">VS</span> {teamB?.name ?? 'TBD'}
            </h1>
            <p className="text-zinc-400 text-xs mt-1">Match #{matchid.slice(0, 8)} · BO{match.best_of}</p>
          </div>

          <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 px-6 py-3 rounded-xl">
            <span className="font-mono text-3xl font-black text-[#FF4655]">{match.score_a}</span>
            <span className="text-xs text-gray-500">-</span>
            <span className="font-mono text-3xl font-black text-[#00D4FF]">{match.score_b}</span>
          </div>
        </header>

        {/* SCOREBOARD BY MAP */}
        <section className="bg-slate-950 border border-[#00D4FF]/30 p-5 rounded-2xl space-y-3">
          <h2 className="text-sm font-black text-[#00D4FF]">SCOREBOARD แยกรายด่าน</h2>
          {(games ?? []).length === 0 ? (
            <div className="text-xs text-gray-500 py-6 text-center">ยังไม่มีข้อมูลเกมของแมตช์นี้</div>
          ) : (
            <div className="space-y-3">
              {(games ?? []).map((g) => (
                <div key={g.id} className="flex justify-between items-center bg-[#0D0E1A]/60 p-4 rounded-xl border border-white/5">
                  <div>
                    <p className="font-mono text-[10px] text-gray-500">MAP {g.game_number}</p>
                    <p className="font-mono text-base font-black text-white">{g.map_name ?? 'PENDING MAP'}</p>
                  </div>
                  <div className="flex items-center gap-4 font-mono">
                    <span className={`text-xl font-black ${g.score_a > g.score_b ? 'text-[#C9A84C]' : 'text-neutral-500'}`}>{g.score_a}</span>
                    <span className="text-xs text-neutral-600">vs</span>
                    <span className={`text-xl font-black ${g.score_b > g.score_a ? 'text-[#C9A84C]' : 'text-neutral-500'}`}>{g.score_b}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 uppercase">{g.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* MVP */}
        {mvp && (
          <section className="bg-gradient-to-b from-[#12121A]/95 to-[#0A0A0F] border-2 border-[#C9A84C]/50 rounded-2xl p-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#00D4FF]/30 bg-[#00D4FF]/10 text-[#00D4FF] tracking-wider uppercase font-bold">
                MVP FOR LATEST MAP
              </span>
              <span className="font-mono text-sm text-[#C9A84C] font-black">{mvp.teamTag}</span>
            </div>
            <div className="text-center mb-4">
              <h3 className="font-mono text-2xl font-black text-white uppercase tracking-wider">{mvp.displayName}</h3>
              <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mt-1">AGENT: {mvp.agentPlayed}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
                <p className="font-mono text-[9px] text-gray-500 uppercase">K / D / A</p>
                <p className="font-mono text-sm font-black text-white mt-1">{mvp.kills}/{mvp.deaths}/{mvp.assists}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
                <p className="font-mono text-[9px] text-gray-500 uppercase">ACS</p>
                <p className="font-mono text-sm font-black text-[#00D4FF] mt-1">{mvp.acs}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
                <p className="font-mono text-[9px] text-gray-500 uppercase">HS RATE</p>
                <p className="font-mono text-sm font-black text-[#C9A84C] mt-1">{mvp.headshotPct}%</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
