import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { advancePendingWalkovers } from '@/lib/bracket/walkoverAdvance';
import { stampNoShowDeadlines } from '@/lib/match/noShowStamp';

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

  // ตั้งเส้นตายจากเวลานัดให้แมตช์ที่ไม่มีทีมกดพร้อมเลย — ต้องทำก่อน RPC เพื่อให้รอบเดียวกันปรับแพ้ให้เลย
  let noShowStamped: string[] = [];
  try {
    noShowStamped = await stampNoShowDeadlines(adminSupabase, Date.now());
  } catch (stampErr) {
    console.error('[cron/walkover] stampNoShowDeadlines threw', stampErr);
  }

  const { data: resolvedMatches, error } =await adminSupabase.rpc('resolve_expired_ready_checks');

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

  // เลื่อนสายให้ทีมที่ชนะบาย — ทำทุกรอบแม้ RPC ไม่คืนแถวใหม่ เพื่อเก็บตกแมตช์ที่เลื่อนสายพลาดรอบก่อน
  const bracketAdvanced = await advancePendingWalkovers(adminSupabase, new Date().toISOString());

  return NextResponse.json({
    success: true,
    processed_count: matchesList.length,
    details: matchesList,
    no_show_stamped: noShowStamped,
    bracket_advanced: bracketAdvanced,
    bracket_advance_failed_count: bracketAdvanced.filter((r) => r.error !== null).length,
  });
}
