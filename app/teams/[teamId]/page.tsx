// app/teams/[teamId]/page.tsx

import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TeamProfileData, PlayerSlot, TeamRoleType } from '@/types/team';
import { lockRosterAction } from '@/actions/team';
import { createAdminClient } from '@/lib/supabase/admin';

interface PlayerJoinRow {
  display_name: string;
  real_name: string | null;
  slug: string | null;
  id: string;
  game_accounts: { verification_status: string; game_id: string }[] | { verification_status: string; game_id: string } | null;
}

interface MemberRow {
  id: string;
  role: TeamRoleType;
  jersey_number: number | null;
  player_id: string;
  players: PlayerJoinRow[] | PlayerJoinRow | null;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function formatZp(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return String(n);
}

function one<T>(rel: T[] | T | null): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel;
}

async function getTeamProfileData(teamIdParam: string): Promise<TeamProfileData | null> {
  // ใช้ service role เพราะ Team Profile ต้องเป็นหน้า public (ดูโปรไฟล์ทีม + roster ได้โดยไม่ต้อง login)
  // แต่ RLS ปัจจุบันของ players / team_members / organizations / game_accounts ไม่มี (หรือยัง verify
  // ไม่ได้ว่ามี) public-read policy ที่ใช้งานได้จริง — ดู bug note ที่ส่งแยกให้ทีม DB
  const supabase = createAdminClient();

  // teamId ในเส้นทางอาจเป็น UUID จริง หรือ slug ก็ได้ — เทียบกับ id เฉพาะตอนที่รูปแบบเป็น UUID
  // เท่านั้น เพราะ Postgres จะพยายาม cast ทุกฝั่งของ .or() เป็น UUID ทันทีถ้า id.eq. ปรากฏอยู่
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamIdParam);
  const teamQuery = supabase
    .from('teams')
    .select('id, name, tag, game_id, captain_id, is_locked, locked_until, total_zp, wins, losses, organizations(name), games(team_size)')
    .is('deleted_at', null);

  const { data: team } = await (isUuid ? teamQuery.eq('id', teamIdParam) : teamQuery.eq('slug', teamIdParam)).maybeSingle();

  if (!team) return null;

  const org = one<{ name: string }>(team.organizations as never);
  const game = one<{ team_size: number }>(team.games as never);
  const requiredCount = game?.team_size ?? 5;

  const [{ data: members }, { count: tournamentsEntered }, { data: circuits }] = await Promise.all([
    supabase
      .from('team_members')
      .select(
        'id, role, jersey_number, player_id, players!team_members_player_id_fkey(id, display_name, real_name, slug, game_accounts!game_accounts_player_id_fkey(verification_status, game_id))'
      )
      .eq('team_id', team.id)
      .eq('status', 'ACTIVE'),
    supabase.from('tournament_registrations').select('id', { count: 'exact', head: true }).eq('team_id', team.id),
    supabase.from('circuits').select('id, name').eq('game_id', team.game_id),
  ]);

  const circuitIds = (circuits ?? []).map((c) => c.id);
  const { data: activeSeasons } =
    circuitIds.length > 0
      ? await supabase.from('seasons').select('id, name, circuit_id').in('circuit_id', circuitIds).eq('status', 'ACTIVE')
      : { data: [] as { id: string; name: string; circuit_id: string }[] };

  const activeSeason = activeSeasons?.[0] ?? null;
  const activeCircuit = activeSeason ? (circuits ?? []).find((c) => c.id === activeSeason.circuit_id) : null;

  let currentRank: number | null = null;
  if (activeSeason) {
    const { data: standings } = await supabase
      .from('season_standings')
      .select('team_id, total_zp')
      .eq('season_id', activeSeason.id)
      .order('total_zp', { ascending: false });
    const idx = (standings ?? []).findIndex((s) => s.team_id === team.id);
    currentRank = idx >= 0 ? idx + 1 : null;
  }

  const roster: PlayerSlot[] = ((members ?? []) as unknown as MemberRow[])
    .map((m) => {
      const player = one<PlayerJoinRow>(m.players);
      if (!player) return null;

      const gameAccounts = Array.isArray(player.game_accounts)
        ? player.game_accounts
        : player.game_accounts
          ? [player.game_accounts]
          : [];
      const isVerified = gameAccounts.some(
        (ga) => ga.game_id === team.game_id && ga.verification_status === 'VERIFIED'
      );

      const displayName = player.real_name ?? player.display_name;
      const slot: PlayerSlot = {
        id: m.id,
        userId: player.id,
        handle: player.display_name,
        fullNameTh: displayName,
        initials: initialsFromName(player.display_name),
        role: m.role,
        isCaptain: team.captain_id === player.id,
        isSubstitute: m.role === 'SUBSTITUTE',
        jerseyNumber: m.jersey_number,
        isVerified,
      };
      return slot;
    })
    .filter((s): s is PlayerSlot => s !== null);

  const startingRoster = roster.filter((p) => !p.isSubstitute);
  const substitutes = roster.filter((p) => p.isSubstitute);

  const winRate = team.wins + team.losses > 0 ? Math.round((team.wins / (team.wins + team.losses)) * 100) : 0;

  const data: TeamProfileData = {
    id: team.id,
    name: team.name,
    tag: team.tag,
    orgName: org?.name ?? null,
    logoInitials: initialsFromName(team.name),
    currentRank,
    seasonName: activeSeason
      ? `${(activeCircuit?.name ?? '').toUpperCase()} · ${activeSeason.name}`
      : 'ยังไม่มี Season Active',
    stats: {
      wins: team.wins,
      losses: team.losses,
      winRate,
      tournamentsEntered: tournamentsEntered ?? 0,
      zpEarned: formatZp(team.total_zp),
    },
    rosterStatus: team.is_locked ? 'LOCKED' : 'OPEN',
    lockDeadlineText:
      team.is_locked && team.locked_until
        ? `ล็อกถึง ${new Date(team.locked_until).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : undefined,
    startingRoster,
    substitutes,
  };

  return { ...data, requiredCount } as TeamProfileData & { requiredCount: number };
}

const roleStyles: Record<TeamRoleType, { stripe: string; badge: string; text: string }> = {
  OWNER: {
    stripe: 'bg-gradient-to-r from-[#E8B429] to-[#ffd77a]',
    badge: 'bg-[#E8B429]/15 text-[#E8B429] border-[#E8B429]/30',
    text: 'OWNER',
  },
  CAPTAIN: {
    stripe: 'bg-gradient-to-r from-[#E8B429] to-[#ffd77a]',
    badge: 'bg-[#E8B429]/15 text-[#E8B429] border-[#E8B429]/30',
    text: 'CAPTAIN',
  },
  PLAYER: {
    stripe: 'bg-gradient-to-r from-[#4A9EE3] to-[#7ec8ff]',
    badge: 'bg-[#4A9EE3]/15 text-[#4A9EE3] border-[#4A9EE3]/30',
    text: 'PLAYER',
  },
  SUBSTITUTE: {
    stripe: 'bg-gradient-to-r from-[#9184d9] to-[#b5afe8]',
    badge: 'bg-[#9184d9]/15 text-[#9184d9] border-[#9184d9]/30',
    text: 'SUBSTITUTE',
  },
  COACH: {
    stripe: 'bg-gradient-to-r from-[#4AE38F] to-[#a0ffcf]',
    badge: 'bg-[#4AE38F]/15 text-[#4AE38F] border-[#4AE38F]/30',
    text: 'COACH',
  },
  MANAGER: {
    stripe: 'bg-gradient-to-r from-[#4AE38F] to-[#a0ffcf]',
    badge: 'bg-[#4AE38F]/15 text-[#4AE38F] border-[#4AE38F]/30',
    text: 'MANAGER',
  },
};

export default async function TeamProfilePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const result = await getTeamProfileData(teamId);

  if (!result) {
    notFound();
  }

  const { requiredCount, ...data } = result as TeamProfileData & { requiredCount: number };

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
          <Link href="/profile" className="hover:text-[#E8B429] transition-colors">นักกีฬา</Link>
          <span className="text-[#E8B429]">ทีม</span>
          <Link href="/tournament" className="hover:text-[#E8B429] transition-colors">ลีก</Link>
          <Link href="/schedule" className="hover:text-[#E8B429] transition-colors">Rankings</Link>
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
                  {data.orgName && (
                    <span className="rounded border border-[#9184d9]/40 bg-[#9184d9]/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#9184d9]">
                      {data.orgName}
                    </span>
                  )}
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
                <div className="text-2xl font-bold text-[#E8B429]">
                  {data.currentRank !== null ? `#${data.currentRank}` : '—'}
                </div>
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
          <span className="text-[11px] text-[#75798c] tracking-wider">
            {data.startingRoster.length} / {requiredCount} SLOTS FILLED
          </span>
        </div>

        {/* 4. ROSTER GRID */}
        {data.startingRoster.length === 0 ? (
          <div className="mb-5 rounded-xl border border-white/10 bg-[#1A1C2E] p-8 text-center text-sm text-[#75798c]">
            ยังไม่มีสมาชิกในทีม
          </div>
        ) : (
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
                  <div className={`h-[3px] w-full ${role.stripe}`} />
                  <div className="p-3.5">
                    {player.isCaptain && (
                      <span className="absolute top-2.5 right-2.5 text-base drop-shadow-[0_0_6px_#E8B429]">👑</span>
                    )}
                    <div className="flex items-start gap-2.5 mb-2.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-[#232540] to-[#2e3060] font-bold text-sm text-[#b2b6ca]">
                        {player.initials}
                      </div>
                    </div>
                    <div className="mb-2">
                      <span className={`inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${role.badge}`}>
                        {role.text}
                      </span>
                    </div>
                    <div className="text-base font-bold text-white tracking-wide">{player.handle}</div>
                    <div className="text-[11px] text-[#9397ab] mb-2.5">{player.fullNameTh}</div>
                    <div className="flex items-center justify-between border-t border-white/5 pt-2 text-center">
                      <div>
                        <div className="text-sm font-bold text-[#cfd3e5]">
                          {player.jerseyNumber !== null ? `#${player.jerseyNumber}` : '—'}
                        </div>
                        <div className="text-[9px] text-[#75798c]">JERSEY</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${player.isVerified ? 'bg-[#4AE38F]' : 'bg-[#E35A5A]'}`} />
                        <span className={`text-[9px] font-bold ${player.isVerified ? 'text-[#4AE38F]' : 'text-[#E35A5A]'}`}>
                          {player.isVerified ? 'VERIFIED' : 'UNVERIFIED'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 5. SUBSTITUTE BENCH */}
        {data.substitutes.length > 0 && (
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
                    SUB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
              await lockRosterAction(data.id);
            }}
          >
            <button
              type="submit"
              disabled={data.rosterStatus === 'LOCKED'}
              className="flex items-center gap-2 rounded-lg bg-[#E8B429] px-5 py-2 text-xs font-bold tracking-wider text-[#0D0E1A] hover:shadow-[0_0_20px_rgba(232,180,41,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔒 ล็อก Roster / LOCK ROSTER
            </button>
          </form>

          <div className="ml-auto flex items-center gap-2 rounded-full border border-[#4AE38F]/30 bg-[#4AE38F]/10 px-3.5 py-1.5 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4AE38F] shadow-[0_0_6px_#4AE38F]" />
            <span className="font-bold text-[#4AE38F]">ROSTER {data.rosterStatus}</span>
            {data.lockDeadlineText && (
              <>
                <div className="h-3 w-[1px] bg-[#4AE38F]/30" />
                <span className="text-[11px] text-[#9397ab]">{data.lockDeadlineText}</span>
              </>
            )}
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
              <div className="text-[10px] text-[#75798c]">ALL TIME</div>
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
              <div className="text-[10px] font-semibold text-[#9397ab] uppercase">ZP Earned</div>
              <div className="text-[10px] text-[#75798c]">ZODIAC POINTS</div>
            </div>
            <div className="p-6 text-center">
              <div className="text-3xl font-extrabold bg-gradient-to-b from-white to-[#E8B429] bg-clip-text text-transparent mb-1">
                {data.stats.winRate}%
              </div>
              <div className="text-[10px] font-semibold text-[#9397ab] uppercase">Win Rate Overall</div>
              <div className="text-[10px] text-[#75798c]">&nbsp;</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
