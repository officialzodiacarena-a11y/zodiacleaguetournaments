// app/api/v1/hall-of-fame/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database.types';

interface HallOfFameEntry {
  id: string;
  year: number;
  team_id: string;
  team_name: string;
  zodiac_sign: string;
  total_zp: number;
  roster_snapshot: Json;
  finals_seed: number;
  achievements: string[];
  created_at: string;
}

interface QueryResult {
  data: HallOfFameEntry[] | null;
  error: { message: string } | null;
}

interface FilterableQuery extends PromiseLike<QueryResult> {
  eq: (column: string, value: number | string) => FilterableQuery;
}

interface SelectQuery extends FilterableQuery {
  order: (column: string, options?: { ascending?: boolean }) => FilterableQuery;
}

interface DynamicHofClient {
  from: (table: string) => {
    select: (columns: string) => SelectQuery;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const supabase = await createClient();

    const dynamicClient = supabase as unknown as DynamicHofClient;
    let query: FilterableQuery = dynamicClient
      .from('hall_of_fame')
      .select('*')
      .order('year', { ascending: false });

    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (!isNaN(year)) {
        query = query.eq('year', year);
      }
    }

    const { data: records, error } = await query;

    if (error) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: records?.length ?? 0, data: records ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}