import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const playerId = resolvedParams.id;
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    const { count, error: countError } = await supabase
      .from('match_replays')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', playerId);

    if (countError) {
      throw new Error(`Database count query failed: ${countError.message}`);
    }

    const { data: replays, error: selectError } = await supabase
      .from('match_replays')
      .select(`
        id,
        match_id,
        title,
        clip_url,
        thumbnail_url,
        duration_seconds,
        is_official,
        tags,
        created_at
      `)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (selectError) {
      throw new Error(`Database select query failed: ${selectError.message}`);
    }

    return NextResponse.json(
      {
        data: replays || [],
        meta: {
          total: count || 0,
          page,
          limit,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=60',
        },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: errorMessage } },
      { status: 500 }
    );
  }
}
