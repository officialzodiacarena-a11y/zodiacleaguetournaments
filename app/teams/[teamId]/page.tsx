// app/teams/[teamId]/page.tsx

import React from 'react';
import { TeamProfileData, ValorantRole } from '@/types/team';
import { lockRosterAction } from '@/actions/team';

// Mock ข้อมูลเริ่มต้นตรงตาม Draft ของอลิสเป๊ะๆ
const mockTeamData: TeamProfileData = {
  id: 'team_za_01',
  name: 'ZODIAC APEX',
  tag: '[ZA]',
  orgName: 'ZODIAC ESPORTS ORG',
  logoInitials: 'ZA',
  currentRank: 12,
  seasonName: 'SEASON 7 · ACT II',
  stats: {
    wins: 64,
    losses: 41,
    winRate: 61,
    tournamentsEntered: 18,
    zpEarned: '142K',
  },
  rosterStatus: 'OPEN',
  lockDeadlineText: '3 days remaining',
  startingRoster: [
    {
      id: 'p1',
      userId: 'u1',
      handle: 'VIPER_99',
      fullNameTh: 'วิชาญ พรหมรักษ์',
      initials: 'VP',
      role: 'DUELIST',
      isCaptain: true,
      isSubstitute: false,
      agentIcon: '🐍',
      kdRatio: 2.41,
      avgDmg: 284,
    },
    {
      id: 'p2',
      userId: 'u2',
      handle: 'SKYWING',
      fullNameTh: 'สกาย วงษ์สมบัติ',
      initials: 'SK',
      role: 'INITIATOR',
      isCaptain: false,
      isSubstitute: false,
      agentIcon: '⚡',
      kdRatio: 1.98,
      avgDmg: 261,
    },
    {
      id: 'p3',
      userId: 'u3',
      handle: 'DARKSMOKE',
      fullNameTh: 'ธนกฤต อินทรสุ',
      initials: 'DK',
      role: 'CONTROLLER',
      isCaptain: false,
      isSubstitute: false,
      agentIcon: '💨',
      kdRatio: 1.72,
      avgDmg: 238,
    },
    {
      id: 'p4',
      userId: 'u4',
      handle: 'WALLFANG',
      fullNameTh: 'วัลลภ ศรีอินทร์',
      initials: 'WL',
      role: 'SENTINEL',
      isCaptain: false,
      isSubstitute: false,
      agentIcon: '🛡️',
      kdRatio: 1.85,
      avgDmg: 247,
    },
    {
      id: 'p5',
      userId: 'u5',
      handle: 'NEXUSFIRE',
      fullNameTh: 'ณัฐวุฒิ พลายแก้ว',
      initials: 'NX',
      role: 'FLEX',
      isCaptain: false,
      isSubstitute: false,
      agentIcon: '🔥',
      kdRatio: 2.09,
      avgDmg: 259,
    },
  ],
  substitutes: [
    {
      id: 'p6',
      userId: 'u6',
      handle: 'PHASE_X',
      fullNameTh: 'ภัทร อุดมทรัพย์',
      initials: 'PH',
      role: 'DUELIST',
      isCaptain: false,
      isSubstitute: true,
      agentIcon: '⚔️',
      kdRatio: 1.65,
      avgDmg: 220,
    },
    {
      id: 'p7',
      userId: 'u7',
      handle: 'GHOSTKILL',
      fullNameTh: 'ก้องกิตติ์ มั่นคง',
      initials: 'GH',
      role: 'INITIATOR',
      isCaptain: false,
      isSubstitute: true,
      agentIcon: '🎯',
      kdRatio: 1.58,
      avgDmg: 215,
    },
  ],
};

