import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function bangkokDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(date);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reasonFilter = searchParams.get('reason');
    const limitParam = parseInt(searchParams.get('limit') ?? '20', 10);
    const pageParam = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = Math.min(Math.max(limitParam, 1), 100);
    const page = Math.max(pageParam, 1);
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนดูยอด AP ของคุณ' } },
        { status: 401 }
      );
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } },
        { status: 404 }
      );
    }

    // Balance = ยอดล่าสุดใน ap_ledger (เขียนโดย move_ap / claim_watch_reward ทุกครั้ง)
    const { data: latestLedgerRow, error: balanceError } = await supabase
      .from('ap_ledger')
      .select('balance_after')
      .eq('player_id', player.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (balanceError) {
      return NextResponse.json(
        { error: { code: 'QUERY_FAILED', message: balanceError.message } },
        { status: 500 }
      );
    }

    const todayBkk = bangkokDateString(new Date());
    const { data: dailyLimit } = await supabase
      .from('ap_daily_limits')
      .select('ap_earned, daily_cap')
      .eq('player_id', player.id)
      .eq('limit_date', todayBkk)
      .maybeSingle();

    let ledgerQuery = supabase
      .from('ap_ledger')
      .select('id, amount, reason, reference_type, reference_id, balance_after, created_at', { count: 'exact' })
      .eq('player_id', player.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (reasonFilter) {
      ledgerQuery = ledgerQuery.eq('reason', reasonFilter);
    }

    const { data: ledgerRows, error: ledgerError, count } = await ledgerQuery;

    if (ledgerError) {
      return NextResponse.json(
        { error: { code: 'QUERY_FAILED', message: ledgerError.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      balance: latestLedgerRow?.balance_after ?? 0,
      daily_earned_today: dailyLimit?.ap_earned ?? 0,
      daily_cap: dailyLimit?.daily_cap ?? 100,
      ledger: ledgerRows ?? [],
      meta: { total: count ?? 0, page, limit },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
