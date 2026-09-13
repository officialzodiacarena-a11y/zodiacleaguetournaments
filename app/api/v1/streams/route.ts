//app/api/v1/streams/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const isEarnEligible = searchParams.get('is_earn_eligible');
    const tournamentId = searchParams.get('tournament_id');

    const supabase = await createClient();

    let query = supabase.from('streams' as never).select('*').order('created_at' as never, { ascending: false });

    if (type) query = query.eq('stream_type' as never, type as never);
    if (status) query = query.eq('status' as never, status as never);
    if (isEarnEligible !== null) query = query.eq('is_earn_eligible' as never, (isEarnEligible === 'true') as never);
    if (tournamentId) query = query.eq('tournament_id' as never, tournamentId as never);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}