const roleStyles: Record<ValorantRole, { stripe: string; badge: string; text: string }> = {
  DUELIST: {
    stripe: 'bg-gradient-to-r from-[#E35A5A] to-[#ff8080]',
    badge: 'bg-[#E35A5A]/15 text-[#E35A5A] border-[#E35A5A]/30',
    text: 'DUELIST',
  },
  INITIATOR: {
    stripe: 'bg-gradient-to-r from-[#E8B429] to-[#ffd77a]',
    badge: 'bg-[#E8B429]/15 text-[#E8B429] border-[#E8B429]/30',
    text: 'INITIATOR',
  },
  CONTROLLER: {
    stripe: 'bg-gradient-to-r from-[#9184d9] to-[#b5afe8]',
    badge: 'bg-[#9184d9]/15 text-[#9184d9] border-[#9184d9]/30',
    text: 'CONTROLLER',
  },
  SENTINEL: {
    stripe: 'bg-gradient-to-r from-[#4A9EE3] to-[#7ec8ff]',
    badge: 'bg-[#4A9EE3]/15 text-[#4A9EE3] border-[#4A9EE3]/30',
    text: 'SENTINEL',
  },
  FLEX: {
    stripe: 'bg-gradient-to-r from-[#4AE38F] to-[#a0ffcf]',
    badge: 'bg-[#4AE38F]/15 text-[#4AE38F] border-[#4AE38F]/30',
    text: 'FLEX',
  },
};

