import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SeasonStandingRow {
  team_id: string;
  total_zp: number;
  rank: number | null;
  previous_rank: number | null;
  championships: number;
  teams: {
    name: string;
    tag: string;
  } | null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: seasonId } = await params;
    const supabase = await createClient();

    const { data: rows, error } = await supabase
      .from('season_standings')
      .select(`
        team_id,
        total_zp,
        rank,
        previous_rank,
        championships,
        teams!team_id (
          name,
          tag
        )
      `)
      .eq('season_id', seasonId)
      .order('rank', { ascending: true, nullsFirst: false });

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_FAILED', message: error.message } },
        { status: 500 }
      );
    }

    const standings = (rows as unknown as SeasonStandingRow[]).map((row) => ({
      team_id: row.team_id,
      team_name: row.teams?.name ?? null,
      team_tag: row.teams?.tag ?? null,
      total_zp: row.total_zp,
      rank: row.rank,
      previous_rank: row.previous_rank,
      championships: row.championships,
    }));

    return NextResponse.json({ success: true, season_id: seasonId, standings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}
