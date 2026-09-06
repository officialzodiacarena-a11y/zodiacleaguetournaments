// app/tournament/page.tsx

import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { TournamentRegistryPageData, TournamentItem, SeasonSplit } from '@/types/tournament';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { pickRelevantSeason, SeasonLike } from '@/lib/season/pickRelevantSeason';
import { selectSeasonAction } from '@/actions/tournament';

const SEASONS: SeasonSplit[] = ['SPRING', 'SUMMER', 'FALL', 'WINTER'];

function mapTournamentStatus(status: string): TournamentItem['status'] {
  if (status === 'OPEN' || status === 'ONGOING') return 'OPEN';
  if (status === 'CONCLUDED') return 'CONCLUDED';
  return 'NOT_YET_OPEN';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

async function getRegistryData(): Promise<TournamentRegistryPageData> {
  const supabase = await createClient();
  // tournament_registrations RLS จำกัดเห็นเฉพาะทีมตัวเอง (ตามสเปก) — นับจำนวนทีมที่สมัครแบบ public
  // aggregate ต้องใช้ service role เฉพาะ query นี้ ไม่ใช่การเปิด RLS ให้อ่านรายละเอียดการสมัครแบบ public
  const admin = createAdminClient();
  const cookieStore = await cookies();
  const cookieSeason = cookieStore.get('active_season_split')?.value?.toUpperCase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: game } = await supabase.from('games').select('id').eq('code', 'VAL').maybeSingle();

  const empty: TournamentRegistryPageData = {
    activeSeason: (cookieSeason as SeasonSplit) ?? 'SUMMER',
    circuitActiveText: 'ยังไม่มีข้อมูล Circuit',
    registrationDeadlineText: 'TBA',
    tournaments: [],
  };
  if (!game) return empty;

  const { data: circuits } = await supabase
    .from('circuits')
    .select('id, name, season_order')
    .eq('game_id', game.id)
    .order('season_order', { ascending: true });

  if (!circuits || circuits.length === 0) return empty;

  const circuitByName = new Map(circuits.map((c) => [c.name.toUpperCase(), c]));
  const circuitIds = circuits.map((c) => c.id);

  let selectedName: string | undefined =
    cookieSeason && circuitByName.has(cookieSeason) ? cookieSeason : undefined;

  if (!selectedName) {
    const { data: activeRows } = await supabase
      .from('seasons')
      .select('circuit_id')
      .in('circuit_id', circuitIds)
      .eq('status', 'ACTIVE');
    const activeCircuitId = activeRows?.[0]?.circuit_id;
    const activeCircuit = circuits.find((c) => c.id === activeCircuitId);
    selectedName = (activeCircuit ?? circuits[0]).name.toUpperCase();
  }

  const selectedCircuit = circuitByName.get(selectedName) ?? circuits[0];

  const { data: seasonsForCircuit } = await supabase
    .from('seasons')
    .select('id, circuit_id, name, status, starts_at, ends_at')
    .eq('circuit_id', selectedCircuit.id);

  const season = pickRelevantSeason(seasonsForCircuit as SeasonLike[] | undefined);

  let tournaments: TournamentItem[] = [];
  let registrationDeadlineText = 'TBA';

  if (season) {
    const { data: tRows } = await supabase
      .from('tournaments')
      .select('id, name, format, status, max_teams, entry_fee_ap, prize_zp, starts_at, registration_closes_at')
      .eq('season_id', season.id)
      .order('starts_at', { ascending: true, nullsFirst: false });

    const tournamentIds = (tRows ?? []).map((t) => t.id);
    const { data: regRows } =
      tournamentIds.length > 0
        ? await admin.from('tournament_registrations').select('tournament_id').in('tournament_id', tournamentIds)
        : { data: [] as { tournament_id: string }[] };

    const countByTournament = new Map<string, number>();
    for (const r of regRows ?? []) {
      countByTournament.set(r.tournament_id, (countByTournament.get(r.tournament_id) ?? 0) + 1);
    }

    const openDeadlines = (tRows ?? [])
      .filter((t) => t.status === 'OPEN' && t.registration_closes_at)
      .map((t) => t.registration_closes_at as string)
      .sort();
    if (openDeadlines.length > 0) {
      registrationDeadlineText = formatDate(openDeadlines[0]);
    } else if (season.ends_at) {
      registrationDeadlineText = formatDate(season.ends_at);
    }

    tournaments = (tRows ?? []).map((t) => {
      const status = mapTournamentStatus(t.status);
      const accentTheme: TournamentItem['accentTheme'] =
        status === 'OPEN' ? 'gold' : status === 'CONCLUDED' ? 'gray' : 'purple';

      return {
        id: t.id,
        circuitSeasonText: `${selectedCircuit.name.toUpperCase()} CIRCUIT`,
        name: t.name,
        status,
        format: t.format,
        prizePoolZp: t.prize_zp,
        prizeTopText: `TOP ${Math.min(8, t.max_teams)}`,
        dateRangeText: t.starts_at ? formatDate(t.starts_at) : 'TBA',
        yearText: t.starts_at ? String(new Date(t.starts_at).getFullYear()) : String(new Date().getFullYear()),
        registeredTeams: countByTournament.get(t.id) ?? 0,
        maxTeams: t.max_teams,
        accentTheme,
      };
    });
  }

  const circuitActiveText = !season
    ? 'ยังไม่ประกาศซีซัน'
    : season.status === 'ACTIVE'
      ? 'CIRCUIT ACTIVE'
      : season.status === 'UPCOMING'
        ? 'UPCOMING'
        : 'CONCLUDED';

  // ZP summary ของทีมผู้ใช้ปัจจุบันใน season นี้ (แสดงเฉพาะ login แล้ว + มีทีม + มีอันดับใน season)
  let userZpSummary: TournamentRegistryPageData['userZpSummary'];
  if (user && season) {
    const { data: player } = await admin.from('players').select('id').eq('user_id', user.id).maybeSingle();
    if (player) {
      const { data: membership } = await admin
        .from('team_members')
        .select('team_id')
        .eq('player_id', player.id)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (membership) {
        const { data: standings } = await supabase
          .from('season_standings')
          .select('team_id, total_zp')
          .eq('season_id', season.id)
          .order('total_zp', { ascending: false });

        const idx = (standings ?? []).findIndex((s) => s.team_id === membership.team_id);
        if (idx >= 0 && standings) {
          const myRow = standings[idx];
          const aboveRow = idx > 0 ? standings[idx - 1] : null;
          userZpSummary = {
            seasonName: `${selectedCircuit.name} Circuit`,
            accumulatedZp: myRow.total_zp,
            rankNumber: idx + 1,
            nextRankZp: aboveRow ? aboveRow.total_zp - myRow.total_zp : 0,
            nextRankTarget: aboveRow ? idx : idx + 1,
            progressPercentage: aboveRow && aboveRow.total_zp > 0 ? Math.round((myRow.total_zp / aboveRow.total_zp) * 100) : 100,
          };
        }
      }
    }
  }

  return {
    activeSeason: selectedName as SeasonSplit,
    circuitActiveText,
    registrationDeadlineText,
    tournaments,
    userZpSummary,
  };
}

