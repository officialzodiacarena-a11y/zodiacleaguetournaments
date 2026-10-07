// app/matches/[id]/report/page.tsx
// หน้ารายงานผลของกัปตัน — อ่านแมตช์ รูปแบบสาย และชื่อทีมจากเซิร์ฟเวอร์ แล้วให้ฟอร์มตัดสินว่ามีปุ่ม "เสมอ" ไหม
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReportResultForm from '@/components/match/ReportResultForm';
import { isDrawAllowed, isPointsFormat } from '@/lib/tournament/drawRule';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportMatchPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: match } = await supabase
    .from('matches')
    .select('id, status, best_of, stage_id, team_a_id, team_b_id')
    .eq('id', id)
    .maybeSingle();

  if (!match) notFound();

  const { data: stage } = match.stage_id
    ? await supabase.from('tournament_stages').select('format').eq('id', match.stage_id).maybeSingle()
    : { data: null };

  const teamIds = [match.team_a_id, match.team_b_id].filter((t): t is string => Boolean(t));
  const { data: teams } = teamIds.length
    ? await supabase.from('teams').select('id, name, tag').in('id', teamIds)
    : { data: [] };

  const labelOf = (teamId: string | null, fallback: string) => {
    const team = teams?.find((t) => t.id === teamId);
    return { id: teamId ?? '', name: team ? (team.tag ? `${team.name} [${team.tag}]` : team.name) : fallback };
  };

  const format = stage?.format ?? null;

  return (
    <ReportResultForm
      matchId={match.id}
      teamA={labelOf(match.team_a_id, 'ทีม A')}
      teamB={labelOf(match.team_b_id, 'ทีม B')}
      bestOf={match.best_of ?? 1}
      isPoints={isPointsFormat(format)}
      drawAllowed={isDrawAllowed(format, match.best_of)}
      status={match.status}
    />
  );
}
