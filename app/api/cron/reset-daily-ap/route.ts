import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const DEFAULT_DAILY_CAP_AP = 100;

function bangkokDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(date);
}

// รันทุกเที่ยงคืน Asia/Bangkok — เตรียมแถว ap_daily_limits ของ "วันนี้" ล่วงหน้า
// ให้ผู้เล่นที่มีประวัติรับ AP เมื่อวาน กัน race condition ตอน claim ช่วงต้นวัน
// (การ lazy-create จริง ๆ เกิดตอน claim_watch_reward() ทำงาน)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createAdminClient();

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const todayStr = bangkokDateString(now);
  const yesterdayStr = bangkokDateString(yesterday);

  const { data: yesterdayRows, error: fetchError } = await adminSupabase
    .from('ap_daily_limits')
    .select('player_id, daily_cap')
    .eq('limit_date', yesterdayStr)
    .gt('ap_earned', 0);

  if (fetchError) {
    console.error(`[reset-daily-ap] ${now.toISOString()} fetch failed: ${fetchError.message}`);
    return NextResponse.json({ error: `Fetch failed: ${fetchError.message}` }, { status: 500 });
  }

  const rows = yesterdayRows ?? [];

  if (rows.length === 0) {
    console.log(`[reset-daily-ap] ${now.toISOString()} no active earners on ${yesterdayStr}, nothing to pre-create for ${todayStr}`);
    return NextResponse.json({ success: true, date: todayStr, rows_created: 0 });
  }

  const upsertPayload = rows.map((row) => ({
    player_id: row.player_id,
    limit_date: todayStr,
    ap_earned: 0,
    daily_cap: row.daily_cap ?? DEFAULT_DAILY_CAP_AP,
  }));

  const { error: upsertError } = await adminSupabase
    .from('ap_daily_limits')
    .upsert(upsertPayload, { onConflict: 'player_id,limit_date', ignoreDuplicates: true });

  if (upsertError) {
    console.error(`[reset-daily-ap] ${now.toISOString()} upsert failed: ${upsertError.message}`);
    return NextResponse.json({ error: `Upsert failed: ${upsertError.message}` }, { status: 500 });
  }

  console.log(`[reset-daily-ap] ${now.toISOString()} pre-created ${upsertPayload.length} ap_daily_limits rows for ${todayStr}`);

  return NextResponse.json({ success: true, date: todayStr, rows_created: upsertPayload.length });
}
