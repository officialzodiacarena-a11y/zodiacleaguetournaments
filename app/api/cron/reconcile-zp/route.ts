import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { type ReconcileZpRow } from '@/types/zp-engine';

interface RebuildZpResult {
  success: boolean;
  rows_corrected: number;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createAdminClient();

  // Get all ACTIVE seasons
  const { data: seasons, error: seasonsError } = await adminSupabase
    .from('seasons')
    .select('id')
    .eq('status', 'ACTIVE');

  if (seasonsError) {
    return NextResponse.json(
      { error: `Failed to fetch active seasons: ${seasonsError.message}` },
      { status: 500 }
    );
  }

  if (!seasons || seasons.length === 0) {
    return NextResponse.json({ success: true, message: 'No active seasons to reconcile', processed: [] });
  }

  const results: Array<{
    season_id: string;
    status: 'PASS' | 'CORRECTED' | 'ERROR';
    discrepancies: number;
    rows_corrected?: number;
    error?: string;
  }> = [];

  for (const season of seasons) {
    const seasonId = season.id as string;

    try {
      const { data: discrepantRows, error: reconcileError } = await adminSupabase.rpc('reconcile_zp', {
        p_season_id: seasonId,
      });

      if (reconcileError) {
        results.push({ season_id: seasonId, status: 'ERROR', discrepancies: 0, error: reconcileError.message });
        continue;
      }

      const rows = (discrepantRows ?? []) as ReconcileZpRow[];

      if (rows.length === 0) {
        results.push({ season_id: seasonId, status: 'PASS', discrepancies: 0 });
        continue;
      }

      // Auto-fix: rebuild ZP balance from ledger truth
      const { data: rebuildResult, error: rebuildError } = await adminSupabase.rpc('rebuild_zp_balance', {
        p_season_id: seasonId,
        p_team_id: null,
      });

      if (rebuildError) {
        results.push({
          season_id: seasonId,
          status: 'ERROR',
          discrepancies: rows.length,
          error: `reconcile OK but rebuild failed: ${rebuildError.message}`,
        });
        continue;
      }

      const rebuild = rebuildResult as RebuildZpResult;

      // Mark log records as corrected
      await adminSupabase
        .from('zp_reconciliation_log')
        .update({ was_corrected: true, corrected_at: new Date().toISOString() })
        .eq('season_id', seasonId)
        .neq('discrepancy', 0)
        .is('corrected_at', null);

      results.push({
        season_id: seasonId,
        status: 'CORRECTED',
        discrepancies: rows.length,
        rows_corrected: rebuild.rows_corrected,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      results.push({ season_id: seasonId, status: 'ERROR', discrepancies: 0, error: message });
    }
  }

  const totalDiscrepancies = results.reduce((sum, r) => sum + r.discrepancies, 0);

  return NextResponse.json({
    success: true,
    seasons_processed: results.length,
    total_discrepancies_found: totalDiscrepancies,
    results,
  });
}
