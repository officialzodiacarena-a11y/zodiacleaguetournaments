// app/tournaments/page.tsx

import React from 'react';
import Link from 'next/link';
import { TournamentRegistryPageData, TournamentItem } from '@/types/tournament';

// Mock ข้อมูลเริ่มต้นตรงตาม Draft ของอลิสเป๊ะๆ
const mockRegistryData: TournamentRegistryPageData = {
  activeSeason: 'SUMMER',
  circuitActiveText: 'CIRCUIT ACTIVE',
  registrationDeadlineText: '30 มิ.ย.',
  userZpSummary: {
    seasonName: 'Summer Circuit',
    accumulatedZp: 750,
    rankNumber: 23,
    nextRankZp: 250,
    nextRankTarget: 22,
    progressPercentage: 75,
  },
  tournaments: [
    {
      id: 'tour_summer_open_1',
      circuitSeasonText: 'SUMMER CIRCUIT · 2026',
      name: 'SUMMER OPEN I',
      status: 'OPEN',
      format: '5v5 SINGLE ELIM',
      prizePoolZp: 1000,
      prizeTopText: 'TOP 8',
      dateRangeText: '14–16 มิ.ย.',
      yearText: '2026',
      registeredTeams: 12,
      maxTeams: 16,
      accentTheme: 'gold',
    },
    {
      id: 'tour_summer_open_2',
      circuitSeasonText: 'SUMMER CIRCUIT · 2026',
      name: 'SUMMER OPEN II',
      status: 'UPCOMING',
      format: '5v5 DOUBLE ELIM',
      prizePoolZp: 1500,
      prizeTopText: 'TOP 8',
      dateRangeText: '21–23 มิ.ย.',
      yearText: '2026',
      registeredTeams: 4,
      maxTeams: 16,
      accentTheme: 'purple',
    },
    {
      id: 'tour_summer_invitational',
      circuitSeasonText: 'SUMMER CIRCUIT · 2026',
      name: 'SUMMER INVITATIONAL',
      status: 'CONCLUDED',
      format: '5v5 DOUBLE ELIM',
      prizePoolZp: 2000,
      prizeTopText: 'TOP 8',
      dateRangeText: '1–3 มิ.ย.',
      yearText: '2026',
      registeredTeams: 16,
      maxTeams: 16,
      accentTheme: 'gray',
    },
    {
      id: 'tour_summer_finals',
      circuitSeasonText: 'SUMMER CIRCUIT · 2026',
      name: 'SUMMER FINALS',
      status: 'NOT_YET_OPEN',
      format: 'INVITE ONLY',
      prizePoolZp: 5000,
      prizeTopText: 'TOP 4',
      dateRangeText: '28–30 มิ.ย.',
      yearText: '2026',
      registeredTeams: 0,
      maxTeams: 8,
      accentTheme: 'purple',
    },
  ],
};

function renderStatusBadge(status: TournamentItem['status']) {
  switch (status) {
    case 'OPEN':
      return (
        <span className="rounded bg-[#4ade80]/15 border border-[#4ade80]/35 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#4ade80]">
          ● OPEN
        </span>
      );
    case 'UPCOMING':
      return (
        <span className="rounded bg-[#60a5fa]/15 border border-[#60a5fa]/35 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#60a5fa]">
          ◆ UPCOMING
        </span>
      );
    case 'CONCLUDED':
      return (
        <span className="rounded bg-[#9397ab]/10 border border-[#9397ab]/25 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#9397ab]">
          ■ CONCLUDED
        </span>
      );
    case 'NOT_YET_OPEN':
      return (
        <span className="rounded bg-[#60a5fa]/15 border border-[#60a5fa]/35 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#60a5fa]">
          ◆ UPCOMING
        </span>
      );
  }
}

function renderFormatBadge(format: TournamentItem['format']) {
  if (format === 'INVITE ONLY') {
    return (
      <span className="rounded bg-[#E8B429]/10 border border-[#E8B429]/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#E8B429]">
        INVITE ONLY
      </span>
    );
  }
  return (
    <span className="rounded bg-[#9184d9]/10 border border-[#9184d9]/25 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-[#b5abfc]">
      {format}
    </span>
  );
}

