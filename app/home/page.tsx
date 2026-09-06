// app/home/page.tsx
// TASK 2.1-SA-02 — 5-Card Season Hub เชื่อม Supabase จริง (circuits + seasons + season_standings)
// อ้างอิง layout/สี/structure จาก "Zodiac Arena Hub.dc.html" (Claude Design canvas) แต่ใช้ grid
// responsive แบบเดียวกับ app/teams และ app/schedule แทนขนาด fixed ของ canvas เดิม

import React from 'react';
import Link from 'next/link';
import { Orbitron, Rajdhani } from 'next/font/google';
import { createClient } from '@/lib/supabase/server';
import { JoinCircuitButtons } from '@/components/hub/JoinCircuitButtons';
import { pickRelevantSeason } from '@/lib/season/pickRelevantSeason';

const orbitron = Orbitron({ subsets: ['latin'], weight: ['700', '900'], variable: '--font-orbitron' });
const rajdhani = Rajdhani({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-rajdhani' });

interface CircuitRow {
  id: string;
  name: string;
  season_order: number;
}

interface SeasonRow {
  id: string;
  circuit_id: string;
  name: string;
  status: 'UPCOMING' | 'ACTIVE' | 'CONCLUDED';
  starts_at: string;
  ends_at: string;
}

interface StandingRow {
  total_zp: number;
  wins: number;
  losses: number;
  teamName: string;
}

interface CircuitCardData extends CircuitRow {
  season: SeasonRow | null;
  standings: StandingRow[];
}

const SEASON_THEME: Record<string, { color: string; months: string }> = {
  SPRING: { color: '#63A66F', months: 'JAN – MAR' },
  SUMMER: { color: '#E8B429', months: 'APR – JUN' },
  FALL: { color: '#E87529', months: 'JUL – SEP' },
  WINTER: { color: '#5BA8D4', months: 'OCT – DEC' },
};

async function getHubData(): Promise<{ isAuthenticated: boolean; circuitCards: CircuitCardData[] }> {
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: game },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('games').select('id').eq('code', 'VAL').maybeSingle(),
  ]);

  if (!game) return { isAuthenticated: !!user, circuitCards: [] };

  const { data: circuits } = await supabase
    .from('circuits')
    .select('id, name, season_order')
    .eq('game_id', game.id)
    .order('season_order', { ascending: true });

  if (!circuits || circuits.length === 0) {
    return { isAuthenticated: !!user, circuitCards: [] };
  }

  const circuitIds = circuits.map((c) => c.id);
  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, circuit_id, name, status, starts_at, ends_at')
    .in('circuit_id', circuitIds);

  const seasonsByCircuit = new Map<string, SeasonRow[]>();
  for (const s of (seasons ?? []) as SeasonRow[]) {
    const list = seasonsByCircuit.get(s.circuit_id) ?? [];
    list.push(s);
    seasonsByCircuit.set(s.circuit_id, list);
  }

  const circuitCards: CircuitCardData[] = [];
  for (const c of circuits as CircuitRow[]) {
    const season = pickRelevantSeason(seasonsByCircuit.get(c.id));
    let standings: StandingRow[] = [];

    if (season?.status === 'CONCLUDED') {
      const { data } = await supabase
        .from('season_standings')
        .select('total_zp, wins, losses, teams(name)')
        .eq('season_id', season.id)
        .order('total_zp', { ascending: false })
        .limit(5);

      standings = ((data ?? []) as unknown as { total_zp: number; wins: number; losses: number; teams: { name: string } | { name: string }[] | null }[]).map(
        (row) => ({
          total_zp: row.total_zp,
          wins: row.wins,
          losses: row.losses,
          teamName: (Array.isArray(row.teams) ? row.teams[0]?.name : row.teams?.name) ?? 'UNKNOWN',
        })
      );
    }

    circuitCards.push({ ...c, season, standings });
  }

  return { isAuthenticated: !!user, circuitCards };
}

function formatDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    .toUpperCase();
}

