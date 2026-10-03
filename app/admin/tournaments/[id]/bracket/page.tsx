// app/admin/tournaments/[id]/bracket/page.tsx
// หน้า "จัดสายการแข่งขัน": เลือกทัวร์ → สร้างสาย (stage) → จัดทีมลงสาย (seed) → เปิดสาย → ดูสาย
// เรียก API เดิมทั้งหมด (stages / seed / status) ผ่านคอมโพเนนต์ฝั่ง client · หน้านี้โหลดข้อมูลอย่างเดียว
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireBracketAdminPage } from '@/lib/admin/requireBracketAdminPage';
import { isoToThaiParts } from '@/lib/tournament/bracketBuilder';
import { BracketBuilder, type BuilderStage, type ApprovedTeam, type TournamentSummary } from '@/components/admin/bracket/BracketBuilder';
import type { BracketMatchNode, BracketTeamParticipant } from '@/types/bracket';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stage?: string }>;
}

interface TournamentRecord {
  id: string;
  name: string;
  status: string;
  max_teams: number | null;
  registration_closes_at: string | null;
  start_at?: string | null;
  starts_at?: string | null;
}

interface RegistrationRow {
  team_id: string;
  status: string;
  teams?: { id: string; name: string; tag: string } | { id: string; name: string; tag: string }[] | null;
}

interface StageRow {
  id: string;
  name: string;
  stage_order: number;
  format: string;
  status: string;
  teams_in: number | null;
  best_of_config: unknown;
  start_at: string | null;
}

function teamOf(row: RegistrationRow): { id: string; name: string; tag: string } | null {
  if (Array.isArray(row.teams)) return row.teams[0] ?? null;
  return row.teams ?? null;
}

export default async function AdminTournamentBracketPage({ params, searchParams }: PageProps) {
  await requireBracketAdminPage();

  const { id: tournamentId } = await params;
  const { stage: stageParam } = await searchParams;
  const supabase = await createClient();

  const { data: tournament } = (await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .maybeSingle()) as unknown as { data: TournamentRecord | null };

  if (!tournament) notFound();

  const [{ data: registrations }, { data: payments }, { data: stageRows }] = await Promise.all([
    supabase
      .from('tournament_registrations')
      .select('team_id, status, teams(id, name, tag)')
      .eq('tournament_id', tournament.id) as unknown as Promise<{ data: RegistrationRow[] | null }>,
    supabase
      .from('tournament_entry_payments')
      .select('status')
      .eq('tournament_id', tournament.id) as unknown as Promise<{ data: Array<{ status: string }> | null }>,
    supabase
      .from('tournament_stages')
      .select('id, name, stage_order, format, status, teams_in, best_of_config, start_at')
      .eq('tournament_id', tournament.id)
      .order('stage_order', { ascending: true }) as unknown as Promise<{ data: StageRow[] | null }>,
  ]);

  const approvedTeams: ApprovedTeam[] = (registrations ?? [])
    .filter((r) => (r.status === 'APPROVED' || r.status === 'ELIGIBLE'))
    .map((r) => {
      const t = teamOf(r);
      return { id: r.team_id, name: t?.name ?? r.team_id, tag: t?.tag ?? '' };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'th'));

  const paymentCounts = (payments ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  const stages = stageRows ?? [];
  const stageIds = stages.map((s) => s.id);

  const nodeCountByStage = new Map<string, number>();
  if (stageIds.length > 0) {
    const { data: nodeRows } = await supabase.from('bracket_nodes').select('stage_id').in('stage_id', stageIds);
    for (const n of nodeRows ?? []) nodeCountByStage.set(n.stage_id, (nodeCountByStage.get(n.stage_id) ?? 0) + 1);
  }

  const builderStages: BuilderStage[] = stages.map((s) => ({
    id: s.id,
    name: s.name,
    stageOrder: s.stage_order,
    format: s.format,
    status: s.status,
    teamsIn: s.teams_in,
    bestOfConfig: s.best_of_config,
    startAt: s.start_at,
    nodeCount: nodeCountByStage.get(s.id) ?? 0,
  }));

  const selectedStage = builderStages.find((s) => s.id === stageParam) ?? builderStages[builderStages.length - 1] ?? null;

  // โหนดของสายที่เลือก → รูปแบบที่ TournamentBracketView ใช้ (ชุดเดียวกับหน้า /tournament/[id]/bracket)
  let matches: BracketMatchNode[] = [];
  if (selectedStage && selectedStage.nodeCount > 0) {
    const { data: nodes } = await supabase
      .from('bracket_nodes')
      .select('id, bracket_type, round_number, position_in_round, label, team_a_id, team_b_id, status, best_of')
      .eq('stage_id', selectedStage.id)
      .order('bracket_type', { ascending: true })
      .order('round_number', { ascending: true })
      .order('position_in_round', { ascending: true });

    const teamIds = Array.from(
      new Set((nodes ?? []).flatMap((n) => [n.team_a_id, n.team_b_id]).filter((id): id is string => id !== null))
    );
    const teamById = new Map<string, { id: string; name: string; tag: string; logo_url: string | null }>();
    if (teamIds.length > 0) {
      const { data: teams } = await supabase.from('teams').select('id, name, tag, logo_url').in('id', teamIds);
      for (const t of teams ?? []) teamById.set(t.id, t);
    }

    const toParticipant = (id: string | null): BracketTeamParticipant | undefined => {
      if (!id) return undefined;
      const t = teamById.get(id);
      return t ? { id: t.id, name: t.name, tag: t.tag, logoUrl: t.logo_url } : undefined;
    };

    matches = (nodes ?? []).map((n, idx) => ({
      id: n.id,
      stageId: selectedStage.id,
      matchNumber: idx + 1,
      bracketType: n.bracket_type as BracketMatchNode['bracketType'],
      roundNumber: n.round_number,
      positionInRound: n.position_in_round,
      label: n.label ?? undefined,
      bestOf: n.best_of,
      status: n.status as BracketMatchNode['status'],
      teamA: toParticipant(n.team_a_id),
      teamB: toParticipant(n.team_b_id),
    }));
  }

  const startIso = tournament.start_at || tournament.starts_at || null;
  const summary: TournamentSummary = {
    id: tournament.id,
    name: tournament.name,
    status: tournament.status,
    registrationClosesAt: tournament.registration_closes_at,
    defaultDate: isoToThaiParts(startIso)?.date ?? '',
    approvedCount: approvedTeams.length,
    awaitingPaymentCount: paymentCounts.AWAITING_PAYMENT ?? 0,
    slipUploadedCount: paymentCounts.SLIP_UPLOADED ?? 0,
  };

  return (
    <div className="min-h-screen bg-[#0D0E1A] text-[#e9e9ed] font-sans p-4 sm:p-6 md:p-8">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-[#9397ab]">
          <Link href="/admin/tournaments" className="hover:text-white">← เลือกทัวร์อื่น</Link>
          <Link href="/admin" className="hover:text-white">หน้าจัดการ</Link>
        </div>
        <BracketBuilder
          tournament={summary}
          approvedTeams={approvedTeams}
          stages={builderStages}
          selectedStageId={selectedStage?.id ?? null}
          matches={matches}
        />
      </div>
    </div>
  );
}

