// app/league/[circuitId]/page.tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { pointUnitLabel } from '@/lib/league/pointUnit';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ circuitId: string }>;
}

interface TeamRef {
  name: string;
  tag: string;
  logo_url: string | null;
}

interface CircuitStandingRow {
  team_id: string;
  rank: number | null;
  spring_zp: number;
  summer_zp: number;
  fall_zp: number;
  winter_zp: number;
  bonus_zp: number;
  penalty_zp: number;
  counted_zp: number;
  is_finals_qualified: boolean;
  finals_seed: number | null;
  teams: TeamRef[] | TeamRef | null;
}

interface SeasonStandingRow {
  team_id: string;
  total_zp: number;
  wins: number;
  losses: number;
  division_tier: string | null;
  teams: TeamRef[] | TeamRef | null;
}

interface SeasonRow {
  id: string;
  name: string;
  quarter: number | null;
  status: string;
  starts_at: string | null;
}

const SEASON_COLORS: Record<number, string> = {
  1: '#63A66F', // Spring
  2: '#F5C542', // Summer
  3: '#E87529', // Fall
  4: '#5BA8D4', // Winter
};

const SEASON_LABELS: Record<number, string> = {
  1: 'S1',
  2: 'S2',
  3: 'S3',
  4: 'S4',
};

const TIER_ORDER = ['PRO', 'CHALLENGER', 'OPEN'] as const;
const TIER_LABELS: Record<string, string> = {
  PRO: 'Pro League',
  CHALLENGER: 'Challenger League',
  OPEN: 'Open',
};

function one<T>(rel: T[] | T | null): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel;
}

function formatBonusPenalty(bonus: number, penalty: number): string {
  const net = bonus + penalty;
  if (net === 0) return '0';
  return net > 0 ? `+${net}` : `${net}`;
}

