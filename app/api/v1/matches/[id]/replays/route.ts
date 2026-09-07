import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const matchId = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const isOfficialStr = searchParams.get('is_official');
    const tag = searchParams.get('tag');

    const supabase = await createClient();

    let query = supabase
      .from('match_replays')
      .select(`
        id,
        match_id,
        title,
        clip_url,
        thumbnail_url,
        start_time_seconds,
        duration_seconds,
        is_official,
        tags,
        created_by,
        player_id,
        created_at
      `)
      .eq('match_id', matchId)
      .order('created_at', { ascending: false });

    if (isOfficialStr !== null) {
      const isOfficial = isOfficialStr === 'true';
      query = query.eq('is_official', isOfficial);
    }

    if (tag !== null && tag.trim() !== '') {
      query = query.contains('tags', [tag]);
    }

    const { data: replays, error } = await query;

    if (error) {
      throw new Error(`Database select query failed: ${error.message}`);
    }

    return NextResponse.json(
      {
        match_id: matchId,
        replays: replays || [],
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
