import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface CircuitStandingRow {
  team_id: string;
  spring_zp: number;
  summer_zp: number;
  fall_zp: number;
  winter_zp: number;
  bonus_zp: number;
  penalty_zp: number;
  total_zp: number;
  counted_zp: number;
  rank: number | null;
  is_finals_qualified: boolean;
  finals_seed: number | null;
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
    const { id: circuitId } = await params;
    const supabase = await createClient();

    const { data: circuit, error: circuitError } = await supabase
      .from('circuits')
      .select('best_n_seasons')
      .eq('id', circuitId)
      .single();

    if (circuitError || !circuit) {
      return NextResponse.json(
        { error: { code: 'CIRCUIT_NOT_FOUND', message: 'ไม่พบข้อมูล Circuit ที่ระบุ' } },
        { status: 404 }
      );
    }

    const { data: rows, error } = await supabase
      .from('circuit_standings')
      .select(`
        team_id,
        spring_zp,
        summer_zp,
        fall_zp,
        winter_zp,
        bonus_zp,
        penalty_zp,
        total_zp,
        counted_zp,
        rank,
        is_finals_qualified,
        finals_seed,
        teams!team_id (
          name,
          tag
        )
      `)
      .eq('circuit_id', circuitId)
      .order('rank', { ascending: true, nullsFirst: false });

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_FAILED', message: error.message } },
        { status: 500 }
      );
    }

    const standings = (rows as unknown as CircuitStandingRow[]).map((row) => ({
      team_id: row.team_id,
      team_name: row.teams?.name ?? null,
      team_tag: row.teams?.tag ?? null,
      splits_zp: {
        spring: row.spring_zp,
        summer: row.summer_zp,
        fall: row.fall_zp,
        winter: row.winter_zp,
      },
      bonus_zp: row.bonus_zp,
      penalty_zp: row.penalty_zp,
      total_zp: row.total_zp,
      counted_zp: row.counted_zp,
      rank: row.rank,
      is_finals_qualified: row.is_finals_qualified,
      finals_seed: row.finals_seed,
    }));

    return NextResponse.json({
      success: true,
      circuit_id: circuitId,
      best_n_seasons_applied: circuit.best_n_seasons ?? null,
      standings,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}
