// app/dashboard/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import DashboardClientAction from './DashboardClientAction';
import { LogIn, ShieldAlert } from 'lucide-react';

interface TeamInfo {
  id: string;
  name: string;
  tag: string;
  total_zp: number;
}

interface UpcomingMatch {
  id: string;
  status: string;
  scheduled_at: string | null;
  best_of: number;
  teamAName: string;
  teamBName: string;
}

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. ตรวจสอบ Session ผู้ใช้
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col items-center justify-center p-4 font-mono">
        <div className="bg-[#12121A] border border-red-500/30 p-8 rounded-2xl max-w-md text-center space-y-4 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-white uppercase">กรุณาเข้าสู่ระบบ</h2>
          <p className="text-xs text-zinc-400">คุณต้องลงชื่อเข้าใช้ก่อนจึงจะสามารถเข้าถึง Athlete Dashboard ได้</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#E8B429] text-black font-black text-xs rounded-xl hover:bg-[#f5c84c] transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>เข้าสู่ระบบทันที</span>
          </Link>
        </div>
      </div>
    );
  }

  // 2. ดึงข้อมูล Player และ Game Account (Riot ID)
  const { data: player } = await supabase
    .from('players')
    .select(`
      id,
      display_name,
      real_name,
      athlete_id,
      ap_balance,
      game_accounts (
        id,
        game_name,
        tag_line,
        region,
        verification_status
      )
    `)
    .eq('user_id', user.id)
    .maybeSingle();

  // กรณีเป็น User ใหม่ที่ยังไม่มี Record ในตาราง players
  const currentPlayer = player ?? {
    id: user.id,
    display_name: user.email?.split('@')[0] ?? 'ATHLETE_RECRUIT',
    real_name: null,
    athlete_id: 'UNASSIGNED',
    ap_balance: 0,
    game_accounts: null,
  };

  // 3. ดึงข้อมูลทีมและ ZP
  let teams: TeamInfo[] = [];
  if (player?.id) {
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id, teams(id, name, tag, total_zp)')
      .eq('player_id', player.id)
      .eq('status', 'ACTIVE');

    teams = (memberships ?? [])
      .map((m) => {
        const t = Array.isArray(m.teams) ? m.teams[0] : m.teams;
        return t ? { id: t.id, name: t.name, tag: t.tag, total_zp: t.total_zp } : null;
      })
      .filter((t): t is TeamInfo => t !== null);
  }

  const teamIds = teams.map((t) => t.id).filter(Boolean);
  const totalZp = teams.reduce((sum, t) => sum + (t.total_zp ?? 0), 0);

  // 4. ดึงข้อมูล Matches
  let upcomingMatches: UpcomingMatch[] = [];
  if (teamIds.length > 0) {
    try {
      const { data: matches } = await supabase
        .from('matches')
        .select(`
          id,
          status,
          scheduled_at,
          best_of,
          team_a:teams!matches_team_a_id_fkey ( name ),
          team_b:teams!matches_team_b_id_fkey ( name )
        `)
        .or(`team_a_id.in.(${teamIds.join(',')}),team_b_id.in.(${teamIds.join(',')})`)
        .in('status', ['SCHEDULED', 'READY_CHECK', 'VETO', 'LIVE'])
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .limit(5);

      if (matches) {
        upcomingMatches = matches.map((m) => {
          const teamA = Array.isArray(m.team_a) ? m.team_a[0] : m.team_a;
          const teamB = Array.isArray(m.team_b) ? m.team_b[0] : m.team_b;
          return {
            id: m.id,
            status: m.status,
            scheduled_at: m.scheduled_at,
            best_of: m.best_of,
            teamAName: (teamA as { name: string } | null)?.name ?? 'TBD',
            teamBName: (teamB as { name: string } | null)?.name ?? 'TBD',
          };
        });
      }
    } catch (err) {
      console.error('[Dashboard] Safe Fetch Matches Error:', err);
    }
  }

  const currentMatch = upcomingMatches.find(
    (m) => m.status === 'LIVE' || m.status === 'READY_CHECK' || m.status === 'VETO'
  );

  const rawAccount = currentPlayer.game_accounts;
  const gameAccount = Array.isArray(rawAccount) ? rawAccount[0] : rawAccount;

  return (
    <div className="min-h-screen bg-[#07090E] text-white pt-24 pb-12 px-4 md:px-8 flex flex-col items-center relative font-mono selection:bg-[#00D4FF] selection:text-black">
      <div className="absolute inset-0 bg-[radial-gradient(#00D4FF_1px,transparent_1px)] bg-[size:28px_28px] opacity-10 pointer-events-none" />

      <header className="w-full max-w-6xl flex flex-col sm:flex-row items-center justify-between border-b border-[#00D4FF]/20 pb-4 mb-6 z-10 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse" />
            <span className="text-[#00D4FF] text-xs tracking-widest uppercase font-bold">
              ATHLETE ACTIVITY DASHBOARD
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-wider text-white mt-1 uppercase">
            สวัสดี, {currentPlayer.display_name || currentPlayer.real_name || currentPlayer.athlete_id}
          </h1>
        </div>
      </header>

      <div className="w-full max-w-6xl space-y-6 z-10">
        
        {/* BANNER: เชื่อมต่อ Riot ID / สถานะการตรวจสอบ */}
        <DashboardClientAction playerId={currentPlayer.id} gameAccount={gameAccount ?? null} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-[#12121A]/80 border border-[#00D4FF]/30 p-4 rounded-lg">
            <span className="text-[10px] text-gray-400 uppercase font-mono">AP BALANCE</span>
            <div className="text-2xl font-black mt-1 text-[#00D4FF]">
              {(currentPlayer.ap_balance ?? 0).toLocaleString()} AP
            </div>
          </div>
          <div className="bg-[#12121A]/80 border border-[#C9A84C]/30 p-4 rounded-lg">
            <span className="text-[10px] text-gray-400 uppercase font-mono">ZP สะสม (ทีม)</span>
            <div className="text-2xl font-black mt-1 text-[#C9A84C]">
              {totalZp.toLocaleString()} ZP
            </div>
          </div>
          <div className="bg-[#12121A]/80 border border-gray-800 p-4 rounded-lg">
            <span className="text-[10px] text-gray-400 uppercase font-mono">UPCOMING MATCHES</span>
            <div className="text-2xl font-black mt-1 text-white">{upcomingMatches.length}</div>
          </div>
        </div>

        {/* Current Match / Lobby Status */}
        <div className="bg-[#12121A] border border-[#00D4FF]/30 p-4 rounded-xl">
          <div className="text-xs font-bold text-[#00D4FF] mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse" /> สถานะห้องแข่งปัจจุบัน
          </div>
          {currentMatch ? (
            <Link
              href={`/matches/${currentMatch.id}/lobby`}
              className="flex items-center justify-between p-3 bg-[#07090E] border border-gray-800 rounded-lg hover:border-[#00D4FF]/50 transition-colors"
            >
              <div className="text-xs font-bold text-white">
                {currentMatch.teamAName} vs {currentMatch.teamBName}
              </div>
              <span className="text-[10px] bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/30 px-2 py-0.5 rounded font-bold">
                {currentMatch.status}
              </span>
            </Link>
          ) : (
            <div className="text-xs text-gray-500 p-3">ไม่มีแมตช์ที่ต้องเข้าห้องตอนนี้</div>
          )}
        </div>

        {/* Upcoming matches list */}
        <div className="bg-[#12121A] border border-[#00D4FF]/30 p-4 rounded-xl">
          <div className="text-xs font-bold text-[#00D4FF] mb-3">UPCOMING MATCHES</div>
          {teams.length === 0 ? (
            <div className="text-xs text-gray-500">คุณยังไม่ได้สังกัดทีมที่ ACTIVE</div>
          ) : upcomingMatches.length === 0 ? (
            <div className="text-xs text-gray-500">ยังไม่มีแมตช์ที่กำหนดไว้</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {upcomingMatches.map((m) => (
                <div key={m.id} className="p-3 bg-[#07090E] border border-gray-800 rounded-lg">
                  <div className="text-[10px] text-gray-400 flex justify-between">
                    <span>BO{m.best_of}</span>
                    <span className="text-[#00D4FF] font-bold">{m.status}</span>
                  </div>
                  <div className="text-xs font-bold text-white my-2">{m.teamAName} vs {m.teamBName}</div>
                  <div className="text-[10px] text-gray-500">
                    {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString('th-TH') : 'ยังไม่กำหนดเวลา'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}