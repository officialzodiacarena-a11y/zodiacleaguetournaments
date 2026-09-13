// app/tournament/[tournamentId]/bracket/page.tsx
import { notFound } from 'next/navigation';
import type { TournamentBracketPageData, BracketMatchNode, BracketTeamParticipant } from '@/types/bracket';
import { TournamentBracketView } from '@/components/tournament-bracket-view';
import { createClient } from '@/lib/supabase/server';
import { SponsorSlot } from '@/components/sponsor/SponsorSlot';
import { SkyscraperTower } from '@/components/sponsor/SkyscraperTower';

// ด้านใน return:
<main className="min-h-screen bg-[#0D0E1A] relative">
  <SkyscraperTower position="LEFT_TOWER" />
  <SkyscraperTower position="RIGHT_TOWER" />

  <div className="max-w-7xl mx-auto p-6">
    <SponsorSlot className="mb-6" />
    {/* เนื้อหา Tournament Bracket View */}
  </div>
</main>

interface PageProps {
  params: Promise<{ tournamentId: string }>;
}

interface TeamInfo {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
}

interface TournamentRecord {
  id: string;
  name: string;
  type?: string | null;
  start_at?: string | null;
  starts_at?: string | null;
}

export default async function TournamentBracketPage({ params }: PageProps) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournament } = (await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .maybeSingle()) as unknown as { data: TournamentRecord | null };

  if (!tournament) notFound();

  const { data: stages } = await supabase
    .from('tournament_stages')
    .select('id, name, format, teams_in')
    .eq('tournament_id', tournament.id)
    .order('stage_order', { ascending: false });

  const stage = stages?.[0] ?? null;

  let matches: BracketMatchNode[] = [];
  if (stage) {
    const { data: nodes } = await supabase
      .from('bracket_nodes')
      .select('id, bracket_type, round_number, position_in_round, label, team_a_id, team_b_id, status, is_bye, best_of')
      .eq('stage_id', stage.id)
      .order('bracket_type', { ascending: true })
      .order('round_number', { ascending: true })
      .order('position_in_round', { ascending: true });

    const teamIds = Array.from(
      new Set((nodes ?? []).flatMap((n) => [n.team_a_id, n.team_b_id]).filter((id): id is string => id !== null))
    );
    const teamById = new Map<string, TeamInfo>();
    if (teamIds.length > 0) {
      const { data: teams } = await supabase.from('teams').select('id, name, tag, logo_url').in('id', teamIds);
      for (const t of teams ?? []) teamById.set(t.id, t as TeamInfo);
    }

    const toParticipant = (id: string | null): BracketTeamParticipant | undefined => {
      if (!id) return undefined;
      const t = teamById.get(id);
      if (!t) return undefined;
      return { id: t.id, name: t.name, tag: t.tag, logoUrl: t.logo_url };
    };

    matches = (nodes ?? []).map((n, idx) => ({
      id: n.id,
      stageId: stage.id,
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

  const teamCount = stage?.teams_in
    ? `${stage.teams_in} TEAMS`
    : `${matches.length > 0 ? new Set(matches.flatMap((m) => [m.teamA?.id, m.teamB?.id]).filter(Boolean)).size : 0} TEAMS`;
  const startDate = tournament.start_at || tournament.starts_at;
  const dateText = startDate
    ? new Date(startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'TBA';
  const formatText = stage?.format ? `${stage.format.replace(/_/g, ' ')}` : (tournament.type || 'DOUBLE ELIMINATION');

  const data: TournamentBracketPageData = {
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    subMetaText: `${dateText} · ${formatText} · ${teamCount}`,
    prizeZpText: '—',
    matches,
  };

  return <TournamentBracketView data={data} />;
}