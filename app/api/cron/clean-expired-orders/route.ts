import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// รันทุกไม่กี่นาที — กวาดบิล PENDING ที่เลย expires_at (15 นาที) คืน reserved_stock
// และปิดสถานะเป็น EXPIRED ผ่าน public.clean_expired_orders()
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: cleanedCount, error } = await adminSupabase.rpc('clean_expired_orders');

  if (error) {
    console.error(`[clean-expired-orders] ${now} failed: ${error.message}`);
    return NextResponse.json({ error: `Clean expired orders failed: ${error.message}` }, { status: 500 });
  }

  console.log(`[clean-expired-orders] ${now} cleaned=${cleanedCount ?? 0}`);

  return NextResponse.json({ success: true, cleaned_count: cleanedCount ?? 0 });
}