export default async function TeamProfilePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const data = mockTeamData; // อนาคตเปลี่ยนเป็น fetch data ตาม teamId

  return (
    <div className="min-h-screen bg-[#0D0E1A] text-[#e9e9ed] font-sans pb-20">
      {/* 1. TOP NAV */}
      <nav className="sticky top-0 z-50 flex h-[60px] items-center justify-between border-b border-[#E8B429]/20 bg-[#0D0E1A]/95 px-6 md:px-12 backdrop-blur-md">
        <div className="flex items-center gap-2.5 font-bold tracking-[2px] text-[#E8B429]">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-[#E8B429] font-black text-sm text-[#E8B429]">
            Z
          </div>
          <span className="text-base tracking-widest">ZODIAC ARENA</span>
        </div>
        <div className="hidden md:flex gap-8 text-[13px] font-medium text-[#b2b6ca]">
          <a href="#" className="hover:text-[#E8B429] transition-colors">นักกีฬา</a>
          <a href="#" className="text-[#E8B429]">ทีม</a>
          <a href="#" className="hover:text-[#E8B429] transition-colors">ลีก</a>
          <a href="#" className="hover:text-[#E8B429] transition-colors">Rankings</a>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#E8B429] bg-[#E8B429]/15 text-xs font-bold text-[#E8B429]">
            VX
          </div>
        </div>
      </nav>

      <main className="max-w-[1280px] mx-auto px-6 md:px-12 pt-9">
        {/* 2. TEAM BANNER */}
        <div className="relative mb-7 overflow-hidden rounded-2xl border border-[#E8B429]/25 bg-[#1A1C2E]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_120%_at_60%_-20%,rgba(232,180,41,0.08)_0%,transparent_60%),radial-gradient(ellipse_50%_80%_at_100%_50%,rgba(145,132,217,0.06)_0%,transparent_50%)] pointer-events-none" />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 md:p-10">
            <div className="flex items-center gap-7">
              {/* Logo */}
              <div className="relative flex-shrink-0">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-3 border-[#E8B429] bg-gradient-to-br from-[#1f2038] to-[#2a2c4a] text-2xl font-bold text-[#E8B429] shadow-[0_0_20px_rgba(232,180,41,0.25)]">
                  {data.logoInitials}
                </div>
              </div>

              {/* Info */}
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="rounded border border-[#9184d9]/40 bg-[#9184d9]/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#9184d9]">
                    {data.orgName}
                  </span>
                  <span className="rounded border border-[#E8B429]/50 bg-[#E8B429]/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#E8B429]">
                    {data.tag}
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-wider bg-gradient-to-r from-white via-white to-[#E8B429] bg-clip-text text-transparent mb-3.5">
                  {data.name}
                </h1>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <div className="text-xl font-bold text-[#4AE38F]">{data.stats.wins}</div>
                    <div className="text-[10px] text-[#9397ab] tracking-wider">WINS</div>
                  </div>
                  <div className="h-7 w-[1px] bg-white/10" />
                  <div>
                    <div className="text-xl font-bold text-[#E35A5A]">{data.stats.losses}</div>
                    <div className="text-[10px] text-[#9397ab] tracking-wider">LOSSES</div>
                  </div>
                  <div className="h-7 w-[1px] bg-white/10" />
                  <div className="flex items-center gap-2 rounded-full border border-[#4AE38F]/30 bg-[#4AE38F]/10 px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4AE38F] shadow-[0_0_6px_#4AE38F]" />
                    <span className="font-bold text-[#4AE38F]">{data.stats.winRate}% WR</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rank / Season */}
            <div className="flex md:flex-col items-end justify-between md:justify-center gap-2 self-stretch md:self-auto border-t md:border-t-0 pt-4 md:pt-0 border-white/5">
              <div className="text-right">
                <div className="text-[10px] font-semibold text-[#75798c] tracking-widest uppercase">CURRENT SEASON</div>
                <div className="text-sm font-bold text-[#cfd3e5] tracking-wider">{data.seasonName}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#75798c] tracking-widest">RANK</div>
                <div className="text-2xl font-bold text-[#E8B429]">#{data.currentRank}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. MAIN ROSTER HEADER */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold tracking-[3px] text-[#b2b6ca] uppercase">นักกีฬาหลัก · STARTING ROSTER</span>
            <div className="h-[1px] w-10 bg-gradient-to-r from-[#E8B429] to-transparent" />
          </div>
          <span className="text-[11px] text-[#75798c] tracking-wider">5 / 5 SLOTS FILLED</span>
        </div>

        {/* 4. ROSTER GRID (5 PLAYERS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-5">
          {data.startingRoster.map((player) => {
            const role = roleStyles[player.role];
            return (
              <div
                key={player.id}
                className={`relative overflow-hidden rounded-xl border bg-[#1A1C2E] transition-all duration-200 hover:-translate-y-1 ${
                  player.isCaptain
                    ? 'border-[#E8B429]/50 shadow-[0_0_20px_rgba(232,180,41,0.12)]'
                    : 'border-white/10 hover:border-[#E8B429]/40'
                }`}
              >
                {/* Role stripe */}
                <div className={`h-[3px] w-full ${role.stripe}`} />

                <div className="p-3.5">
                  {/* Captain Crown */}
                  {player.isCaptain && (
                    <span className="absolute top-2.5 right-2.5 text-base drop-shadow-[0_0_6px_#E8B429]">
                      👑
                    </span>
                  )}

                  {/* Avatar */}
                  <div className="flex items-start gap-2.5 mb-2.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-[#232540] to-[#2e3060] font-bold text-sm text-[#b2b6ca]">
                      {player.initials}
                    </div>
                  </div>

                  {/* Role badge */}
                  <div className="mb-2">
                    <span className={`inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${role.badge}`}>
                      {role.text}
                    </span>
                  </div>

                  <div className="text-base font-bold text-white tracking-wide">{player.handle}</div>
                  <div className="text-[11px] text-[#9397ab] mb-2.5">{player.fullNameTh}</div>

                  {/* Stats */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-2 text-center">
                    <div>
                      <div className="text-sm font-bold text-[#4AE38F]">{player.kdRatio}</div>
                      <div className="text-[9px] text-[#75798c]">K/D</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#E8B429]">{player.avgDmg}</div>
                      <div className="text-[9px] text-[#75798c]">AVG DMG</div>
                    </div>
                    <div className="flex h-7 w-7 items-center justify-center rounded bg-white/5 text-sm">
                      {player.agentIcon}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 5. SUBSTITUTE BENCH */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-semibold tracking-widest text-[#75798c]">ตัวสำรอง · SUBSTITUTE BENCH</span>
            <div className="h-[1px] flex-1 max-w-[200px] bg-white/10" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {data.substitutes.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-[#1A1C2E] p-3 transition-colors hover:border-[#E8B429]/30"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-white/10 bg-gradient-to-br from-[#232540] to-[#2e3060] text-xs font-bold text-[#9397ab]">
                  {sub.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">{sub.handle}</div>
                  <div className="text-[10px] text-[#9397ab] truncate">{sub.fullNameTh}</div>
                </div>
                <span className="rounded border border-[#E35A5A]/30 bg-[#E35A5A]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#E35A5A]">
                  {sub.role.slice(0, 4)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 6. ACTION BAR */}
        <div className="flex flex-wrap items-center gap-3 mb-9">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-[#E8B429] bg-transparent px-5 py-2 text-xs font-bold tracking-wider text-[#E8B429] hover:bg-[#E8B429]/15 hover:shadow-[0_0_16px_rgba(232,180,41,0.25)] transition-all"
          >
            + เชิญผู้เล่น / INVITE PLAYER
          </button>
          
          <form
            action={async () => {
              'use server';
              await lockRosterAction(teamId);
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-[#E8B429] px-5 py-2 text-xs font-bold tracking-wider text-[#0D0E1A] hover:shadow-[0_0_20px_rgba(232,180,41,0.4)] transition-all"
            >
              🔒 ล็อก Roster / LOCK ROSTER
            </button>
          </form>

          <div className="ml-auto flex items-center gap-2 rounded-full border border-[#4AE38F]/30 bg-[#4AE38F]/10 px-3.5 py-1.5 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4AE38F] shadow-[0_0_6px_#4AE38F]" />
            <span className="font-bold text-[#4AE38F]">ROSTER {data.rosterStatus}</span>
            <div className="h-3 w-[1px] bg-[#4AE38F]/30" />
            <span className="text-[11px] text-[#9397ab]">{data.lockDeadlineText}</span>
          </div>
        </div>

        {/* 7. TEAM STATS STRIP */}
        <div className="mb-4">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-xs font-bold tracking-[3px] text-[#b2b6ca] uppercase">สถิติทีม · TEAM STATS</span>
            <div className="h-[1px] w-10 bg-gradient-to-r from-[#E8B429] to-transparent" />
          </div>
          <div className="relative grid grid-cols-2 md:grid-cols-4 overflow-hidden rounded-xl border border-[#E8B429]/25 bg-[#1A1C2E]">
            <div className="p-6 text-center border-b md:border-b-0 md:border-r border-white/5">
              <div className="text-3xl font-extrabold bg-gradient-to-b from-white to-[#E8B429] bg-clip-text text-transparent mb-1">
                {data.stats.tournamentsEntered}
              </div>
              <div className="text-[10px] font-semibold text-[#9397ab] uppercase">Tournaments Entered</div>
              <div className="text-[10px] text-[#75798c]">SEASON 7</div>
            </div>
            <div className="p-6 text-center border-b md:border-b-0 md:border-r border-white/5">
              <div className="text-3xl font-extrabold bg-gradient-to-b from-white to-[#E8B429] bg-clip-text text-transparent mb-1">
                {data.stats.wins}
              </div>
              <div className="text-[10px] font-semibold text-[#9397ab] uppercase">Total Wins</div>
              <div className="text-[10px] text-[#75798c]">ALL MATCHES</div>
            </div>
            <div className="p-6 text-center border-r border-white/5">
              <div className="text-3xl font-extrabold bg-gradient-to-b from-white to-[#E8B429] bg-clip-text text-transparent mb-1">
                {data.stats.zpEarned}
              </div>
              <div className="text-[10px] font-semibold text-[#9397ab] uppercase">ZP Earned This Season</div>
              <div className="text-[10px] text-[#75798c]">ZODIAC POINTS</div>
            </div>
            <div className="p-6 text-center">
              <div className="text-3xl font-extrabold bg-gradient-to-b from-white to-[#E8B429] bg-clip-text text-transparent mb-1">
                {data.stats.winRate}%
              </div>
              <div className="text-[10px] font-semibold text-[#9397ab] uppercase">Win Rate Overall</div>
              <div className="text-[10px] text-[#75798c]">TOP 15%</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
