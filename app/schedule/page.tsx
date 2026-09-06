// app/schedule/page.tsx

import { AutoRefresh } from '@/components/auto-refresh';
import React from 'react';
import Link from 'next/link';
import { MatchSchedulePageData, MatchStatus } from '@/types/schedule';
import { setMatchReminderAction } from '@/actions/schedule';

// Mock ข้อมูลเริ่มต้นตรงตาม Draft ของอลิสเป๊ะๆ
const mockScheduleData: MatchSchedulePageData = {
  seasonTitle: 'SUMMER CIRCUIT 2025',
  lastUpdatedText: '15:42 น.',
  liveBannerMatch: {
    id: 'm_live_01',
    timeText: '16:00',
    stageRoundLabel: 'Round of 8',
    mapInfo: 'Map 2/3 · Haven',
    teamAName: 'STELLAR FORCE',
    teamASeedText: '#2 SEED',
    teamBName: 'COSMIC RAGE',
    teamBSeedText: '#5 SEED',
    teamAScore: 8,
    teamBScore: 5,
    status: 'LIVE',
  },
  todayMatches: [
    {
      id: 'm_today_01',
      timeText: '14:00',
      stageRoundLabel: 'QF',
      teamAName: 'ZODIAC APEX',
      teamBName: 'NOVA STORM',
      scoreText: '13 – 7',
      status: 'COMPLETED',
    },
    {
      id: 'm_today_02',
      timeText: '16:00',
      stageRoundLabel: 'QF',
      teamAName: 'STELLAR FORCE',
      teamBName: 'COSMIC RAGE',
      status: 'LIVE',
    },
    {
      id: 'm_today_03',
      timeText: '18:00',
      stageRoundLabel: 'QF',
      teamAName: 'PHANTOM GUILD',
      teamBName: 'IRON WOLVES',
      status: 'UPCOMING',
    },
  ],
  standings: [
    { rank: 1, teamName: 'ZODIAC APEX', wins: 64, losses: 41, winRate: 61, zpTotal: 2450, isHighlight: true },
    { rank: 2, teamName: 'STELLAR FORCE', wins: 58, losses: 39, winRate: 60, zpTotal: 2180 },
    { rank: 3, teamName: 'NOVA STORM', wins: 51, losses: 42, winRate: 55, zpTotal: 1920 },
    { rank: 4, teamName: 'COSMIC RAGE', wins: 47, losses: 49, winRate: 49, zpTotal: 1740 },
    { rank: 5, teamName: 'PHANTOM GUILD', wins: 44, losses: 51, winRate: 46, zpTotal: 1560 },
  ],
};

function renderMatchStatusBadge(status: MatchStatus) {
  if (status === 'COMPLETED') {
    return (
      <span className="rounded bg-[#64dc7c]/10 border border-[#64dc7c]/30 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#6ddc7c]">
        COMPLETED
      </span>
    );
  }
  if (status === 'LIVE') {
    return (
      <span className="flex items-center gap-1.5 rounded bg-[#dc3232]/20 border border-[#dc3232]/50 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#ff6b6b]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#ff4444] animate-pulse" />
        LIVE
      </span>
    );
  }
  return (
    <span className="rounded bg-[#9184d9]/10 border border-[#9184d9]/30 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#9184d9]">
      UPCOMING
    </span>
  );
}