function CrownIcon({ color }: { color: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
      <path d="M4 26L8 12L14 20L18 8L22 20L28 12L32 26H4Z" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="4" cy="26" r="2.5" fill={color} />
      <circle cx="18" cy="8" r="2.5" fill="#E8B429" />
      <circle cx="32" cy="26" r="2.5" fill={color} />
      <line x1="4" y1="29" x2="32" y2="29" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function SeasonIcon({ name, color }: { name: string; color: string }) {
  if (name === 'SPRING') {
    return (
      <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
        {[0, 72, 144, 216, 288].map((deg) => (
          <ellipse
            key={deg}
            cx="18"
            cy="10"
            rx="4"
            ry="7"
            fill={`${color}40`}
            stroke={color}
            strokeWidth="1.2"
            transform={`rotate(${deg} 18 18)`}
          />
        ))}
        <circle cx="18" cy="18" r="3.5" fill={color} />
      </svg>
    );
  }
  if (name === 'SUMMER') {
    return (
      <svg width="40" height="40" viewBox="0 0 52 52" fill="none" className="animate-za-rotate-slow">
        <circle cx="26" cy="26" r="10" fill={`${color}33`} stroke={color} strokeWidth="1.5" />
        <circle cx="26" cy="26" r="6" fill={color} opacity="0.6" />
        {[
          [26, 4, 26, 10],
          [26, 42, 26, 48],
          [4, 26, 10, 26],
          [42, 26, 48, 26],
          [10.8, 10.8, 15.1, 15.1],
          [36.9, 36.9, 41.2, 41.2],
          [41.2, 10.8, 36.9, 15.1],
          [15.1, 36.9, 10.8, 41.2],
        ].map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        ))}
      </svg>
    );
  }
  if (name === 'FALL') {
    return (
      <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
        <path d="M18 4C10 4 4 12 4 20c0 7 6 12 14 12 8 0 14-5 14-12 0-8-6-16-14-16z" fill={`${color}33`} stroke={color} strokeWidth="1.5" />
        <path d="M18 6C12 10 8 15 9 22" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        <line x1="18" y1="32" x2="18" y2="20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="18" y1="24" x2="13" y2="20" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.7" />
        <line x1="18" y1="27" x2="23" y2="23" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      </svg>
    );
  }
  return (
    <svg width="32" height="32" viewBox="0 0 36 36" fill="none" className="animate-za-rotate-slower">
      <line x1="18" y1="4" x2="18" y2="32" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <line x1="4" y1="18" x2="32" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <line x1="7.5" y1="7.5" x2="28.5" y2="28.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <line x1="28.5" y1="7.5" x2="7.5" y2="28.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <circle cx="18" cy="18" r="3" fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function StatusPill({ status, color }: { status: SeasonRow['status'] | undefined; color: string }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold tracking-wider text-[#94A3B8]">
        ยังไม่ประกาศ
      </span>
    );
  }
  if (status === 'ACTIVE') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wider"
        style={{ borderColor: `${color}55`, background: `${color}1a`, color }}
      >
        <span className="h-1.5 w-1.5 rounded-full animate-za-pulse-live" style={{ background: color }} />
        CIRCUIT ACTIVE
      </span>
    );
  }
  if (status === 'CONCLUDED') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[9px] font-semibold tracking-wider"
        style={{ borderColor: `${color}4d`, background: `${color}1f`, color }}
      >
        CONCLUDED
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[9px] font-semibold tracking-wider"
      style={{ borderColor: `${color}4d`, background: `${color}1a`, color }}
    >
      UPCOMING
    </span>
  );
}

