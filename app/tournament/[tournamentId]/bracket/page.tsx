import { notFound } from 'next/navigation';
import type { TournamentBracketPageData, BracketMatchNode, BracketTeamParticipant } from '@/types/bracket';
import { TournamentBracketView } from '@/components/tournament-bracket-view';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ tournamentId: string }>;
}

interface TeamInfo {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
}

// ดึงข้อมูลจริงจาก tournament_stages + bracket_nodes + teams (แทน mockBracketData เดิม)
// หมายเหตุ: bracket_nodes ยังไม่มีคอลัมน์ score_a/score_b/winner_team_id จริงในระบบ
// (matches ไม่มี bracket_node_id ให้ join ย้อนกลับ — ดูคอมเมนต์ใน
// app/api/v1/stages/[id]/bracket/route.ts) จึงตั้งใจไม่ใส่ scoreA/scoreB/winnerTeamId
// แทนการใส่ค่า mock/0 หลอก ๆ
export default async function TournamentBracketPage({ params }: PageProps) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, type, start_at')
    .eq('id', tournamentId)
    .maybeSingle();

  if (!tournament) notFound();

  const { data: stages } = await supabase
    .from('tournament_stages')
    .select('id, name, format, stage_order, teams_in')
    .eq('tournament_id', tournamentId)
    .order('stage_order', { ascending: false });

  const stage = stages?.[0] ?? null;

  let matches: BracketMatchNode[] = [];

  if (stage) {
    const { data: nodes } = await supabase
      .from('bracket_nodes')
      .select(
        'id, bracket_type, round_number, position_in_round, label, team_a_id, team_b_id, status, is_bye, best_of'
      )
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
      status: n.status,
      teamA: toParticipant(n.team_a_id),
      teamB: toParticipant(n.team_b_id),
    }));
  }

  const teamCount = stage?.teams_in ? `${stage.teams_in} TEAMS` : `${matches.length > 0 ? new Set(matches.flatMap((m) => [m.teamA?.id, m.teamB?.id]).filter(Boolean)).size : 0} TEAMS`;
  const dateText = tournament.start_at
    ? new Date(tournament.start_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'TBA';
  const formatText = stage?.format ? `${stage.format.replace(/_/g, ' ')}` : tournament.type;

  const data: TournamentBracketPageData = {
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    subMetaText: `${dateText} · ${formatText} · ${teamCount}`,
    prizeZpText: '—',
    matches,
  };

  return <TournamentBracketView data={data} />;
}