export default function MatchSchedulePage() {
  const data = mockScheduleData;
  const live = data.liveBannerMatch;

  return (
    <div className="min-h-screen bg-[#0D0E1A] text-[#e9e9ed] font-sans pb-20">
      {/* 1. TOP NAVBAR */}
      <nav className="sticky top-0 z-50 flex h-[60px] items-center justify-between border-b border-[#E8B429]/20 bg-[#0D0E1A]/90 px-6 md:px-10 backdrop-blur-md">
        <div className="flex items-center gap-2.5 font-bold tracking-widest text-[#E8B429]">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E8B429] text-xs">
            ★
          </div>
          <span className="text-base">ZODIAC ARENA</span>
        </div>
        <div className="hidden md:flex gap-7 text-[13px] font-medium text-[#b2b6ca]">
          <Link href="#" className="hover:text-[#E8B429] transition-colors">นักกีฬา</Link>
          <Link href="/teams/team_za_01" className="hover:text-[#E8B429] transition-colors">ทีม</Link>
          <Link href="/tournaments" className="hover:text-[#E8B429] transition-colors">ลีก</Link>
          <Link href="/schedule" className="text-[#E8B429] font-bold">Rankings</Link>
        </div>
      </nav>

      {/* 2. PAGE CONTENT */}
      <main className="max-w-[1100px] mx-auto px-6 md:px-8 pt-10">
        {/* Header & Tabs */}
        <div className="mb-7">
          <div className="flex items-baseline gap-3 mb-1.5">
            <span className="text-[11px] font-semibold tracking-[0.16em] text-[#E8B429] uppercase">ตารางแข่งขัน</span>
            <span className="text-[#E8B429]/35 text-xs">·</span>
            <span className="text-[11px] font-semibold tracking-[0.16em] text-[#9397ab] uppercase">MATCH SCHEDULE</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-wider text-white mb-6">
            SUMMER CIRCUIT <span className="text-[#E8B429]">2025</span>
          </h1>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button className="rounded-md bg-[#E8B429] px-4 py-1.5 text-xs font-bold tracking-wider text-[#0D0E1A]">
              ทั้งหมด
            </button>
            <button className="flex items-center gap-1.5 rounded-md border border-[#dc3232]/50 bg-[#dc3232]/15 px-4 py-1.5 text-xs font-semibold tracking-wider text-[#ff6b6b]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff5555] animate-pulse" />
              LIVE
            </button>
            <button className="rounded-md border border-[#E8B429]/25 bg-transparent px-4 py-1.5 text-xs font-semibold tracking-wider text-[#cfd3e5] hover:border-[#E8B429]">
              วันนี้
            </button>
            <button className="rounded-md border border-white/10 bg-transparent px-4 py-1.5 text-xs font-semibold tracking-wider text-[#75798c] hover:text-white">
              ที่ผ่านมา
            </button>
          </div>
        </div>

        {/* 3. LIVE MATCH BANNER */}
        <div className="relative mb-6 overflow-hidden rounded-xl border border-[#dc3232]/55 bg-gradient-to-br from-[#1a0f0f] via-[#1A1C2E] to-[#1a1030] p-6 md:p-8 shadow-[0_0_24px_rgba(220,50,50,0.25)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-3.5">
                <span className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-[#ff5555]">
                  <span className="h-2 w-2 rounded-full bg-[#ff4444] animate-pulse" />
                  LIVE NOW
                </span>
                <span className="text-white/20 text-xs">|</span>
                <span className="text-xs text-[#9397ab]">{live.stageRoundLabel} · {live.mapInfo}</span>
              </div>

              <div className="flex items-center gap-5 md:gap-7 flex-wrap">
                <div>
                  <div className="text-xl md:text-2xl font-black tracking-wider text-[#E8B429]">{live.teamAName}</div>
                  <div className="text-[10px] text-[#75798c] tracking-wider mt-0.5">{live.teamASeedText}</div>
                </div>

                <div className="text-center px-2">
                  <div className="text-3xl md:text-4xl font-black text-white leading-none">
                    <span className="text-[#E8B429]">{live.teamAScore}</span>
                    <span className="text-white/25 mx-2 text-2xl">–</span>
                    <span className="text-[#cfd3e5]">{live.teamBScore}</span>
                  </div>
                  <div className="text-[9px] font-bold tracking-widest text-[#75798c] uppercase mt-1">SCORE</div>
                </div>

                <div>
                  <div className="text-xl md:text-2xl font-black tracking-wider text-[#cfd3e5]">{live.teamBName}</div>
                  <div className="text-[10px] text-[#75798c] tracking-wider mt-0.5">{live.teamBSeedText}</div>
                </div>
              </div>
            </div>

            <button className="flex items-center justify-center gap-2 rounded-lg bg-[#cc2828] px-6 py-3 text-sm font-bold tracking-wider text-white shadow-[0_4px_20px_rgba(204,40,40,0.4)] hover:bg-[#b02222] transition-all flex-shrink-0">
              <span>▶</span>
              <span>ดูสด / WATCH LIVE</span>
            </button>
          </div>
        </div>

        {/* 4. TODAY'S MATCHES */}
        <div className="mb-9">
          <div className="flex items-center gap-2.5 mb-3.5">
            <span className="text-[10px] font-bold tracking-widest text-[#E8B429] uppercase">วันนี้</span>
            <span className="text-[#E8B429]/30">·</span>
            <span className="text-[10px] font-semibold tracking-widest text-[#75798c] uppercase">TODAY&apos;S MATCHES</span>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-[#E8B429]/25 to-transparent" />
          </div>

          <div className="flex flex-col gap-2">
            {data.todayMatches.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border p-4 transition-all ${
                  m.status === 'LIVE'
                    ? 'border-[#dc3232]/45 bg-gradient-to-r from-[#b41e1e]/15 to-[#1A1C2E]'
                    : 'border-white/10 bg-[#1A1C2E]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 text-center flex-shrink-0">
                    <div className="text-base font-extrabold text-[#E8B429] leading-tight">{m.timeText}</div>
                    <div className="text-[9px] text-[#75798c]">{m.stageRoundLabel}</div>
                  </div>
                  <div className="h-7 w-[1px] bg-white/10 flex-shrink-0" />
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-bold text-white tracking-wide">{m.teamAName}</span>
                    <span className="text-xs text-[#75798c]">vs</span>
                    <span className="text-sm font-bold text-white tracking-wide">{m.teamBName}</span>
                    {m.scoreText && (
                      <span className="ml-2 text-xs font-bold text-[#b2b6ca] bg-white/5 px-2 py-0.5 rounded">
                        {m.scoreText}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto flex-shrink-0">
                  {renderMatchStatusBadge(m.status)}
                  {m.status === 'COMPLETED' ? (
                    <button className="rounded-md border border-[#E8B429]/40 bg-transparent px-4 py-1.5 text-xs font-bold text-[#E8B429] hover:bg-[#E8B429]/10">
                      ดูผล
                    </button>
                  ) : m.status === 'LIVE' ? (
                    <button className="rounded-md bg-[#cc2828] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#b02222]">
                      ดูสด
                    </button>
                  ) : (
                    <form
                      action={async () => {
                        'use server';
                        await setMatchReminderAction(m.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-md border border-[#9184d9]/40 bg-transparent px-4 py-1.5 text-xs font-bold text-[#9184d9] hover:border-[#9184d9] hover:text-white"
                      >
                        ตั้งเตือน / REMIND
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. STANDINGS TABLE */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1A1C2E] mb-6">
          <div className="flex items-baseline gap-2.5 border-b border-[#E8B429]/15 p-4 md:px-6">
            <span className="text-[11px] font-bold tracking-wider text-[#E8B429] uppercase">ตารางคะแนน</span>
            <span className="text-[#E8B429]/30">·</span>
            <h2 className="text-sm font-extrabold tracking-wider text-white uppercase">SUMMER CIRCUIT STANDINGS</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0D0E1A]/60 text-[9px] font-bold tracking-widest text-[#75798c] uppercase border-b border-white/5">
                <tr>
                  <th className="py-2.5 px-6 w-16">อันดับ</th>
                  <th className="py-2.5 px-4">ทีม</th>
                  <th className="py-2.5 px-4 text-center w-14">W</th>
                  <th className="py-2.5 px-4 text-center w-14">L</th>
                  <th className="py-2.5 px-4 text-center w-16">WR%</th>
                  <th className="py-2.5 pr-6 pl-4 text-right w-28">ZP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.standings.map((team) => (
                  <tr
                    key={team.rank}
                    className={`transition-colors ${
                      team.isHighlight
                        ? 'bg-gradient-to-r from-[#E8B429]/10 via-[#E8B429]/5 to-transparent'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-1.5">
                        {team.isHighlight && <span className="text-[#E8B429] text-xs">★</span>}
                        <span className={`font-extrabold ${team.isHighlight ? 'text-[#E8B429]' : 'text-[#75798c]'}`}>
                          {team.rank}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs font-bold ${
                            team.isHighlight
                              ? 'border-[#E8B429]/40 bg-[#E8B429]/15 text-[#E8B429]'
                              : 'border-white/10 bg-white/5 text-[#9397ab]'
                          }`}
                        >
                          {team.teamName.slice(0, 2)}
                        </div>
                        <span className={`font-bold tracking-wide ${team.isHighlight ? 'text-[#E8B429]' : 'text-white'}`}>
                          {team.teamName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-[#4ade80]">{team.wins}</td>
                    <td className="py-3 px-4 text-center font-bold text-[#75798c]">{team.losses}</td>
                    <td className="py-3 px-4 text-center font-bold text-[#cfd3e5]">{team.winRate}%</td>
                    <td className={`py-3 pr-6 pl-4 text-right font-black ${team.isHighlight ? 'text-[#E8B429]' : 'text-[#cfd3e5]'}`}>
                      {team.zpTotal.toLocaleString()} ZP
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. BOTTOM STRIP */}
<div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#1A1C2E]/60 px-5 py-3 text-[10px]">
  <div className="flex items-center gap-2">
    <span className="h-2 w-2 rounded-full bg-[#34d399] animate-pulse" />
    <span className="text-[#75798c]">
      <span className="text-[#9397ab]">อัพเดทล่าสุด</span> · LAST UPDATED:{' '}
      <span className="font-bold text-[#34d399] ml-1">{data.lastUpdatedText}</span>
    </span>
  </div>
  
  {/* ตัวนับเวลาถอยหลัง 30 วิ พร้อม Refresh อัตโนมัติ */}
  <AutoRefresh intervalMs={30000} />
</div>
      </main>
    </div>
  );
}
