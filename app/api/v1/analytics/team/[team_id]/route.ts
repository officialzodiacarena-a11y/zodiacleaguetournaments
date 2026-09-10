import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAccessGate } from '@/lib/billing/checkAccessGate';

// Sprint 5.2 — Pro Analytics Gating. Server-side data stripping: the DB query
// itself only ever selects the confirmed-real base columns; the three Pro
// fields that have no verified source data (see the migration header note in
// 20260910000000_t51_phase5_billing_engine.sql) are returned as null even for
// paying subscribers until a real source is wired up — never fabricated.
export async function GET(req: Request, { params }: { params: Promise<{ team_id: string }> | { team_id: string } }) {
  try {
    const { team_id: teamId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } }, { status: 401 });
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } }, { status: 404 });
    }

    const { data: isLeader } = await supabase.rpc('is_team_leader', { p_team_id: teamId });
    if (!isLeader) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'ต้องเป็นหัวหน้าทีมของทีมนี้เท่านั้น' } }, { status: 403 });
    }

    // Fresh check on every request — never trust a client-cached flag (Case 8).
    const access = await checkAccessGate('TEAM', teamId, 'ANALYTICS');

    if (!access.has_access) {
      const code = access.plan_code === null ? 'SUBSCRIPTION_REQUIRED' : 'SUBSCRIPTION_EXPIRED';
      return NextResponse.json({ error: { code, message: code === 'SUBSCRIPTION_REQUIRED' ? 'ไม่มี Pro plan' : 'Subscription หมดอายุ' } }, { status: 403 });
    }

    const { data: row, error: mvError } = await supabase
      .from('mv_team_analytics')
      .select('team_id, games_played, avg_kills, avg_deaths, avg_assists, avg_acs, adr_metrics, avg_headshot_pct, heatmap_data, first_blood_pct, economy_breakdown, data_as_of')
      .eq('team_id', teamId)
      .maybeSingle();

    if (mvError) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: mvError.message } }, { status: 500 });
    }

    if (!row) {
      return NextResponse.json({
        team_id: teamId,
        games_played: 0,
        heatmap: null,
        round_economy: null,
        first_blood_pct: null,
        adr: null,
        data_as_of: null,
        read_only: access.read_only,
      });
    }

    return NextResponse.json({
      team_id: row.team_id,
      games_played: row.games_played,
      avg_kills: row.avg_kills,
      avg_deaths: row.avg_deaths,
      avg_assists: row.avg_assists,
      avg_acs: row.avg_acs,
      adr: row.adr_metrics,
      avg_headshot_pct: row.avg_headshot_pct,
      heatmap: row.heatmap_data,
      round_economy: row.economy_breakdown,
      first_blood_pct: row.first_blood_pct,
      data_as_of: row.data_as_of,
      read_only: access.read_only,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
