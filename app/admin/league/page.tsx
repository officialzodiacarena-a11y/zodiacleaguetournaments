// app/admin/league/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireLeagueAdminPage } from '@/lib/admin/requireLeagueAdminPage';
import { AwardButton } from '@/components/admin/league/AwardButton';
import { RecalculateButton } from '@/components/admin/league/RecalculateButton';
import { ReverseButton } from '@/components/admin/league/ReverseButton';
import { PlacementsForm } from '@/components/admin/league/PlacementsForm';
import { AdjustForm } from '@/components/admin/league/AdjustForm';
import { TierMovesPanel } from '@/components/admin/league/TierMovesPanel';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ circuit?: string }>;
}

interface CircuitOption {
  id: string;
  name: string;
}

interface TournamentRow {
  id: string;
  name: string;
  division_tier: string | null;
  status: string;
}

interface TeamRef {
  name: string;
  tag: string;
}

interface TransactionRow {
  id: string;
  team_id: string;
  reason: string;
  points: number;
  note: string | null;
  created_at: string;
  reverses_id: string | null;
  teams: TeamRef[] | TeamRef | null;
}

interface SeasonStandingTeamRow {
  team_id: string;
  division_tier: string | null;
  teams: TeamRef[] | TeamRef | null;
}

interface TierMoveRawRow {
  id: string;
  season_id: string;
  from_tier: string;
  to_tier: string;
  status: string;
  reason: string | null;
  teams: TeamRef[] | TeamRef | null;
}

const REVERSIBLE_REASONS = ['PLAYOFF_QUALIFY', 'PLACEMENT', 'ADJUSTMENT'];

function one<T>(rel: T[] | T | null): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel;
}