function ConcludedPanel({ standings, color }: { standings: StandingRow[]; color: string }) {
  const champion = standings[0];
  return (
    <div>
      {champion && (
        <div
          className="rounded-md border p-2.5 mb-2"
          style={{ borderColor: `${color}33`, background: `${color}14` }}
        >
          <div className="text-[8px] font-semibold tracking-[0.2em] mb-1" style={{ color }}>
            🏆 CHAMPION
          </div>
          <div className="text-[11px] font-bold text-[#F9EDD8]" style={{ fontFamily: 'var(--font-orbitron)' }}>
            {champion.teamName}
          </div>
        </div>
      )}
      {standings.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-[8px] font-semibold tracking-[0.18em] text-[#94A3B8] mb-0.5">TOP TEAMS · ZP</div>
          {standings.map((s, i) => (
            <div key={s.teamName + i} className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-[#F9EDD8]/90 truncate max-w-[110px]">
                {i + 1}. {s.teamName}
              </span>
              <span className="text-[9px]" style={{ color }}>{s.total_zp.toLocaleString()} ZP</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UpcomingPanel({ season, color }: { season: SeasonRow; color: string }) {
  return (
    <div className="rounded-md border p-3 flex flex-col gap-1.5" style={{ borderColor: `${color}30`, background: `${color}0f` }}>
      <div className="text-[9px] font-semibold tracking-[0.2em] text-[#94A3B8]">REGISTRATION OPENS</div>
      <div className="text-[13px] font-bold" style={{ color, fontFamily: 'var(--font-orbitron)' }}>
        {formatDate(season.starts_at)}
      </div>
    </div>
  );
}

function NoSeasonPanel({ color }: { color: string }) {
  return (
    <div className="rounded-md border p-3" style={{ borderColor: `${color}25`, background: `${color}0a` }}>
      <div className="text-[9px] text-[#94A3B8] leading-relaxed">รอประกาศวันเปิดซีซัน</div>
    </div>
  );
}

function CircuitCard({
  circuit,
  isAuthenticated,
}: {
  circuit: CircuitCardData;
  isAuthenticated: boolean;
}) {
  const key = circuit.name.toUpperCase();
  const theme = SEASON_THEME[key] ?? { color: '#9184D9', months: '' };
  const color = theme.color;
  const status = circuit.season?.status;
  const isActive = status === 'ACTIVE';

  const inner = (
    <div
      className={`group relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-xl border bg-[#1A1C2E] p-5 transition-all duration-200 hover:-translate-y-1 ${
        isActive ? 'animate-za-pulse-glow-gold' : ''
      }`}
      style={{ borderColor: color }}
    >
      <span className="pointer-events-none absolute left-0 top-0 h-6 w-6 rounded-tl-xl border-l-2 border-t-2" style={{ borderColor: color }} />
      <span className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 rounded-br-xl border-b-2 border-r-2" style={{ borderColor: color }} />
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full opacity-30 blur-2xl" style={{ background: color }} />

      <div className="relative flex items-center justify-between mb-3">
        <span className="text-[9px] font-semibold tracking-[0.22em]" style={{ color }}>
          SEASON {circuit.season_order} · {theme.months}
        </span>
        {isActive && (
          <span className="flex items-center gap-1.5 rounded border border-[#E82929]/40 bg-[#E82929]/15 px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E82929] animate-za-pulse-live" />
            <span className="text-[9px] font-bold tracking-wider text-[#E82929]">LIVE</span>
          </span>
        )}
      </div>

      <div className="relative mb-3 animate-za-float w-fit">
        <SeasonIcon name={key} color={color} />
      </div>

      <h3 className="relative text-xl font-bold tracking-wide text-[#F9EDD8] mb-2" style={{ fontFamily: 'var(--font-orbitron)' }}>
        {key}
      </h3>

      <div className="relative mb-3 w-fit">
        <StatusPill status={status} color={color} />
      </div>

      <div className="relative mt-auto">
        {status === 'CONCLUDED' && <ConcludedPanel standings={circuit.standings} color={color} />}
        {status === 'UPCOMING' && circuit.season && <UpcomingPanel season={circuit.season} color={color} />}
        {!circuit.season && <NoSeasonPanel color={color} />}

        {isActive && (
          <div className="mt-3 pt-3 border-t border-white/10">
            {isAuthenticated ? (
              <Link
                href="/tournament"
                className="block w-full text-center rounded-lg py-2.5 text-xs font-black tracking-wider text-[#0D0E1A] transition-all hover:shadow-[0_0_20px_rgba(232,180,41,0.4)]"
                style={{ background: color }}
              >
                ดูทัวร์นาเมนต์ / VIEW TOURNAMENTS
              </Link>
            ) : (
              <JoinCircuitButtons />
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (status && status !== 'ACTIVE') {
    return (
      <Link href="/tournament" className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}

export default async function HomeHubPage() {
  const { isAuthenticated, circuitCards } = await getHubData();

  return (
    <div className={`${orbitron.variable} ${rajdhani.variable} min-h-screen bg-[#0D0E1A] text-[#e9e9ed] font-sans pb-20 relative overflow-hidden`}>
      {/* Background grid + radial glow — decorative, matches design reference */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(rgba(145,132,217,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(145,132,217,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] max-w-[90vw] h-[400px] rounded-full bg-[radial-gradient(ellipse,rgba(145,132,217,0.08)_0%,transparent_70%)]" />

      {/* TOP NAV — เหมือน pages อื่นในโปรเจกต์ (teams / tournament / schedule) */}
      <nav className="sticky top-0 z-50 flex h-[60px] items-center justify-between border-b border-[#E8B429]/20 bg-[#0D0E1A]/95 px-6 md:px-10 backdrop-blur-md">
        <div className="flex items-center gap-2.5 font-bold tracking-widest text-[#E8B429]">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-[#E8B429] font-black text-sm">
            Z
          </div>
          <span className="text-base tracking-widest">ZODIAC ARENA</span>
        </div>
        <div className="hidden md:flex gap-8 text-[13px] font-medium text-[#b2b6ca]">
          <Link href="/profile" className="hover:text-[#E8B429] transition-colors">นักกีฬา</Link>
          <Link href="/tournament" className="hover:text-[#E8B429] transition-colors">ลีก</Link>
          <Link href="/schedule" className="hover:text-[#E8B429] transition-colors">ตารางแข่ง</Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-10 pt-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-[11px] font-semibold tracking-[0.35em] uppercase mb-2.5" style={{ color: '#E8B429', fontFamily: 'var(--font-rajdhani)' }}>
            ESPORTS TOURNAMENT PLATFORM
          </div>
          <h1
            className="text-4xl md:text-6xl font-black tracking-wide leading-none bg-clip-text text-transparent animate-za-shimmer-text"
            style={{
              fontFamily: 'var(--font-orbitron)',
              backgroundImage: 'linear-gradient(135deg,#F9EDD8 0%,#9184D9 40%,#E8B429 80%,#F9EDD8 100%)',
            }}
          >
            ZODIAC ARENA
          </h1>
          <div className="text-[13px] font-medium tracking-[0.2em] text-[#94A3B8] mt-2" style={{ fontFamily: 'var(--font-rajdhani)' }}>
            SEASON HUB · SELECT YOUR BATTLEGROUND
          </div>
          <div className="w-[120px] h-px mx-auto mt-4 bg-gradient-to-r from-transparent via-[#E8B429] to-transparent" />
        </div>

        {/* 5-Card grid — responsive แบบเดียวกับ roster grid ใน app/teams/[teamId] */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* CARD 1: ZODIAC LEAGUE — ยังไม่มีตารางรองรับใน Sprint 2.1 (Grand Finals เป็น scope ถัดไป) */}
          <div className="relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-xl border border-[#9184D9] bg-[#1A1C2E] p-5">
            <span className="pointer-events-none absolute left-0 top-0 h-6 w-6 rounded-tl-xl border-l-2 border-t-2 border-[#9184D9]" />
            <span className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 rounded-br-xl border-b-2 border-r-2 border-[#9184D9]" />
            <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full opacity-30 blur-2xl bg-[#9184D9]" />

            <div className="relative mb-3 animate-za-float w-fit">
              <CrownIcon color="#9184D9" />
            </div>
            <div className="relative text-[9px] font-semibold tracking-[0.25em] text-[#E8B429] leading-relaxed mb-2">
              ANNUAL FINALS
              <br />
              TOP 12 CLASH
            </div>
            <h3
              className="relative text-xl font-black leading-tight mb-1 bg-clip-text text-transparent"
              style={{ fontFamily: 'var(--font-orbitron)', backgroundImage: 'linear-gradient(135deg,#C9BAFF,#9184D9,#7060C0)' }}
            >
              ZODIAC
              <br />
              LEAGUE
            </h3>
            <div className="relative text-[11px] font-semibold tracking-[0.15em] text-[#94A3B8] mb-auto pb-2">
              GRAND CHAMPIONSHIP
            </div>
            <div className="relative mt-4 pt-4 border-t border-[#9184D9]/20">
              <div className="text-[9px] font-semibold tracking-[0.18em] text-[#94A3B8] leading-loose">
                TOTAL PRIZE POOL
                <br />
                ANNUAL GLORY
              </div>
            </div>
          </div>

          {circuitCards.length === 0 && (
            <div className="sm:col-span-1 md:col-span-2 lg:col-span-4 flex items-center justify-center rounded-xl border border-white/10 bg-[#1A1C2E] p-10 text-sm text-[#75798c]">
              ยังไม่มี Circuit ของเกมนี้ในระบบ
            </div>
          )}

          {circuitCards.map((circuit) => (
            <CircuitCard key={circuit.id} circuit={circuit} isAuthenticated={isAuthenticated} />
          ))}
        </div>

        {/* Footer bar */}
        <div className="mt-10 flex items-center justify-center gap-6">
          <div className="w-14 h-px bg-gradient-to-r from-transparent to-white/15" />
          <span className="text-[9px] font-semibold tracking-[0.3em] text-[#94A3B8]/40">
            ZODIAC ARENA · {new Date().getFullYear()} CIRCUIT · ALL SEASONS
          </span>
          <div className="w-14 h-px bg-gradient-to-l from-transparent to-white/15" />
        </div>
      </main>
    </div>
  );
}
