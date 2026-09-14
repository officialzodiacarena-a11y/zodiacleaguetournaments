// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import DashboardClientAction from './DashboardClientAction';
import { LogIn, ShieldAlert } from 'lucide-react';
import { SponsorSlot } from '@/components/sponsor/SponsorSlot';
import ApQuestCard from '@/components/dashboard/ApQuestCard';
import AffiliateWidget from '@/components/dashboard/AffiliateWidget';
import { PassportHeroCard } from '@/components/dashboard/PassportHeroCard';
import { PerformanceRadar } from '@/components/dashboard/PerformanceRadar';
import { OracleReportCard } from '@/components/dashboard/OracleReportCard';
import { ZodiacBuffCard } from '@/components/dashboard/ZodiacBuffCard';
import { QuickScrimFlipCard } from '@/components/dashboard/QuickScrimFlipCard';
import { getAthleteDashboardData } from '@/lib/actions/dashboard';

interface GameAccountQueryResult {
  id: string;
  game_name: string | null;
  tag_line: string | null;
  region: string | null;
  verification_status: string;
}

interface PlayerQueryResult {
  id: string;
  game_accounts: GameAccountQueryResult | GameAccountQueryResult[] | null;
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
          <a
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#E8B429] text-black font-black text-xs rounded-xl hover:bg-[#f5c84c] transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>เข้าสู่ระบบทันที</span>
          </a>
        </div>
      </div>
    );
  }

  // 2. ⚡ ดึงข้อมูล Telemetry HUD ตรงจาก Supabase RPC
  const { profile, kpi, radar } = await getAthleteDashboardData();

  // 3. ดึงข้อมูล Player + Game Account (Riot ID) สำหรับ Verification Banner
  const { data: rawPlayer } = await supabase
    .from('players')
    .select(`
      id,
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

  const player = rawPlayer as unknown as PlayerQueryResult | null;
  const rawAccount = player?.game_accounts;
  const rawGameAccount = Array.isArray(rawAccount) ? rawAccount[0] : rawAccount;

  const gameAccount = rawGameAccount
    ? {
        id: rawGameAccount.id,
        game_name: rawGameAccount.game_name ?? '',
        tag_line: rawGameAccount.tag_line ?? '',
        region: rawGameAccount.region ?? '',
        verification_status: rawGameAccount.verification_status,
      }
    : null;

  const playerId = player?.id ?? user.id;

  return (
    <div className="min-h-screen bg-[#080811] text-slate-100 flex flex-col font-sans selection:bg-[#F59E0B] selection:text-black">

      {/* 🧭 RESERVED NAVBAR CONTAINER (72px) */}
      <header className="w-full h-[72px] border-b border-white/[0.08] bg-[#0F111E]/60 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#8B5CF6] flex items-center justify-center text-black font-orbitron font-black text-sm shadow-md shadow-[#F59E0B]/20">
            ZA
          </div>
          <div>
            <span className="font-orbitron font-bold text-sm tracking-wider text-white">ZODIAC ARENA</span>
            <span className="text-[10px] text-slate-400 block font-mono -mt-1 tracking-widest uppercase">Athlete Telemetry Hub</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full border border-dashed border-slate-700 bg-[#080811]/50 text-slate-400 text-xs font-mono">
          <span>&lt;/&gt; RESERVED NAVBAR CONTAINER • 72PX HEIGHT</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono bg-[#080811]/80 px-3 py-1.5 rounded-lg border border-white/[0.08]">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span className="text-slate-300">SERVER: AP-BANGKOK</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#15182A] border border-[#F59E0B]/40 flex items-center justify-center text-xs text-[#F59E0B] font-bold">
            {profile.zodiacSign === 'LEO' ? '♌' : '♈'}
          </div>
        </div>
      </header>

      {/* 🎮 DASHBOARD MAIN VIEWPORT */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 lg:p-6 space-y-5">

        <SponsorSlot />

        {/* BANNER: เชื่อมต่อ Riot ID / สถานะการตรวจสอบ */}
        <DashboardClientAction playerId={playerId} gameAccount={gameAccount} />

        {/* 1. Hero Passport Header */}
        <PassportHeroCard profile={profile} kpi={kpi} />

        {/* 2. Grid Body (3-Column Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* Left Column (3 Cols) */}
          <div className="lg:col-span-3 space-y-5">

            {/* Live Match Check-in Card */}
            <div className="bg-[#0F111E]/88 backdrop-blur-2xl border border-white/[0.08] rounded-[18px] p-5 border-t-2 border-t-[#EF4444] shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-orbitron font-bold text-[#EF4444] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-ping"></span>
                  LIVE MATCH CHECK-IN
                </span>
                <span className="text-[10px] bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 px-2 py-0.5 rounded font-mono font-bold">
                  BO3 • SPLIT 2
                </span>
              </div>

              <div className="text-center py-4 bg-[#080811]/70 rounded-xl border border-white/[0.08] my-2">
                <span className="text-4xl font-black font-orbitron text-white tracking-wider block">
                  00:45:30
                </span>
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mt-1 block">
                  UNTIL CHECK-IN CLOSES
                </span>
              </div>

              <button className="w-full mt-3 py-2.5 rounded-lg bg-gradient-to-r from-[#EF4444] to-red-600 hover:from-red-500 hover:to-[#EF4444] text-white font-orbitron font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#EF4444]/20 transition-all flex items-center justify-center gap-2">
                ✓ CONFIRM TEAM READY
              </button>
            </div>

            {/* Upcoming Match & Map Veto Card */}
            <div className="bg-[#0F111E]/88 backdrop-blur-2xl border border-white/[0.08] rounded-[18px] p-5 border-t-2 border-t-[#8B5CF6] shadow-xl">
              <span className="text-xs font-orbitron font-bold text-[#8B5CF6] uppercase tracking-wider block mb-2">
                UPCOMING MATCH
              </span>

              <div className="text-center py-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase block tracking-widest">OPPONENT</span>
                <h3 className="text-xl font-black font-orbitron text-white tracking-wide mt-0.5">
                  VS ARIES ESPORTS ♈
                </h3>
                <span className="text-xs font-mono text-slate-400">Quarterfinals • Bracket A</span>
              </div>

              {/* Map Veto Status */}
              <div className="mt-4 pt-4 border-t border-white/[0.08]">
                <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                  <span className="text-slate-400 uppercase">MAP VETO STATUS</span>
                  <span className="text-[#F59E0B] font-semibold">PICK PHASE</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#080811]/80 border border-[#EF4444]/40 rounded-lg p-2 relative overflow-hidden">
                    <span className="text-[#EF4444] text-xs font-bold block">✕</span>
                    <span className="text-[11px] font-bold text-slate-200 block font-orbitron mt-1">ASCENT</span>
                    <span className="text-[9px] text-[#EF4444] font-mono uppercase">BANNED</span>
                  </div>

                  <div className="bg-[#080811]/80 border border-[#10B981]/40 rounded-lg p-2 relative overflow-hidden">
                    <span className="text-[#10B981] text-xs font-bold block">✓</span>
                    <span className="text-[11px] font-bold text-slate-200 block font-orbitron mt-1">HAVEN</span>
                    <span className="text-[9px] text-[#10B981] font-mono uppercase">PICKED</span>
                  </div>

                  <div className="bg-[#080811]/80 border border-white/[0.08] rounded-lg p-2">
                    <span className="text-slate-400 text-xs block">⏳</span>
                    <span className="text-[11px] font-bold text-slate-200 block font-orbitron mt-1">ICEBOX</span>
                    <span className="text-[9px] text-slate-400 font-mono uppercase">DECIDER</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Match Finder — Patch V7.01 Match Room & Mercy Scrim System */}
            <QuickScrimFlipCard />

          </div>

          {/* Center Column (6 Cols) */}
          <div className="lg:col-span-6 space-y-5">
            <PerformanceRadar data={radar} />

            {/* Recent Match History */}
            <div className="bg-[#0F111E]/88 backdrop-blur-2xl border border-white/[0.08] rounded-[18px] p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-orbitron font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-[#F59E0B]">🕒</span>
                  RECENT MATCH HISTORY (LAST 3 MATCHES)
                </span>
                <a href="#" className="text-[11px] font-mono text-[#F59E0B] hover:underline">
                  VIEW ALL MATCHES →
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[#0F111E]/90 border border-[#10B981]/40 rounded-xl p-3.5 relative overflow-hidden hover:border-[#10B981] transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-orbitron font-black text-[#10B981]">MATCH 1: WIN</span>
                    <span className="text-[10px] bg-[#10B981]/15 text-[#10B981] px-1.5 py-0.5 rounded font-mono font-bold">13 - 7</span>
                  </div>
                  <p className="text-xs font-bold text-white mt-1 font-orbitron">vs SCORPIO ESPORTS</p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2 pt-2 border-t border-white/[0.08]">
                    <span>ACS: <strong className="text-[#06B6D4]">295</strong></span>
                    <span>KDA: <strong className="text-slate-200">1.6</strong></span>
                  </div>
                </div>

                <div className="bg-[#0F111E]/90 border border-[#EF4444]/40 rounded-xl p-3.5 relative overflow-hidden hover:border-[#EF4444] transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-orbitron font-black text-[#EF4444]">MATCH 2: LOSS</span>
                    <span className="text-[10px] bg-[#EF4444]/15 text-[#EF4444] px-1.5 py-0.5 rounded font-mono font-bold">11 - 13</span>
                  </div>
                  <p className="text-xs font-bold text-white mt-1 font-orbitron">vs LIBRA GAMING</p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2 pt-2 border-t border-white/[0.08]">
                    <span>ACS: <strong className="text-[#06B6D4]">240</strong></span>
                    <span>KDA: <strong className="text-slate-200">1.1</strong></span>
                  </div>
                </div>

                <div className="bg-[#0F111E]/90 border border-[#10B981]/40 rounded-xl p-3.5 relative overflow-hidden hover:border-[#10B981] transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-orbitron font-black text-[#10B981]">MATCH 3: WIN</span>
                    <span className="text-[10px] bg-[#10B981]/15 text-[#10B981] px-1.5 py-0.5 rounded font-mono font-bold">13 - 5</span>
                  </div>
                  <p className="text-xs font-bold text-white mt-1 font-orbitron">vs AQUARIUS CLAN</p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2 pt-2 border-t border-white/[0.08]">
                    <span>ACS: <strong className="text-[#06B6D4]">310</strong></span>
                    <span>KDA: <strong className="text-slate-200">2.1</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (3 Cols) */}
          <div className="lg:col-span-3 space-y-5">
            <OracleReportCard />
            <ZodiacBuffCard />

            {/* Daily Quests & 2-Tier Affiliate Referral */}
            <ApQuestCard />
            <AffiliateWidget />
          </div>

        </div>
      </main>
    </div>
  );
}
