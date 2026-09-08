import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface ResolvedWalkoverRow {
  resolved_match_id: string;
  winner_team_id: string | null;
  final_status: string;
}

// เรียก public.resolve_expired_ready_checks() ทุก ๆ 1 นาที เพื่อปรับแพ้บายแมตช์
// ที่กัปตันไม่กดยืนยันความพร้อมทันเวลา (ตาม forfeit_deadline_at)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createAdminClient();

  const { data: resolvedMatches, error } = await adminSupabase.rpc('resolve_expired_ready_checks');

  if (error) {
    return NextResponse.json({ error: `Walkover Resolve Engine Failed: ${error.message}` }, { status: 500 });
  }

  const matchesList = (resolvedMatches || []) as ResolvedWalkoverRow[];

  for (const match of matchesList) {
    const channelName = `match-realtime-${match.resolved_match_id}`;
    await adminSupabase.channel(channelName).send({
      type: 'broadcast',
      event: 'match_walkover_triggered',
      payload: {
        match_id: match.resolved_match_id,
        winner_team_id: match.winner_team_id,
        status: 'WALKOVER',
        timestamp: new Date().toISOString(),
      },
    });
  }

  return NextResponse.json({
    success: true,
    processed_count: matchesList.length,
    details: matchesList,
  });
}