export default function TournamentRegistryPage() {
  const data = mockRegistryData;
  const seasons: Array<{ label: string; key: typeof data.activeSeason }> = [
    { label: 'SPRING', key: 'SPRING' },
    { label: 'SUMMER', key: 'SUMMER' },
    { label: 'FALL', key: 'FALL' },
    { label: 'WINTER', key: 'WINTER' },
  ];

  return (
    <div className="min-h-screen bg-[#0D0E1A] text-[#e9e9ed] font-sans pb-20">
      {/* 1. TOP NAV */}
      <nav className="sticky top-0 z-50 flex h-[60px] items-center justify-between border-b border-[#E8B429]/15 bg-[#0D0E1A]/95 px-6 md:px-10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E8B429] text-[#E8B429] font-bold text-xs">
            ★
          </div>
          <span className="font-extrabold text-sm tracking-wider text-[#E8B429]">ZODIAC</span>
          <span className="text-sm font-normal tracking-wide text-[#E8B429]/60">ARENA</span>
        </div>
        <div className="hidden md:flex gap-8 text-[13px] font-medium text-[#e9e9ed]/55">
          <Link href="#" className="hover:text-[#E8B429] transition-colors">นักกีฬา</Link>
          <Link href="/teams/team_za_01" className="hover:text-[#E8B429] transition-colors">ทีม</Link>
          <Link href="/tournaments" className="text-[#E8B429] font-semibold border-b-2 border-[#E8B429] pb-0.5">ลีก</Link>
          <Link href="#" className="hover:text-[#E8B429] transition-colors">Rankings</Link>
        </div>
      </nav>

      {/* 2. PAGE HEADER */}
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-2.5">
          <span className="text-[11px] font-bold tracking-[0.18em] text-[#E8B429]/60 uppercase">ลีก · LEAGUE</span>
          <div className="h-[1px] w-10 bg-gradient-to-r from-[#E8B429]/50 to-transparent" />
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-wider leading-tight mb-2.5">
          <span className="text-white">TOURNAMENT</span>{' '}
          <span className="bg-gradient-to-r from-[#E8B429] via-[#f5d478] to-[#E8B429] bg-clip-text text-transparent">
            REGISTRY
          </span>
        </h1>
        <p className="text-sm text-[#e9e9ed]/50 tracking-wide">เลือกรายการแข่งขันที่ต้องการสมัคร</p>
      </div>

      {/* 3. SEASON SELECTOR */}
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        <div className="flex items-end border-b border-[#E8B429]/15">
          {seasons.map((s) => {
            const isActive = s.key === data.activeSeason;
            return (
              <button
                key={s.key}
                type="button"
                className={`relative px-7 py-3 text-[13px] tracking-wider transition-colors ${
                  isActive
                    ? 'font-bold text-[#E8B429] border-b-2 border-[#E8B429] -mb-[1px]'
                    : 'font-medium text-[#e9e9ed]/40 hover:text-[#E8B429]'
                }`}
              >
                {s.label}
                {isActive && (
                  <span className="absolute top-2 right-1.5 h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2.5 py-3 pb-6 text-[11px]">
          <span className="inline-flex items-center gap-1.5 font-bold tracking-wider text-[#4ade80] uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-pulse" />
            {data.circuitActiveText}
          </span>
          <span className="text-[#e9e9ed]/25">·</span>
          <span className="text-[#e9e9ed]/45">
            ลงทะเบียนได้ถึง <span className="font-semibold text-[#e9e9ed]/70">{data.registrationDeadlineText}</span>
          </span>
        </div>
      </div>

      {/* 4. TOURNAMENTS GRID */}
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {data.tournaments.map((tour) => {
          const fillPercentage = (tour.registeredTeams / tour.maxTeams) * 100;
          const isConcluded = tour.status === 'CONCLUDED';
          const isNotYetOpen = tour.status === 'NOT_YET_OPEN';

          const topStripeClass =
            tour.accentTheme === 'gold'
              ? 'from-[#E8B429] via-[#E8B429]/30 to-transparent'
              : tour.accentTheme === 'purple'
              ? 'from-[#9184d9] via-[#9184d9]/30 to-transparent'
              : 'from-[#9397ab]/50 via-[#9397ab]/10 to-transparent';

          const progressClass =
            tour.accentTheme === 'gold'
              ? 'bg-gradient-to-r from-[#E8B429] to-[#f5d478]'
              : tour.accentTheme === 'purple'
              ? 'bg-gradient-to-r from-[#9184d9] to-[#b5abfc]'
              : 'bg-[#9397ab]/35';

          return (
            <div
              key={tour.id}
              className={`relative overflow-hidden rounded-xl border bg-[#1A1C2E] p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(232,180,41,0.12)] ${
                isConcluded ? 'border-white/10 opacity-75' : 'border-[#E8B429]/20'
              }`}
            >
              {/* Card Top Accent Line */}
              <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${topStripeClass}`} />

              {/* Title & Badges */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-[10px] font-bold tracking-widest text-[#E8B429]/60 uppercase mb-1.5">
                    {tour.circuitSeasonText}
                  </div>
                  <h2 className="text-xl font-extrabold tracking-wide text-white">{tour.name}</h2>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {renderStatusBadge(tour.status)}
                  {renderFormatBadge(tour.format)}
                </div>
              </div>

              {/* Prize & Date Box */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="rounded-lg border border-[#E8B429]/15 bg-[#E8B429]/5 p-3">
                  <div className="text-[10px] tracking-wider text-[#e9e9ed]/40 mb-1">PRIZE POOL</div>
                  <div className="text-lg font-extrabold text-[#E8B429] tracking-wide">
                    ZP {tour.prizePoolZp.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#e9e9ed]/40 mt-0.5">{tour.prizeTopText}</div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-[10px] tracking-wider text-[#e9e9ed]/40 mb-1">DATE</div>
                  <div className="text-sm font-bold text-[#e9e9ed]">{tour.dateRangeText}</div>
                  <div className="text-[10px] text-[#e9e9ed]/40 mt-0.5">{tour.yearText}</div>
                </div>
              </div>

              {/* Registered Count */}
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[#e9e9ed]/60">Teams Registered</span>
                <div className="font-bold">
                  <span className="text-white">{tour.registeredTeams}</span>
                  <span className="text-[#e9e9ed]/30 mx-1">/</span>
                  <span className="text-[#e9e9ed]/50">{tour.maxTeams} TEAMS</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1 w-full overflow-hidden rounded bg-white/10 mb-5">
                <div className={`h-full ${progressClass}`} style={{ width: `${fillPercentage}%` }} />
              </div>

              {/* Action Button */}
              {isConcluded ? (
                <button
                  type="button"
                  className="w-full rounded-lg border border-white/20 bg-transparent py-2.5 text-xs font-bold tracking-wider text-[#e9e9ed]/60 hover:border-[#9184d9] hover:text-[#9184d9] transition-colors"
                >
                  ดูผล / VIEW RESULTS
                </button>
              ) : isNotYetOpen ? (
                <button
                  type="button"
                  disabled
                  className="w-full rounded-lg border border-white/10 bg-transparent py-2.5 text-xs font-bold tracking-wider text-[#e9e9ed]/40 cursor-not-allowed"
                >
                  ยังไม่เปิดรับ / NOT YET OPEN
                </button>
              ) : (
                <Link
                  href={`/tournaments/${tour.id}/register`}
                  className="block w-full text-center rounded-lg bg-[#E8B429] py-2.5 text-xs font-black tracking-wider text-[#0D0E1A] hover:bg-[#f0c040] hover:shadow-[0_0_20px_rgba(232,180,41,0.4)] transition-all"
                >
                  สมัครแข่ง / REGISTER
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* 5. ZP SUMMARY STRIP */}
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E8B429]/20 bg-gradient-to-r from-[#E8B429]/10 via-[#9184d9]/10 to-transparent p-5 md:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8B429]/30 bg-[#E8B429]/15 text-lg text-[#E8B429]">
              🏆
            </div>
            <div>
              <div className="text-[11px] text-[#e9e9ed]/45 tracking-wider mb-0.5">
                ZP ที่คุณสะสมใน {data.userZpSummary.seasonName}
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl font-black text-[#E8B429]">
                  {data.userZpSummary.accumulatedZp}{' '}
                  <span className="text-sm font-semibold">ZP</span>
                </span>
                <span className="text-[#e9e9ed]/35">·</span>
                <span className="text-xs text-[#e9e9ed]/60">
                  อันดับ <span className="font-bold text-[#9184d9]">#{data.userZpSummary.rankNumber}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-[#e9e9ed]/35 tracking-wider mb-0.5">TO NEXT RANK</div>
              <div className="text-xs font-semibold text-[#e9e9ed]/70">
                {data.userZpSummary.nextRankZp} ZP <span className="text-[#e9e9ed]/30 font-normal">to</span> #{data.userZpSummary.nextRankTarget}
              </div>
            </div>
            <div className="w-20">
              <div className="h-1.5 w-full overflow-hidden rounded bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-[#E8B429] to-[#f5d478]"
                  style={{ width: `${data.userZpSummary.progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
