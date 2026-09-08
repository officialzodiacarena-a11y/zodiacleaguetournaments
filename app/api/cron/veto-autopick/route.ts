import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = await createAdminClient();

  const { data: vetoMatches } = await adminSupabase
    .from('matches')
    .select(`
      id, status, team_a_id, team_b_id,
      stage:tournament_stages(map_pool)
    `)
    .eq('status', 'VETO');

  const processed: Array<{ matchId: string; autoPickedMap: string }> = [];

  for (const match of vetoMatches || []) {
    const stageData = Array.isArray(match.stage) ? match.stage[0] : match.stage;
    const mapPool: string[] = (stageData?.map_pool as string[]) || [];

    const { data: doneVetoes } = await adminSupabase
      .from('map_vetoes')
      .select('step_order, map_name')
      .eq('match_id', match.id)
      .order('step_order', { ascending: true });

    const usedMapNames = (doneVetoes || []).map((v) => v.map_name.toLowerCase());
    const remainingMaps = mapPool.filter((m) => !usedMapNames.includes(m.toLowerCase()));

    if (remainingMaps.length > 0) {
      const randomMap = remainingMaps[Math.floor(Math.random() * remainingMaps.length)];
      const nextStepOrder = (doneVetoes?.length || 0) + 1;
      const isEven = nextStepOrder % 2 === 0;
      const teamId = isEven ? match.team_b_id : match.team_a_id;

      await adminSupabase.from('map_vetoes').insert({
        match_id: match.id,
        step_order: nextStepOrder,
        action: 'BAN',
        team_id: teamId,
        map_name: randomMap,
        was_auto: true,
      });

      processed.push({ matchId: match.id, autoPickedMap: randomMap });
    }
  }

  return NextResponse.json({ success: true, processed_count: processed.length, processed });
}
