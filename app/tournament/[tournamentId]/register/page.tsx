// app/tournament/[tournamentId]/register/page.tsx
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { TeamRoleType } from '@/types/team';
import { submitRegistrationAction } from '@/actions/registration';

interface PageProps {
  params: Promise<{ tournamentId: string }>;
}

interface TournamentRow {
  id: string;
  name: string;
  type?: string | null;
  status: string;
  entry_fee_ap?: number | null;
  start_at?: string | null;
  starts_at?: string | null;
  registration_closes_at?: string | null;
  season_id?: string | null;
}

interface GameAccountRow {
  verification_status: string;
  game_id: string;
}

interface PlayerJoinRow {
  id: string;
  display_name: string;
  real_name: string | null;
  game_accounts?: GameAccountRow[] | GameAccountRow | null;
}

interface MemberRow {
  id: string;
  role: TeamRoleType;
  player_id: string;
  players?: PlayerJoinRow[] | PlayerJoinRow | null;
}

interface RosterEntry {
  id: string;
  handle: string;
  fullNameTh: string;
  initials: string;
  role: TeamRoleType;
  isCaptain: boolean;
  isSubstitute: boolean;
  isVerified: boolean;
}

const roleBadgeStyles: Record<TeamRoleType, { bg: string; border: string; text: string }> = {
  OWNER: { bg: 'bg-[#E8B429]/15', border: 'border-[#E8B429]/30', text: 'text-[#E8B429]' },
  CAPTAIN: { bg: 'bg-[#9184d9]/15', border: 'border-[#9184d9]/30', text: 'text-[#a99ce6]' },
  PLAYER: { bg: 'bg-[#3b82f6]/15', border: 'border-[#3b82f6]/30', text: 'text-[#60a5fa]' },
  SUBSTITUTE: { bg: 'bg-white/10', border: 'border-white/20', text: 'text-[#b2b6ca]' },
  COACH: { bg: 'bg-[#10b981]/15', border: 'border-[#10b981]/30', text: 'text-[#34d399]' },
  MANAGER: { bg: 'bg-[#eab308]/15', border: 'border-[#eab308]/30', text: 'text-[#fbbf24]' },
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function one<T>(rel: T[] | T | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

function renderEligibility(isVerified: boolean) {
  if (isVerified) {
    return (
      <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-[#22c55e]">
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#22c55e]/15 border border-[#22c55e] text-[9px]">
          ✓
        </span>
        <span>ELIGIBLE</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-[#fbbf24]">
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#fbbf24]/15 border border-[#fbbf24] text-[9px] font-black">
        !
      </span>
      <span>UNVERIFIED</span>
    </div>
  );
}

export default async function TournamentRegistrationPage({ params }: PageProps) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: actor } = await supabase
    .from('players')
    .select('id, ap_balance')
    .eq('user_id', user.id)
    .single();
  if (!actor) notFound();

  // ดึงข้อมูล tournament แบบ Safe-type
  const { data: tournament } = (await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .maybeSingle()) as unknown as { data: TournamentRow | null };

  if (!tournament) notFound();

  const { data: season } = tournament.season_id
    ? await supabase.from('seasons').select('circuit_id').eq('id', tournament.season_id).maybeSingle()
    : { data: null };
  const { data: circuit } = season?.circuit_id
    ? await supabase.from('circuits').select('game_id').eq('id', season.circuit_id).maybeSingle()
    : { data: null };
  const gameId = circuit?.game_id ?? null;

  const { data: team } = gameId
    ? await supabase
        .from('teams')
        .select('id, name, tag, captain_id')
        .eq('captain_id', actor.id)
        .eq('game_id', gameId)
        .is('deleted_at', null)
        .maybeSingle()
    : { data: null };

  const { data: game } = gameId
    ? await supabase.from('games').select('team_size').eq('id', gameId).maybeSingle()
    : { data: null };
  const requiredCount = game?.team_size ?? 5;

  const { data: members } = team
    ? await supabase
        .from('team_members')
        .select('id, role, player_id, players(id, display_name, real_name, game_accounts(verification_status, game_id))')
        .eq('team_id', team.id)
        .eq('status', 'ACTIVE')
    : { data: [] as never[] };

  const roster: RosterEntry[] = ((members ?? []) as unknown as MemberRow[])
    .map((m) => {
      const player = one<PlayerJoinRow>(m.players);
      if (!player) return null;
      const gameAccounts = Array.isArray(player.game_accounts)
        ? player.game_accounts
        : player.game_accounts
        ? [player.game_accounts]
        : [];
      const isVerified = gameAccounts.some(
        (ga) => ga.game_id === gameId && ga.verification_status === 'VERIFIED'
      );
      const entry: RosterEntry = {
        id: m.id,
        handle: player.display_name,
        fullNameTh: player.real_name ?? player.display_name,
        initials: initialsFromName(player.display_name),
        role: m.role,
        isCaptain: team?.captain_id === player.id,
        isSubstitute: m.role === 'SUBSTITUTE',
        isVerified,
      };
      return entry;
    })
    .filter((v): v is RosterEntry => v !== null);

  const starters = roster.filter((p) => !p.isSubstitute);
  const substitutes = roster.filter((p) => p.isSubstitute);
  const unverified = roster.filter((p) => !p.isVerified);

  const { data: existingRegistration } = team
    ? await supabase
        .from('tournament_registrations')
        .select('id, status')
        .eq('tournament_id', tournamentId)
        .eq('team_id', team.id)
        .maybeSingle()
    : { data: null };

  const entryFeeAp: number = tournament.entry_fee_ap ?? 0;
  const remainingAp = actor.ap_balance - entryFeeAp;
  const startDate = tournament.start_at || tournament.starts_at;
  const startDateText = startDate
    ? new Date(startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'TBA';

  const isMemberCountOk = starters.length + substitutes.length >= requiredCount;
  const checkList = [
    { id: 'c1', label: `ทีมมีสมาชิกครบ ${requiredCount} คน (ปัจจุบัน ${starters.length + substitutes.length} คน)`, isPassed: isMemberCountOk },
    {
      id: 'c2',
      label: 'ผู้เล่นทุกคนยืนยันตัวตนแล้ว (Manual Athlete Verification)',
      isPassed: unverified.length === 0,
      warningNote: unverified.length > 0 ? `รอตรวจสอบ: ${unverified.map((p) => p.handle).join(', ')}` : undefined,
    },
    {
      id: 'c3',
      label: `ยอด AP เพียงพอสำหรับค่าสมัคร ${entryFeeAp} AP`,
      isPassed: actor.ap_balance >= entryFeeAp,
    },
  ];

  async function handleSubmit() {
    'use server';
    if (!team) return;
    await submitRegistrationAction(tournamentId, team.id);
  }

  const noTeamState = !team;
  const alreadyRegistered = !!existingRegistration;
  const canSubmit = !noTeamState && !alreadyRegistered && checkList.every((c) => c.isPassed);

  return (
    <div className="min-h-screen bg-[#0D0E1A] text-[#e9e9ed] font-sans pb-20 select-none">
      {/* 1. NAVBAR */}
      <nav className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[#E8B429]/20 bg-[#0D0E1A]/90 px-6 md:px-8 backdrop-blur-md">
        <div className="flex items-center gap-2.5 font-black text-sm tracking-widest text-[#E8B429] uppercase">
          <span className="text-lg">★</span>
          <span>ZODIAC ARENA</span>
        </div>
        <div className="flex items-center gap-6 text-[13px] font-medium text-[#b2b6ca]">
          <Link href="/profile" className="hover:text-[#E8B429] transition-colors">นักกีฬา</Link>
          <Link href="/teams" className="hover:text-[#E8B429] transition-colors">ทีม</Link>
          <Link href="/tournament" className="text-[#E8B429] font-bold">ลีก</Link>
          <Link href="/schedule" className="hover:text-[#E8B429] transition-colors">Rankings</Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#9184d9] to-[#E8B429] font-bold text-xs text-[#0D0E1A]">
            ZA
          </div>
        </div>
      </nav>

      <main className="max-w-[1100px] mx-auto px-6 pt-9">
        {/* 3. TOURNAMENT INFO BAR */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E8B429]/25 bg-gradient-to-r from-[#E8B429]/10 to-[#9184d9]/10 px-5 py-3 mb-7">
          <span className="text-xs font-extrabold tracking-widest text-[#E8B429] uppercase">{tournament.name}</span>
          <span className="text-[#E8B429]/30">·</span>
          <span className="text-xs text-[#cfd3e5]">{startDateText}</span>
          <span className="text-[#E8B429]/30">·</span>
          <span className="text-xs font-semibold tracking-wider text-[#cfd3e5]">{tournament.type || 'TOURNAMENT'}</span>
          <div className="ml-auto">
            <span className="rounded border border-[#9184d9]/35 bg-[#9184d9]/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#9184d9]">
              {tournament.status}
            </span>
          </div>
        </div>

        {noTeamState && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-center text-sm text-rose-300 mb-6">
            คุณไม่ได้เป็นกัปตันของทีมที่แข่งในเกมนี้ — เฉพาะกัปตันเท่านั้นที่สมัครแข่งขันแทนทีมได้
          </div>
        )}

        {alreadyRegistered && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center text-sm text-emerald-300 mb-6">
            ทีมของคุณสมัครทัวร์นาเมนต์นี้แล้ว (สถานะ: {existingRegistration?.status})
          </div>
        )}

        {team && !alreadyRegistered && (
          <>
            {/* 4. TWO COLUMN LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
              {/* Left: Roster List */}
              <div className="rounded-xl border border-[#E8B429]/20 bg-[#1A1C2E] overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/5 p-4 md:p-5">
                  <div>
                    <h2 className="text-base font-extrabold tracking-wide text-white">
                      Roster ของคุณ <span className="text-white/30 font-normal">·</span>{' '}
                      <span className="text-[#E8B429]">YOUR ROSTER</span>
                    </h2>
                    <p className="text-[11px] text-[#9397ab] mt-0.5">{tournament.name} · ทีม: {team.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-[#E8B429]">{starters.length} / {requiredCount} ผู้เล่นหลัก</div>
                    <div className="text-[11px] text-[#9397ab]">{substitutes.length} ตัวสำรอง</div>
                  </div>
                </div>

                {/* Starters */}
                <div className="divide-y divide-white/5">
                  {starters.map((player) => {
                    const badge = roleBadgeStyles[player.role];
                    return (
                      <div
                        key={player.id}
                        className={`flex items-center gap-3.5 p-3.5 md:px-5 transition-colors ${
                          !player.isVerified ? 'bg-[#eab308]/[0.04]' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-[#9184d9] to-[#5d5294] font-extrabold text-sm text-white">
                            {player.initials}
                          </div>
                          {player.isCaptain && (
                            <div className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#E8B429] text-[8px] text-[#0D0E1A] font-bold border border-[#1A1C2E]">
                              ★
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white tracking-wide">{player.handle}</span>
                            {player.isCaptain && (
                              <span className="rounded border border-[#E8B429]/30 bg-[#E8B429]/15 px-1.5 py-0.2 text-[9px] font-bold tracking-wider text-[#E8B429]">
                                CAPTAIN
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#9397ab] truncate">{player.fullNameTh}</div>
                        </div>

                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <span className={`rounded border px-2 py-0.5 text-[9px] font-bold tracking-wider ${badge.bg} ${badge.border} ${badge.text}`}>
                            {player.role}
                          </span>
                          {renderEligibility(player.isVerified)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Substitutes */}
                {substitutes.length > 0 && (
                  <>
                    <div className="flex items-center gap-2.5 px-5 py-2.5 bg-white/[0.02] border-t border-b border-white/5">
                      <span className="text-[10px] font-bold tracking-widest text-[#75798c] uppercase">
                        ตัวสำรอง / SUBSTITUTES
                      </span>
                      <div className="h-[1px] flex-1 bg-white/5" />
                    </div>
                    <div className="divide-y divide-white/5">
                      {substitutes.map((sub) => {
                        const badge = roleBadgeStyles[sub.role];
                        return (
                          <div key={sub.id} className="flex items-center gap-3.5 p-3 md:px-5 opacity-80 hover:opacity-100">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-dashed border-white/20 bg-white/5 text-xs font-bold text-[#b2b6ca]">
                              {sub.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-white truncate">{sub.handle}</span>
                              <div className="text-[10px] text-[#75798c] truncate">{sub.fullNameTh}</div>
                            </div>
                            <div className="flex items-center gap-2.5 flex-shrink-0">
                              <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${badge.bg} ${badge.border} ${badge.text}`}>
                                {sub.role}
                              </span>
                              {renderEligibility(sub.isVerified)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {roster.length === 0 && (
                  <div className="p-8 text-center text-xs text-[#75798c]">ทีมนี้ยังไม่มีสมาชิกสถานะ ACTIVE</div>
                )}
              </div>

              {/* Right: Checklist & Balance */}
              <div className="flex flex-col gap-4">
                {/* Checklist */}
                <div className="rounded-xl border border-[#9184d9]/25 bg-[#1A1C2E] p-4">
                  <div className="text-[11px] font-bold tracking-widest text-[#b2b6ca] uppercase mb-3">
                    ตรวจสอบสิทธิ์ · ELIGIBILITY
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {checkList.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-2.5 rounded-lg p-2 ${
                          item.isPassed ? '' : 'border border-[#eab308]/25 bg-[#eab308]/10'
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 mt-0.5 ${
                            item.isPassed
                              ? 'border border-[#22c55e]/50 bg-[#22c55e]/20 text-[#22c55e]'
                              : 'border border-[#fbbf24]/50 bg-[#fbbf24]/20 text-[#fbbf24]'
                          }`}
                        >
                          {item.isPassed ? '✓' : '!'}
                        </div>
                        <div>
                          <div
                            className={`text-xs font-medium leading-relaxed ${
                              item.isPassed ? 'text-[#cfd3e5]' : 'font-bold text-[#fbbf24]'
                            }`}
                          >
                            {item.label}
                          </div>
                          {item.warningNote && (
                            <div className="text-[10px] text-[#fbbf24]/80 mt-0.5">{item.warningNote}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AP Balance */}
                <div className="rounded-xl border border-[#E8B429]/20 bg-[#1A1C2E] p-4">
                  <div className="text-[10px] font-bold tracking-widest text-[#75798c] uppercase mb-2">AP BALANCE</div>
                  <div className="flex items-baseline gap-1.5 mb-1.5">
                    <span className="text-3xl font-black text-[#E8B429] leading-none">{actor.ap_balance}</span>
                    <span className="text-xs font-bold text-[#E8B429]/70">AP</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded bg-white/10 mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-[#E8B429] to-[#f59e0b]"
                      style={{ width: `${Math.min(100, (actor.ap_balance / Math.max(entryFeeAp * 2, 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-[#75798c]">
                    หลังชำระ: <span className="font-bold text-white">{remainingAp} AP เหลือ</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. ACTION BAR */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#1A1C2E] p-4 md:p-5 mt-6">
              <div className="text-xs text-[#75798c]">
                <span className="font-bold text-[#cfd3e5]">{entryFeeAp} AP</span>
                <span className="mx-2 text-white/20">·</span>
                <span>หักจากยอด AP สโมสรทันทีเมื่อยืนยัน</span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/tournament"
                  className="rounded-lg border border-[#9184d9]/40 bg-transparent px-5 py-2.5 text-xs font-bold tracking-wider text-[#cfd3e5] hover:border-[#9184d9] hover:text-white transition-colors"
                >
                  ย้อนกลับ / BACK
                </Link>
                <form action={handleSubmit}>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rounded-lg bg-gradient-to-r from-[#E8B429] to-[#d97706] px-6 py-2.5 text-xs font-black tracking-wider text-[#0D0E1A] shadow-[0_4px_20px_rgba(232,180,41,0.35)] hover:shadow-[0_6px_28px_rgba(232,180,41,0.55)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    ชำระค่าสมัครและยืนยัน / PAY {entryFeeAp} AP & CONFIRM
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}