export default async function AdminLeaguePage({ searchParams }: PageProps) {
  await requireLeagueAdminPage();

  const supabase = await createClient();
  const { circuit: circuitIdParam } = await searchParams;

  const { data: circuits } = (await supabase
    .from('circuits')
    .select('id, name')
    .eq('point_unit', 'VLP')) as unknown as { data: CircuitOption[] | null };

  const circuitList = circuits ?? [];

  if (circuitList.length === 0) {
    return (
      <div className="min-h-screen bg-[#0D0E1A] text-[#e9e9ed] font-sans p-8">
        <div className="rounded-xl border border-white/10 bg-[#1A1C2E] p-6 text-center text-sm text-[#9397ab]">
          ยังไม่มีลีก VLP
        </div>
      </div>
    );
  }

  const selectedCircuit = circuitList.find((c) => c.id === circuitIdParam) ?? circuitList[0];

  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('circuit_id', selectedCircuit.id);

  const seasonIds = (seasons ?? []).map((s) => s.id);

  const { data: tournamentRows } = seasonIds.length
    ? ((await supabase
        .from('tournaments')
        .select('id, name, division_tier, status')
        .in('season_id', seasonIds)) as unknown as { data: TournamentRow[] | null })
    : { data: [] };

  const { data: txRows } = (await supabase
    .from('league_point_transactions')
    .select('id, team_id, reason, points, note, created_at, reverses_id, teams(name, tag)')
    .eq('circuit_id', selectedCircuit.id)
    .order('created_at', { ascending: false })
    .limit(50)) as unknown as { data: TransactionRow[] | null };

  const transactions = txRows ?? [];
  const reversedIds = new Set(transactions.map((t) => t.reverses_id).filter((id): id is string => !!id));

  const seasonList = seasons ?? [];

  const { data: seasonStandingRows } = seasonIds.length
    ? ((await supabase
        .from('season_standings')
        .select('team_id, division_tier, season_id, teams(name, tag)')
        .in('season_id', seasonIds)) as unknown as {
        data: (SeasonStandingTeamRow & { season_id: string })[] | null;
      })
    : { data: [] };

  const standingsBySeasonId: Record<string, { teamId: string; teamName: string; divisionTier: string | null }[]> = {};
  for (const row of seasonStandingRows ?? []) {
    const team = one<TeamRef>(row.teams);
    const list = standingsBySeasonId[row.season_id] ?? [];
    list.push({ teamId: row.team_id, teamName: team?.name ?? 'UNKNOWN', divisionTier: row.division_tier });
    standingsBySeasonId[row.season_id] = list;
  }

  const { data: allVlpCircuits } = (await supabase
    .from('circuits')
    .select('id')
    .eq('point_unit', 'VLP')) as unknown as { data: { id: string }[] | null };
  const allVlpCircuitIds = (allVlpCircuits ?? []).map((c) => c.id);

  const { data: nextSeasonRows } = allVlpCircuitIds.length
    ? await supabase.from('seasons').select('id, name').in('circuit_id', allVlpCircuitIds)
    : { data: [] };

  const { data: tierMoveRows } = (await supabase
    .from('league_tier_moves')
    .select('id, season_id, from_tier, to_tier, status, reason, teams(name, tag)')
    .eq('circuit_id', selectedCircuit.id)) as unknown as { data: TierMoveRawRow[] | null };

  const tierMoves = (tierMoveRows ?? []).map((m) => {
    const team = one<TeamRef>(m.teams);
    return {
      id: m.id,
      seasonId: m.season_id,
      teamName: team?.name ?? 'UNKNOWN',
      fromTier: m.from_tier,
      toTier: m.to_tier,
      reason: m.reason,
      status: m.status,
    };
  });

  return (
    <div className="min-h-screen bg-[#0D0E1A] text-[#e9e9ed] font-sans p-6 md:p-8">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="text-lg font-extrabold tracking-wide text-white mb-4">จัดการลีก VLP</h1>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {circuitList.map((c) => (
            <Link
              key={c.id}
              href={`/admin/league?circuit=${c.id}`}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                c.id === selectedCircuit.id
                  ? 'border-[#E8B429]/50 bg-[#E8B429]/15 text-[#E8B429]'
                  : 'border-white/10 bg-[#1A1C2E] text-[#9397ab] hover:border-white/30'
              }`}
            >
              {c.name}
            </Link>
          ))}
          <Link
            href={`/league/${selectedCircuit.id}`}
            className="ml-auto text-xs font-bold text-[#a99ce6] hover:underline"
          >
            ดูตารางลีกสาธารณะ
          </Link>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1A1C2E] p-4 mb-6">
          <div className="text-sm font-bold text-white">คำนวณตารางใหม่ทั้ง circuit</div>
          <RecalculateButton circuitId={selectedCircuit.id} />
        </div>

        <section className="mb-6">
          <h2 className="text-sm font-extrabold tracking-wider text-[#E8B429] uppercase mb-3">
            คิดแต้มต่อทัวร์
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-xs text-left">
              <thead className="bg-white/5 text-[#75798c] uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2">ทัวร์</th>
                  <th className="px-3 py-2">ชั้น</th>
                  <th className="px-3 py-2">สถานะ</th>
                  <th className="px-3 py-2">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(tournamentRows ?? []).map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 font-bold text-white">{t.name}</td>
                    <td className="px-3 py-2">{t.division_tier ?? '-'}</td>
                    <td className="px-3 py-2">{t.status}</td>
                    <td className="px-3 py-2">
                      <AwardButton tournamentId={t.id} />
                    </td>
                  </tr>
                ))}
                {(tournamentRows ?? []).length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-center text-[#75798c]" colSpan={4}>
                      ยังไม่มีทัวร์ในลีกนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-extrabold tracking-wider text-[#E8B429] uppercase mb-2">
            รายการแต้มล่าสุด
          </h2>
          <p className="text-[11px] text-[#fbbf24] mb-3">
            แต้มรายแมตช์ห้ามกลับรายการด้วยมือ · ถ้าผลแมตช์ผิด ให้แก้ผลแมตช์ แล้วกด &quot;คิดแต้ม&quot; และ &quot;แทนที่ตามผลล่าสุด&quot;
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-xs text-left">
              <thead className="bg-white/5 text-[#75798c] uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2">ทีม</th>
                  <th className="px-3 py-2">เหตุผล</th>
                  <th className="px-3 py-2">แต้ม</th>
                  <th className="px-3 py-2">หมายเหตุ</th>
                  <th className="px-3 py-2">เวลา</th>
                  <th className="px-3 py-2">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((tx) => {
                  const team = one<TeamRef>(tx.teams);
                  const isReversed = reversedIds.has(tx.id);
                  const canReverse = REVERSIBLE_REASONS.includes(tx.reason) && !isReversed && tx.reason !== 'REVERSAL';
                  return (
                    <tr key={tx.id}>
                      <td className="px-3 py-2 font-bold text-white">
                        {team ? `${team.name} [${team.tag}]` : tx.team_id}
                      </td>
                      <td className="px-3 py-2">
                        {tx.reason}
                        {isReversed && (
                          <span className="ml-2 rounded border border-[#eab308]/40 bg-[#eab308]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#fbbf24]">
                            กลับรายการแล้ว
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">{tx.points}</td>
                      <td className="px-3 py-2">{tx.note ?? '-'}</td>
                      <td className="px-3 py-2">
                        {new Date(tx.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
                      </td>
                      <td className="px-3 py-2">{canReverse && <ReverseButton txId={tx.id} />}</td>
                    </tr>
                  );
                })}
                {transactions.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-center text-[#75798c]" colSpan={6}>
                      ยังไม่มีรายการแต้ม
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 flex flex-col gap-5">
          <h2 className="text-sm font-extrabold tracking-wider text-[#E8B429] uppercase">
            อันดับจบซีซั่น · โบนัส/โทษ · เลื่อน/ตกชั้น
          </h2>
          <PlacementsForm seasons={seasonList} standingsBySeasonId={standingsBySeasonId} />
          <AdjustForm seasons={seasonList} standingsBySeasonId={standingsBySeasonId} />
          <TierMovesPanel
            seasons={seasonList}
            nextSeasonOptions={nextSeasonRows ?? []}
            moves={tierMoves}
          />
        </section>
      </div>
    </div>
  );
}
