// app/schedule/page.tsx

import { AutoRefresh } from '@/components/auto-refresh';
import React from 'react';
import Link from 'next/link';
import {
  MatchSchedulePageData,
  ScheduleMatch,
  ScheduleMatchDisplayStatus,
  StandingTeamItem,
} from '@/types/schedule';
import { setMatchReminderAction } from '@/actions/schedule';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { pickRelevantSeason, SeasonLike } from '@/lib/season/pickRelevantSeason';

interface TeamJoinedRef {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
}

interface MatchRow {
  id: string;
  stage_id: string;
  score_a: number | null;
  score_b: number | null;
  status: string;
  scheduled_at: string | null;
  best_of: number | null;
  team_a: TeamJoinedRef[] | TeamJoinedRef | null;
  team_b: TeamJoinedRef[] | TeamJoinedRef | null;
}

function one<T>(rel: T[] | T | null): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel;
}

function toMatchStatus(status: string): ScheduleMatchDisplayStatus {
  if (status === 'LIVE') return 'LIVE';
  if (status === 'COMPLETED') return 'COMPLETED';
  if (status === 'DISPUTED') return 'DISPUTED';
  return 'UPCOMING';
}

async function getScheduleData(): Promise<MatchSchedulePageData> {
  const supabase = await createClient();

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('code', 'VAL')
    .maybeSingle();

  const fallback: MatchSchedulePageData = {
    seasonTitle: 'ยังไม่มี Season Active',
    todayMatches: [],
    standings: [],
    lastUpdatedText: new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
  if (!game) return fallback;

  const { data: circuits } = await supabase
    .from('circuits')
    .select('id, name')
    .eq('game_id', game.id);
  const circuitIds = (circuits ?? []).map((c) => c.id);
  if (circuitIds.length === 0) return fallback;

  const { data: allSeasons } = await supabase
    .from('seasons')
    .select('id, circuit_id, name, status, starts_at, ends_at')
    .in('circuit_id', circuitIds);

  const season = pickRelevantSeason(allSeasons as SeasonLike[] | undefined);
  if (!season) return fallback;

  const circuit = (circuits ?? []).find((c) => c.id === season.circuit_id);
  const seasonTitle = `${(circuit?.name ?? '').toUpperCase()} CIRCUIT · ${season.name}`;

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id')
    .eq('season_id', season.id);
  const tournamentIds = (tournaments ?? []).map((t) => t.id);

  let matches: ScheduleMatch[] = [];
  let liveBannerMatch: ScheduleMatch | undefined;

  if (tournamentIds.length > 0) {
    const admin = createAdminClient();
    const { data: stages } = await admin
      .from('tournament_stages')
      .select('id, name')
      .in('tournament_id', tournamentIds);
    const stageIds = (stages ?? []).map((s) => s.id);
    const stageNameById = new Map((stages ?? []).map((s) => [s.id, s.name]));

    if (stageIds.length > 0) {
      const { data: matchRows } = await supabase
        .from('matches')
        .select(
          'id, stage_id, score_a, score_b, status, scheduled_at, best_of, team_a:teams!matches_team_a_id_fkey(id, name, tag, logo_url), team_b:teams!matches_team_b_id_fkey(id, name, tag, logo_url)'
        )
        .in('stage_id', stageIds)
        .neq('status', 'CANCELLED')
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .limit(20);

      matches = ((matchRows ?? []) as unknown as MatchRow[]).map((m) => {
        const teamA = one<TeamJoinedRef>(m.team_a);
        const teamB = one<TeamJoinedRef>(m.team_b);
        const status = toMatchStatus(m.status);
        return {
          id: m.id,
          timeText: m.scheduled_at
            ? new Date(m.scheduled_at).toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'TBA',
          stageRoundLabel: stageNameById.get(m.stage_id) ?? 'Stage Round',
          bestOf: m.best_of ?? 1,
          bestOfText: `BO${m.best_of ?? 1}`,
          scheduledAt: m.scheduled_at,
          status,
          teamA: {
            id: teamA?.id,
            name: teamA?.name ?? 'TBD',
            tag: teamA?.tag ?? 'TBD',
            logoUrl: teamA?.logo_url,
            score: m.score_a ?? undefined,
          },
          teamB: {
            id: teamB?.id,
            name: teamB?.name ?? 'TBD',
            tag: teamB?.tag ?? 'TBD',
            logoUrl: teamB?.logo_url,
            score: m.score_b ?? undefined,
          },
          seriesScoreText:
            status === 'COMPLETED' && m.score_a !== null && m.score_b !== null
              ? `${m.score_a} – ${m.score_b}`
              : undefined,
        };
      });

      liveBannerMatch = matches.find((m) => m.status === 'LIVE');
    }
  }

  const { data: standingsRows } = await supabase
    .from('season_standings')
    .select('team_id, total_zp, wins, losses, teams(id, name, tag, logo_url)')
    .eq('season_id', season.id)
    .order('total_zp', { ascending: false });

  const standings: StandingTeamItem[] = ((standingsRows ?? []) as unknown as {
    team_id: string;
    total_zp: number;
    wins: number;
    losses: number;
    teams: TeamJoinedRef[] | TeamJoinedRef | null;
  }[]).map((s, i) => {
    const team = one<TeamJoinedRef>(s.teams);
    const total = s.wins + s.losses;
    return {
      rank: i + 1,
      teamId: s.team_id,
      teamName: team?.name ?? 'UNKNOWN',
      teamTag: team?.tag ?? '',
      logoUrl: team?.logo_url,
      wins: s.wins,
      losses: s.losses,
      winRate: total > 0 ? Math.round((s.wins / total) * 100) : 0,
      zpTotal: s.total_zp,
      isHighlight: i === 0,
    };
  });

  return {
    seasonTitle,
    liveBannerMatch,
    todayMatches: matches,
    standings,
    lastUpdatedText: new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function renderMatchStatusBadge(status: ScheduleMatchDisplayStatus) {
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
  if (status === 'DISPUTED') {
    return (
      <span className="rounded bg-[#eab308]/10 border border-[#eab308]/30 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#facc15]">
        DISPUTED
      </span>
    );
  }
  return (
    <span className="rounded bg-[#9184d9]/10 border border-[#9184d9]/30 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#9184d9]">
      UPCOMING
    </span>
  );
}

export default async function MatchSchedulePage() {
  const data = await getScheduleData();
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
          <Link href="/profile" className="hover:text-[#E8B429] transition-colors">
            นักกีฬา
          </Link>
          <Link href="/home" className="hover:text-[#E8B429] transition-colors">
            ทีม
          </Link>
          <Link href="/tournament" className="hover:text-[#E8B429] transition-colors">
            ลีก
          </Link>
          <Link href="/schedule" className="text-[#E8B429] font-bold">
            Rankings
          </Link>
        </div>
      </nav>

      {/* 2. PAGE CONTENT */}
      <main className="max-w-[1100px] mx-auto px-6 md:px-8 pt-10">
        <div className="mb-7">
          <div className="flex items-baseline gap-3 mb-1.5">
            <span className="text-[11px] font-semibold tracking-[0.16em] text-[#E8B429] uppercase">
              ตารางแข่งขัน
            </span>
            <span className="text-[#E8B429]/35 text-xs">·</span>
            <span className="text-[11px] font-semibold tracking-[0.16em] text-[#9397ab] uppercase">
              MATCH SCHEDULE
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-wider text-white mb-6">
            {data.seasonTitle}
          </h1>
        </div>

        {/* 3. LIVE MATCH BANNER */}
        {live && (
          <div className="relative mb-6 overflow-hidden rounded-xl border border-[#dc3232]/55 bg-gradient-to-br from-[#1a0f0f] via-[#1A1C2E] to-[#1a1030] p-6 md:p-8 shadow-[0_0_24px_rgba(220,50,50,0.25)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-3.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-[#ff5555]">
                    <span className="h-2 w-2 rounded-full bg-[#ff4444] animate-pulse" />
                    LIVE NOW
                  </span>
                  <span className="text-white/20 text-xs">|</span>
                  <span className="text-xs text-[#9397ab]">{live.stageRoundLabel}</span>
                </div>

                <div className="flex items-center gap-5 md:gap-7 flex-wrap">
                  <div>
                    <div className="text-xl md:text-2xl font-black tracking-wider text-[#E8B429]">
                      {live.teamA.name}
                    </div>
                  </div>

                  <div className="text-center px-2">
                    <div className="text-3xl md:text-4xl font-black text-white leading-none">
                      <span className="text-[#E8B429]">{live.teamA.score ?? 0}</span>
                      <span className="text-white/25 mx-2 text-2xl">–</span>
                      <span className="text-[#cfd3e5]">{live.teamB.score ?? 0}</span>
                    </div>
                    <div className="text-[9px] font-bold tracking-widest text-[#75798c] uppercase mt-1">
                      SCORE
                    </div>
                  </div>

                  <div>
                    <div className="text-xl md:text-2xl font-black tracking-wider text-[#cfd3e5]">
                      {live.teamB.name}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. TODAY'S MATCHES */}
        <div className="mb-9">
          <div className="flex items-center gap-2.5 mb-3.5">
            <span className="text-[10px] font-bold tracking-widest text-[#E8B429] uppercase">
              การแข่งขัน
            </span>
            <span className="text-[#E8B429]/30">·</span>
            <span className="text-[10px] font-semibold tracking-widest text-[#75798c] uppercase">
              UPCOMING MATCHES
            </span>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-[#E8B429]/25 to-transparent" />
          </div>

          {data.todayMatches.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#1A1C2E] p-8 text-center text-sm text-[#75798c]">
              ยังไม่มีตารางแข่งขันในซีซันนี้
            </div>
          ) : (
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
                      <div className="text-base font-extrabold text-[#E8B429] leading-tight">
                        {m.timeText}
                      </div>
                      <div className="text-[9px] text-[#75798c]">{m.stageRoundLabel}</div>
                    </div>
                    <div className="h-7 w-[1px] bg-white/10 flex-shrink-0" />
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-bold text-white tracking-wide">
                        {m.teamA.name}
                      </span>
                      <span className="text-xs text-[#75798c]">vs</span>
                      <span className="text-sm font-bold text-white tracking-wide">
                        {m.teamB.name}
                      </span>
                      {m.seriesScoreText && (
                        <span className="ml-2 text-xs font-bold text-[#b2b6ca] bg-white/5 px-2 py-0.5 rounded">
                          {m.seriesScoreText}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto flex-shrink-0">
                    {renderMatchStatusBadge(m.status)}
                    {m.status === 'COMPLETED' ? (
                      <Link
                        href={`/tournament`}
                        className="rounded-md border border-[#E8B429]/40 bg-transparent px-4 py-1.5 text-xs font-bold text-[#E8B429] hover:bg-[#E8B429]/10"
                      >
                        ดูผล
                      </Link>
                    ) : m.status === 'LIVE' ? (
                      <Link
                        href={`/overlay/match/${m.id}`}
                        className="rounded-md bg-[#cc2828] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#b02222]"
                      >
                        ดูสด
                      </Link>
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
          )}
        </div>

        {/* 5. STANDINGS TABLE */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1A1C2E] mb-6">
          <div className="flex items-baseline gap-2.5 border-b border-[#E8B429]/15 p-4 md:px-6">
            <span className="text-[11px] font-bold tracking-wider text-[#E8B429] uppercase">
              ตารางคะแนน
            </span>
            <span className="text-[#E8B429]/30">·</span>
            <h2 className="text-sm font-extrabold tracking-wider text-white uppercase">
              STANDINGS
            </h2>
          </div>

          {data.standings.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#75798c]">
              ยังไม่มีตารางคะแนนในซีซันนี้
            </div>
          ) : (
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
                          <span
                            className={`font-extrabold ${
                              team.isHighlight ? 'text-[#E8B429]' : 'text-[#75798c]'
                            }`}
                          >
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
                          <span
                            className={`font-bold tracking-wide ${
                              team.isHighlight ? 'text-[#E8B429]' : 'text-white'
                            }`}
                          >
                            {team.teamName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-[#4ade80]">
                        {team.wins}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-[#75798c]">
                        {team.losses}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-[#cfd3e5]">
                        {team.winRate}%
                      </td>
                      <td
                        className={`py-3 pr-6 pl-4 text-right font-black ${
                          team.isHighlight ? 'text-[#E8B429]' : 'text-[#cfd3e5]'
                        }`}
                      >
                        {team.zpTotal.toLocaleString()} ZP
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

          <AutoRefresh intervalMs={30000} />
        </div>
      </main>
    </div>
  );
}
