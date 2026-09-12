// app/page.tsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { 
  Radio, 
  Trophy, 
  UserCheck, 
  Store, 
  ArrowRight, 
  ExternalLink, 
  CheckCircle2, 
  Activity,
  Flame,
  Users
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface LiveMatchRow {
  id: string;
  status: string;
  best_of: number;
  score_a: number;
  score_b: number;
  team_a: { name: string; tag: string } | { name: string; tag: string }[] | null;
  team_b: { name: string; tag: string } | { name: string; tag: string }[] | null;
}

interface UserProfileData {
  id: string;
  athlete_id: string | null;
  display_name: string | null;
  real_name: string | null;
  ap_balance: number;
  game_account: {
    game_name: string | null;
    tag_line: string | null;
    verification_status: string;
  } | null;
}

export default async function LandingPage() {
  const supabase = await createClient();

  // 1. ตรวจสอบสถานะ Auth และข้อมูลผู้เล่นตาม Schema จริง (display_name, real_name, athlete_id)
  const { data: { user } } = await supabase.auth.getUser();

  let athleteProfile: UserProfileData | null = null;
  if (user) {
    const { data: player } = await supabase
      .from('players')
      .select(`
        id,
        athlete_id,
        display_name,
        real_name,
        ap_balance,
        game_accounts (
          game_name,
          tag_line,
          verification_status
        )
      `)
      .eq('user_id', user.id)
      .maybeSingle();

    if (player) {
      const rawAccounts = player.game_accounts;
      const account = Array.isArray(rawAccounts) ? rawAccounts[0] : rawAccounts;

      athleteProfile = {
        id: player.id,
        athlete_id: player.athlete_id,
        display_name: player.display_name,
        real_name: player.real_name,
        ap_balance: player.ap_balance ?? 0,
        game_account: account ? {
          game_name: account.game_name,
          tag_line: account.tag_line,
          verification_status: account.verification_status,
        } : null,
      };
    }
  }

  // 2. ดึงแมตช์กำลังแข่งสด (Fault-Tolerant ด้วย Promise.allSettled)
  const results = await Promise.allSettled([
    supabase
      .from('matches')
      .select(`
        id,
        status,
        best_of,
        score_a,
        score_b,
        team_a:teams!matches_team_a_id_fkey ( name, tag ),
        team_b:teams!matches_team_b_id_fkey ( name, tag )
      `)
      .eq('status', 'LIVE')
      .limit(3),
    supabase
      .from('tournaments')
      .select('id', { count: 'exact', head: true })
      .in('status', ['REGISTRATION_OPEN', 'ACTIVE']),
  ]);

  const liveMatchesRaw = results[0].status === 'fulfilled' ? results[0].value.data ?? [] : [];
  const openTournamentsCount = results[1].status === 'fulfilled' ? results[1].value.count ?? 0 : 0;

  const liveMatches = (liveMatchesRaw as unknown as LiveMatchRow[]).map((m) => {
    const teamA = Array.isArray(m.team_a) ? m.team_a[0] : m.team_a;
    const teamB = Array.isArray(m.team_b) ? m.team_b[0] : m.team_b;
    return {
      id: m.id,
      scoreA: m.score_a,
      scoreB: m.score_b,
      teamAName: teamA?.name || 'TBD',
      teamATag: teamA?.tag || 'A',
      teamBName: teamB?.name || 'TBD',
      teamBTag: teamB?.tag || 'B',
    };
  });

  return (
    <main className="min-h-screen bg-[#08090F] text-[#F9EDD8] font-sans relative overflow-x-hidden selection:bg-[#E8B429] selection:text-black select-none">
      
      {/* Background Faceoff Image & Cyber HUD Overlay */}
      <div className="fixed inset-0 -z-20 opacity-25 pointer-events-none">
        <Image
          src="/images/seasons/BG.png"
          alt="Zodiac Arena Background"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {/* Cyber Grid Pattern */}
      <div 
        className="pointer-events-none fixed inset-0 opacity-20 -z-10" 
        style={{
          backgroundImage: 'linear-gradient(rgba(232, 180, 41, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-[#E8B429]/15 via-[#00D4FF]/5 to-transparent rounded-full blur-[140px]" />

      {/* ====================================================================
          SECTION 1: TOP LIVE TELEMETRY STRIP
      ==================================================================== */}
      <div className="border-b border-white/5 bg-[#0D0E1A]/80 backdrop-blur-md px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#E3322F] animate-ping" />
            <span className="font-black text-[#E3322F] uppercase tracking-wider">LIVE TELEMETRY:</span>
          </div>

          <div className="flex-1 overflow-x-auto flex items-center gap-6 no-scrollbar py-0.5">
            {liveMatches.length > 0 ? (
              liveMatches.map((match) => (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}/lobby`}
                  className="flex items-center gap-2 hover:text-[#E8B429] transition-colors whitespace-nowrap"
                >
                  <span className="font-bold text-white">[{match.teamATag}]</span>
                  <span className="text-[#E8B429] font-black">{match.scoreA} : {match.scoreB}</span>
                  <span className="font-bold text-white">[{match.teamBTag}]</span>
                  <span className="text-[10px] text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                    WATCH LIVE
                  </span>
                </Link>
              ))
            ) : (
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E8B429]" />
                <span>ALL CIRCUITS STANDBY · NEXT TOURNAMENT SOON ({openTournamentsCount} OPEN FOR REGISTRATION)</span>
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3 text-[11px] text-[#94A3B8]">
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-[#4CAF50]" />
              <span>SERVER: ASIA-BANGKOK</span>
            </span>
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
        
        {/* ====================================================================
            SECTION 2: HERO CYBER-HUD SECTION
        ==================================================================== */}
        <section className="text-center space-y-6 pt-6 md:pt-12">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#E8B429]/30 bg-[#E8B429]/10 text-xs font-mono font-bold text-[#E8B429]">
            <Flame className="w-3.5 h-3.5 text-[#E8B429]" />
            <span>VALORANT ESPORTS INTEGRATED ECOSYSTEM</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs md:text-sm font-mono tracking-[0.3em] text-[#94A3B8] uppercase">
              12 SIGNS • 4 SEASONS • 1 DESTINY
            </h2>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-none">
              ZODIAC <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E8B429] via-[#FCE49C] to-[#E8B429]">ARENA</span>
            </h1>
          </div>

          <p className="max-w-2xl mx-auto text-sm md:text-base text-[#94A3B8] leading-relaxed">
            เวทีประลองอีสปอร์ตระดับมืออาชีพ ผสานระบบพาสปอร์ตนักกีฬา การสะสมแต้ม ZP ชิงตั๋ว Grand Finals และระบบ Watch-to-Earn แลกของรางวัล ZODIAC MARKETPLACE
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/home"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#E8B429] text-[#08090F] font-black text-sm tracking-wider hover:bg-[#f5c84c] hover:shadow-[0_0_25px_rgba(232,180,41,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>เข้าสู่สนามประลอง (TOURNAMENT HUB)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href={athleteProfile ? '/dashboard' : '/login'}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/15 bg-white/5 text-white font-bold text-sm tracking-wider hover:bg-white/10 hover:border-white/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{athleteProfile ? 'ไปยัง DASHBOARD ของคุณ' : 'ลงทะเบียนนักกีฬา (ATHLETE ACCESS)'}</span>
              <ExternalLink className="w-4 h-4 text-zinc-400" />
            </Link>
          </div>

        </section>

        {/* ====================================================================
            SECTION 3: DYNAMIC ONBOARDING / PASSPORT STRIP
        ==================================================================== */}
        <section className="rounded-2xl border border-white/10 bg-[#101223]/90 backdrop-blur-md p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8B429]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#E8B429]" />
                <span className="text-xs font-mono uppercase tracking-wider text-[#E8B429]">
                  {athleteProfile ? 'ATHLETE PASSPORT ACTIVE' : 'FAST-TRACK ONBOARDING'}
                </span>
              </div>
              
              <h3 className="text-xl md:text-2xl font-black text-white">
                {athleteProfile 
                  ? `ยินดีต้อนรับกลับ, ${athleteProfile.display_name || athleteProfile.real_name || athleteProfile.athlete_id || 'ATHLETE'}`
                  : 'เริ่มต้นเส้นทางสู่นักกีฬาอีสปอร์ตมืออาชีพ'}
              </h3>
              
              <p className="text-xs md:text-sm text-[#94A3B8] max-w-xl">
                {athleteProfile
                  ? 'เชื่อมต่อ Riot ID เรียบร้อยแล้ว พร้อมเข้าร่วมการแข่งขันและสะสมคะแนน ZP ประจำฤดูกาล'
                  : 'ลงทะเบียนเข้าสู่ระบบเพียงครั้งเดียวเพื่อเชื่อมโยง Riot ID สะสมประวัติการแข่งขัน และสร้างสถิติลงบน Athlete Passport'}
              </p>
            </div>

            <div className="w-full lg:w-auto flex-shrink-0">
              {athleteProfile ? (
                <div className="flex flex-wrap items-center gap-3 bg-[#16192E] p-4 rounded-xl border border-white/5">
                  <div>
                    <div className="text-[10px] font-mono text-zinc-500">ATHLETE / RIOT ID</div>
                    <div className="text-sm font-bold text-white font-mono">
                      {athleteProfile.game_account?.game_name ? (
                        <>
                          {athleteProfile.game_account.game_name}{' '}
                          <span className="text-[#E8B429]">#{athleteProfile.game_account.tag_line}</span>
                        </>
                      ) : (
                        <span>{athleteProfile.display_name || athleteProfile.athlete_id}</span>
                      )}
                    </div>
                  </div>

                  <div className="h-8 w-[1px] bg-white/10 mx-2" />

                  <div>
                    <div className="text-[10px] font-mono text-zinc-500">AP BALANCE</div>
                    <div className="text-sm font-bold text-[#E8B429] font-mono">
                      {athleteProfile.ap_balance.toLocaleString()} AP
                    </div>
                  </div>

                  <Link
                    href="/profile"
                    className="ml-2 px-4 py-2 rounded-lg bg-[#E8B429]/15 border border-[#E8B429]/30 text-xs font-bold text-[#E8B429] hover:bg-[#E8B429]/25 transition-all"
                  >
                    ดูพาสปอร์ต
                  </Link>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#00D4FF] text-[#08090F] font-black text-xs uppercase tracking-wider hover:bg-[#33ddff] hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>เชื่อมต่อบัญชีนักกีฬา (1-CLICK CONNECT)</span>
                </Link>
              )}
            </div>

          </div>
        </section>

        {/* ====================================================================
            SECTION 4: 4-PILLAR ECOSYSTEM GRID (WITH 3D FLIP CARD)
        ==================================================================== */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-[#E8B429]">
                PLATFORM ARCHITECTURE
              </h2>
              <h3 className="text-xl md:text-2xl font-black text-white mt-1">
                4 เสาหลักระบบนิเวศ ZODIAC ARENA
              </h3>
            </div>
            <span className="text-xs font-mono text-zinc-500 hidden sm:inline-block">
              INTEGRATED VCT STANDARD
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Pillar 1: Tournament Circuit */}
            <Link
              href="/tournament"
              className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#101223] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#E8B429]/40 hover:shadow-[0_10px_30px_rgba(232,180,41,0.12)] flex flex-col justify-between h-[300px]"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8B429]/15 border border-[#E8B429]/30 text-[#E8B429]">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">01 / CIRCUIT</span>
                </div>
                <h4 className="text-base font-black text-white group-hover:text-[#E8B429] transition-colors">
                  TOURNAMENT CIRCUIT
                </h4>
                <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                  การแข่งขัน 4 ฤดูกาล (Spring, Summer, Fall, Winter) เก็บคะแนน ZP ชิงโควตาสู่ Grand Finals
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-[#E8B429]">
                <span>เข้าสู่หน้ารายการแข่งขัน</span>
                <span>→</span>
              </div>
            </Link>

            {/* Pillar 2: ATHLETE PASSPORT (3D FLIP CARD -> ATHLETE TRANSFER MARKET) */}
            <div className="group h-[300px] [perspective:1000px]">
              <div className="relative h-full w-full rounded-xl transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] shadow-xl cursor-pointer">
                
                {/* --- FRONT: ATHLETE PASSPORT --- */}
                <div className="absolute inset-0 h-full w-full rounded-xl border border-white/5 bg-[#101223] p-6 [backface-visibility:hidden] flex flex-col justify-between group-hover:border-[#00D4FF]/40">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00D4FF]/15 border border-[#00D4FF]/30 text-[#00D4FF]">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-1.5 w-1.5 rounded-full bg-[#00D4FF] animate-pulse" />
                        <span className="text-[10px] font-mono text-[#00D4FF]">02 / PASSPORT</span>
                      </div>
                    </div>
                    <h4 className="text-base font-black text-[#00D4FF]">
                      ATHLETE PASSPORT
                    </h4>
                    <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                      เก็บบันทึกประวัติ ผลงานเรตติ้ง KDA, ACS, ADR และเหรียญเกียรติยศระดับสโมสร
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-mono">
                    <span className="text-[#00D4FF] font-bold">ดูพาสปอร์ตนักกีฬา →</span>
                    <span className="text-zinc-500 text-[10px] bg-white/5 px-2 py-0.5 rounded">ชี้เพื่อดูตลาดซื้อขาย</span>
                  </div>
                </div>

                {/* --- BACK: ATHLETE TRANSFER MARKET (FLIPPED) --- */}
                <div className="absolute inset-0 h-full w-full rounded-xl border-2 border-[#E8B429] bg-gradient-to-br from-[#1A1810] via-[#121424] to-[#0D0E1A] p-5 text-white [transform:rotateY(180deg)] [backface-visibility:hidden] flex flex-col justify-between shadow-[0_0_30px_rgba(232,180,41,0.25)]">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-[#E8B429]" />
                        <span className="text-[11px] font-black font-mono tracking-wider text-[#E8B429] uppercase">
                          ATHLETE MARKET
                        </span>
                      </div>
                      <span className="text-[9px] font-mono bg-[#E8B429]/20 text-[#E8B429] px-2 py-0.5 rounded border border-[#E8B429]/40 font-bold">
                        P2P ESCROW
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-300 font-medium line-clamp-2">
                      ตลาดประมูลและย้ายสังกัดนักกีฬา (FFXI Blind Auction & Buyout)
                    </p>

                    {/* Featured Athlete Snippet */}
                    <div className="mt-2.5 p-2 rounded-xl bg-black/50 border border-white/10 space-y-1 font-mono text-[10px]">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-bold">SHADOW_ZX #TH1</span>
                        <span className="text-[#E8B429] font-bold">IMMORTAL 3</span>
                      </div>
                      <div className="flex justify-between text-zinc-400 text-[9px]">
                        <span>ROLE: DUELIST</span>
                        <span className="text-[#00D4FF]">ACS 274 • K/D 1.87</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-white/10 text-[10px]">
                        <span className="text-zinc-400">BID START:</span>
                        <span className="text-[#E8B429] font-black">2,500 AP</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/profile"
                    className="w-full text-center py-2 rounded-lg bg-[#E8B429] hover:bg-[#ffc935] text-black font-black text-[11px] tracking-wider uppercase transition-all shadow-md font-mono mt-1"
                  >
                    เข้าสู่ตลาดซื้อขายนักกีฬา →
                  </Link>
                </div>

              </div>
            </div>

            {/* Pillar 3: Watch-to-Earn AP */}
            <Link
              href="/schedule"
              className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#101223] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#9184D9]/40 hover:shadow-[0_10px_30px_rgba(145,132,217,0.12)] flex flex-col justify-between h-[300px]"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#9184D9]/15 border border-[#9184D9]/30 text-[#9184D9]">
                    <Radio className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">03 / STREAM</span>
                </div>
                <h4 className="text-base font-black text-white group-hover:text-[#9184D9] transition-colors">
                  WATCH-TO-EARN & AP
                </h4>
                <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                  รับชมสตรีมสดแมตช์สำคัญ ทายผลการแข่งขันแบบ Pari-Mutuel และสะสมแต้ม AP รายวัน
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-[#9184D9]">
                <span>ดูตารางถ่ายทอดสด</span>
                <span>→</span>
              </div>
            </Link>

            {/* Pillar 4: ZODIAC MARKETPLACE (UPDATED NAME) */}
            <Link
              href="/store"
              className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#101223] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#4CAF50]/40 hover:shadow-[0_10px_30px_rgba(76,175,80,0.12)] flex flex-col justify-between h-[300px]"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#4CAF50]/15 border border-[#4CAF50]/30 text-[#4CAF50]">
                    <Store className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">04 / REWARDS</span>
                </div>
                <h4 className="text-base font-black text-white group-hover:text-[#4CAF50] transition-colors">
                  ZODIAC MARKETPLACE
                </h4>
                <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                  นำแต้ม AP ที่สะสมได้มาแลกรับของรางวัลพาร์ตเนอร์ SINOPEC และสินค้าพรีเมียมลิขสิทธิ์
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-[#4CAF50]">
                <span>เข้าสู่ร้านค้าแลกของรางวัล</span>
                <span>→</span>
              </div>
            </Link>

          </div>
        </section>

        {/* ====================================================================
            FOOTER STRIP
        ==================================================================== */}
        <footer className="border-t border-white/5 pt-8 pb-4 text-center text-xs text-zinc-500 font-mono space-y-2">
          <p>© 2026 ZODIAC ARENA. ALL RIGHTS RESERVED. POWERED BY AI CASING & ESPORTS TELEMETRY.</p>
          <div className="flex items-center justify-center gap-4 text-[11px]">
            <Link href="/terms" className="hover:text-zinc-400 underline">Terms of Service</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-zinc-400 underline">Privacy Policy</Link>
          </div>
        </footer>

      </div>
    </main>
  );
}
