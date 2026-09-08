import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface MatchNotificationPayload {
  player_id: string;
  type: string;
  title: string;
  body: string;
  action_url: string;
}

export async function GET(request: Request) {
  // ตรวจสอบ Cron Secret Header
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = await createAdminClient();
  const now = new Date();

  // กำหนดกรอบเวลา 24 ชั่วโมง และ 1 ชั่วโมงล่วงหน้า (± 5 นาที)
  const in24HoursStart = new Date(now.getTime() + 24 * 60 * 60 * 1000 - 5 * 60 * 1000).toISOString();
  const in24HoursEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString();

  const in1HourStart = new Date(now.getTime() + 60 * 60 * 1000 - 5 * 60 * 1000).toISOString();
  const in1HourEnd = new Date(now.getTime() + 60 * 60 * 1000 + 5 * 60 * 1000).toISOString();

  // ดึง Matches ที่กำหนดการแข่งอยู่ในช่วงเวลาเป้าหมาย
  const { data: upcomingMatches, error } = await adminSupabase
    .from('matches')
    .select('id, scheduled_at, team_a_id, team_b_id, match_number')
    .eq('status', 'SCHEDULED')
    .or(`and(scheduled_at.gte.${in24HoursStart},scheduled_at.lte.${in24HoursEnd}),and(scheduled_at.gte.${in1HourStart},scheduled_at.lte.${in1HourEnd})`);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const notificationsToInsert: MatchNotificationPayload[] = [];

  for (const match of upcomingMatches || []) {
    const matchTime = new Date(match.scheduled_at).getTime();
    const timeDiffHours = Math.round((matchTime - now.getTime()) / (1000 * 60 * 60));

    const is1Hour = timeDiffHours <= 1;
    const title = is1Hour ? 'เตรียมตัว! แมตช์จะเริ่มใน 1 ชั่วโมง' : 'แมตช์ของคุณจะเริ่มใน 24 ชั่วโมง';
    const body = `แมตช์ #${match.match_number || 'Upcoming'} กำลังจะเริ่มในอีก ${is1Hour ? '1 ชั่วโมง' : '24 ชั่วโมง'} กรุณาเตรียมตัวให้พร้อม`;

    const participatingTeamIds = [match.team_a_id, match.team_b_id].filter(Boolean) as string[];

    if (participatingTeamIds.length === 0) continue;

    // ดึงผู้เล่นทั้งหมดในแมตช์นั้น[cite: 1]
    const { data: teamMembers } = await adminSupabase
      .from('team_members')
      .select('player_id')
      .in('team_id', participatingTeamIds)
      .eq('status', 'ACTIVE');

    if (teamMembers) {
      for (const member of teamMembers) {
        notificationsToInsert.push({
          player_id: member.player_id,
          type: 'MATCH_SOON',
          title,
          body,
          action_url: `/match-result/${match.id}`,
        });
      }
    }
  }

  // Insert แจ้งเตือนทั้งหมดลง Database[cite: 1]
  if (notificationsToInsert.length > 0) {
    const { error: insertErr } = await adminSupabase.from('notifications').insert(notificationsToInsert);
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    reminders_sent: notificationsToInsert.length,
  });
}