function renderStatusBadge(status: TournamentItem['status']) {
  switch (status) {
    case 'OPEN':
      return (
        <span className="rounded bg-[#4ade80]/15 border border-[#4ade80]/35 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#4ade80]">
          ● OPEN
        </span>
      );
    case 'CONCLUDED':
      return (
        <span className="rounded bg-[#9397ab]/10 border border-[#9397ab]/25 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#9397ab]">
          ■ CONCLUDED
        </span>
      );
    default:
      return (
        <span className="rounded bg-[#60a5fa]/15 border border-[#60a5fa]/35 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#60a5fa]">
          ◆ UPCOMING
        </span>
      );
  }
}

export default async function TournamentRegistryPage() {
  const data = await getRegistryData();

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
          <Link href="/profile" className="hover:text-[#E8B429] transition-colors">นักกีฬา</Link>
          <Link href="/home" className="hover:text-[#E8B429] transition-colors">ทีม</Link>
          <Link href="/tournament" className="text-[#E8B429] font-semibold border-b-2 border-[#E8B429] pb-0.5">ลีก</Link>
          <Link href="/schedule" className="hover:text-[#E8B429] transition-colors">Rankings</Link>
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
          {SEASONS.map((s) => {
            const isActive = s === data.activeSeason;
            return (
              <form
                key={s}
                action={async () => {
                  'use server';
                  await selectSeasonAction(s);
                }}
              >
                <SeasonTabButton season={s} isActive={isActive} />
              </form>
            );
          })}
        </div>

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
      {data.tournaments.length === 0 ? (
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 mb-10">
          <div className="rounded-xl border border-white/10 bg-[#1A1C2E] p-12 text-center text-sm text-[#75798c]">
            ยังไม่มีทัวร์นาเมนต์ในซีซันนี้
          </div>
        </div>
      ) : (
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {data.tournaments.map((tour) => {
            const fillPercentage = tour.maxTeams > 0 ? (tour.registeredTeams / tour.maxTeams) * 100 : 0;
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
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${topStripeClass}`} />

                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-[#E8B429]/60 uppercase mb-1.5">
                      {tour.circuitSeasonText}
                    </div>
                    <h2 className="text-xl font-extrabold tracking-wide text-white">{tour.name}</h2>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {renderStatusBadge(tour.status)}
                    <span className="rounded bg-[#9184d9]/10 border border-[#9184d9]/25 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-[#b5abfc]">
                      {tour.format}
                    </span>
                  </div>
                </div>

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

                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[#e9e9ed]/60">Teams Registered</span>
                  <div className="font-bold">
                    <span className="text-white">{tour.registeredTeams}</span>
                    <span className="text-[#e9e9ed]/30 mx-1">/</span>
                    <span className="text-[#e9e9ed]/50">{tour.maxTeams} TEAMS</span>
                  </div>
                </div>

                <div className="h-1 w-full overflow-hidden rounded bg-white/10 mb-5">
                  <div className={`h-full ${progressClass}`} style={{ width: `${fillPercentage}%` }} />
                </div>

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
                    href={`/tournament/${tour.id}/register`}
                    className="block w-full text-center rounded-lg bg-[#E8B429] py-2.5 text-xs font-black tracking-wider text-[#0D0E1A] hover:bg-[#f0c040] hover:shadow-[0_0_20px_rgba(232,180,41,0.4)] transition-all"
                  >
                    สมัครแข่ง / REGISTER
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. ZP SUMMARY STRIP */}
      {data.userZpSummary && (
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
                    {data.userZpSummary.accumulatedZp} <span className="text-sm font-semibold">ZP</span>
                  </span>
                  <span className="text-[#e9e9ed]/35">·</span>
                  <span className="text-xs text-[#e9e9ed]/60">
                    อันดับ <span className="font-bold text-[#9184d9]">#{data.userZpSummary.rankNumber}</span>
                  </span>
                </div>
              </div>
            </div>

            {data.userZpSummary.rankNumber > 1 && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-[#e9e9ed]/35 tracking-wider mb-0.5">TO NEXT RANK</div>
                  <div className="text-xs font-semibold text-[#e9e9ed]/70">
                    {data.userZpSummary.nextRankZp} ZP <span className="text-[#e9e9ed]/30 font-normal">to</span> #
                    {data.userZpSummary.nextRankTarget}
                  </div>
                </div>
                <div className="w-20">
                  <div className="h-1.5 w-full overflow-hidden rounded bg-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-[#E8B429] to-[#f5d478]"
                      style={{ width: `${Math.min(100, data.userZpSummary.progressPercentage)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SeasonTabButton({ season, isActive }: { season: SeasonSplit; isActive: boolean }) {
  return (
    <button
      type="submit"
      className={`relative px-7 py-3 text-[13px] tracking-wider transition-colors ${
        isActive
          ? 'font-bold text-[#E8B429] border-b-2 border-[#E8B429] -mb-[1px]'
          : 'font-medium text-[#e9e9ed]/40 hover:text-[#E8B429]'
      }`}
    >
      {season}
      {isActive && <span className="absolute top-2 right-1.5 h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-pulse" />}
    </button>
  );
}