export default async function LeagueCircuitPage({ params }: PageProps) {
  const { circuitId } = await params;
  const supabase = await createClient();

  const { data: circuit } = await supabase
    .from('circuits')
    .select('id, name, point_unit')
    .eq('id', circuitId)
    .maybeSingle();

  if (!circuit) notFound();

  const unit = pointUnitLabel(circuit.point_unit);

  const { data: seasonRows } = (await supabase
    .from('seasons')
    .select('id, name, quarter, status, starts_at')
    .eq('circuit_id', circuitId)
    .order('quarter', { ascending: true, nullsFirst: false })
    .order('starts_at', { ascending: true })) as unknown as { data: SeasonRow[] | null };

  const seasons = seasonRows ?? [];

  const { data: circuitStandingRows } = (await supabase
    .from('circuit_standings')
    .select(
      'team_id, rank, spring_zp, summer_zp, fall_zp, winter_zp, bonus_zp, penalty_zp, counted_zp, is_finals_qualified, finals_seed, teams(name, tag, logo_url)'
    )
    .eq('circuit_id', circuitId)
    .order('rank', { ascending: true, nullsFirst: false })
    .order('counted_zp', { ascending: false })) as unknown as { data: CircuitStandingRow[] | null };

  const circuitStandings = circuitStandingRows ?? [];

  const seasonIds = seasons.map((s) => s.id);
  const { data: seasonStandingRows } = seasonIds.length
    ? ((await supabase
        .from('season_standings')
        .select('team_id, total_zp, wins, losses, division_tier, season_id, teams(name, tag, logo_url)')
        .in('season_id', seasonIds)) as unknown as {
        data: (SeasonStandingRow & { season_id: string })[] | null;
      })
    : { data: [] };

  const seasonStandingsBySeasonId = new Map<string, (SeasonStandingRow & { season_id: string })[]>();
  for (const row of seasonStandingRows ?? []) {
    const list = seasonStandingsBySeasonId.get(row.season_id) ?? [];
    list.push(row);
    seasonStandingsBySeasonId.set(row.season_id, list);
  }

  return (
    <div className="min-h-screen bg-[#0D0E1A] text-[#F9EDD8] font-sans pb-20">
      <main className="max-w-[1100px] mx-auto px-6 pt-9">
        <div className="flex flex-wrap items-center gap-3 mb-7">
          <h1 className="text-lg font-extrabold tracking-wide text-white">{circuit.name}</h1>
          <span
            className="rounded border px-2.5 py-0.5 text-[10px] font-bold tracking-wider"
            style={{ borderColor: '#E8B429', color: '#E8B429', backgroundColor: 'rgba(232,180,41,0.1)' }}
          >
            {unit}
          </span>
        </div>

        {/* ตารางสะสมทั้งปี */}
        <section className="mb-8">
          <h2 className="text-sm font-extrabold tracking-wider text-[#E8B429] uppercase mb-3">
            ตารางสะสมทั้งปี
          </h2>
          {circuitStandings.length === 0 ? (
            <div className="rounded-xl border border-[#334B5C] bg-[#1A1C2E] p-6 text-center text-sm text-[#94A3B8]">
              ยังไม่มีคะแนนในลีกนี้
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#334B5C]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0D0E1A] text-[10px] font-bold tracking-widest text-[#94A3B8] uppercase border-b border-[#334B5C]">
                  <tr>
                    <th scope="col" className="py-2.5 px-4">อันดับ</th>
                    <th scope="col" className="py-2.5 px-4">ทีม</th>
                    {[1, 2, 3, 4].map((q) => (
                      <th
                        key={q}
                        scope="col"
                        className="py-2.5 px-3 text-right"
                        style={{ color: SEASON_COLORS[q] }}
                      >
                        {SEASON_LABELS[q]}
                      </th>
                    ))}
                    <th scope="col" className="py-2.5 px-3 text-right">โบนัส/โทษ</th>
                    <th scope="col" className="py-2.5 px-4 text-right">รวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334B5C]/60">
                  {circuitStandings.map((row) => {
                    const team = one<TeamRef>(row.teams);
                    return (
                      <tr key={row.team_id}>
                        <td className="py-3 px-4 font-extrabold">{row.rank ?? '-'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">
                              {team?.name ?? 'UNKNOWN'} <span className="text-[#94A3B8]">[{team?.tag}]</span>
                            </span>
                            {row.is_finals_qualified && (
                              <span className="rounded border border-[#E8B429]/40 bg-[#E8B429]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#E8B429]">
                                Grand Championship #{row.finals_seed}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">{row.spring_zp}</td>
                        <td className="py-3 px-3 text-right">{row.summer_zp}</td>
                        <td className="py-3 px-3 text-right">{row.fall_zp}</td>
                        <td className="py-3 px-3 text-right">{row.winter_zp}</td>
                        <td className="py-3 px-3 text-right">{formatBonusPenalty(row.bonus_zp, row.penalty_zp)}</td>
                        <td className="py-3 px-4 text-right font-black text-[#E8B429]">
                          {row.counted_zp.toLocaleString()} {unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ตารางแต่ละซีซั่น */}
        {seasons.map((season) => {
          const rows = seasonStandingsBySeasonId.get(season.id) ?? [];
          const groups = new Map<string, (SeasonStandingRow & { season_id: string })[]>();
          for (const row of rows) {
            const key = row.division_tier ?? 'NONE';
            const list = groups.get(key) ?? [];
            list.push(row);
            groups.set(key, list);
          }
          for (const list of groups.values()) {
            list.sort((a, b) => (b.total_zp !== a.total_zp ? b.total_zp - a.total_zp : b.wins - a.wins));
          }

          const groupOrder = [...TIER_ORDER, 'NONE'].filter((t) => groups.has(t));

          return (
            <section key={season.id} className="mb-8">
              <h2 className="text-sm font-extrabold tracking-wider text-[#E8B429] uppercase mb-3">
                {season.name}
              </h2>
              {rows.length === 0 ? (
                <div className="rounded-xl border border-[#334B5C] bg-[#1A1C2E] p-6 text-center text-sm text-[#94A3B8]">
                  ยังไม่มีคะแนนในลีกนี้
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {groupOrder.map((tierKey) => {
                    const list = groups.get(tierKey) ?? [];
                    const label = tierKey === 'NONE' ? 'ไม่แบ่งชั้น' : TIER_LABELS[tierKey];
                    return (
                      <div key={tierKey} className="overflow-x-auto rounded-xl border border-[#334B5C]">
                        <div className="px-4 py-2 bg-[#0D0E1A] text-[10px] font-bold tracking-widest text-[#94A3B8] uppercase border-b border-[#334B5C]">
                          {label}
                        </div>
                        <table className="w-full text-left text-sm">
                          <thead className="bg-[#0D0E1A] text-[10px] font-bold tracking-widest text-[#94A3B8] uppercase border-b border-[#334B5C]">
                            <tr>
                              <th scope="col" className="py-2.5 px-4">อันดับ</th>
                              <th scope="col" className="py-2.5 px-4">ทีม</th>
                              <th scope="col" className="py-2.5 px-3 text-center">ชนะ–แพ้</th>
                              <th scope="col" className="py-2.5 px-4 text-right">แต้ม</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#334B5C]/60">
                            {list.map((row, index) => {
                              const team = one<TeamRef>(row.teams);
                              return (
                                <tr key={row.team_id}>
                                  <td className="py-3 px-4 font-extrabold">{index + 1}</td>
                                  <td className="py-3 px-4 font-bold text-white">
                                    {team?.name ?? 'UNKNOWN'} <span className="text-[#94A3B8]">[{team?.tag}]</span>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    {row.wins}–{row.losses}
                                  </td>
                                  <td className="py-3 px-4 text-right font-black text-[#E8B429]">
                                    {row.total_zp.toLocaleString()} {unit}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}
