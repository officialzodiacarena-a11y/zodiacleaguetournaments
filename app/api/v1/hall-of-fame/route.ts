import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get('year');
    const supabase = await createClient();

    let query = supabase
      .from('hall_of_fame')
      .select('*')
      .order('year', { ascending: false })
      .order('finals_seed', { ascending: true });

    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (Number.isNaN(year)) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'year ต้องเป็นตัวเลข' } },
          { status: 400 }
        );
      }
      query = query.eq('year', year);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: { code: 'FETCH_FAILED', message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
