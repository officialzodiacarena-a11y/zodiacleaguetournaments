// app/api/cron/reconcile-zp/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface ReconcileZpRow {
  team_id: string;
  ledger_sum: number;
  cached: number;
  diff: number;
}

interface RebuildZpResult {
  success: boolean;
  rows_corrected: number;
}

interface DynamicZpAdmin {
  rpc: (
    fnName: string,
    params?: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => {
    insert: (values: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const dynamicAdmin = adminSupabase as unknown as DynamicZpAdmin;

    // ดึงซีซัน ACTIVE ปัจจุบัน
    const { data: activeSeasons, error: seasonErr } = await adminSupabase
      .from('seasons')
      .select('id')
      .eq('status', 'ACTIVE');

    if (seasonErr) {
      return NextResponse.json({ error: seasonErr.message }, { status: 500 });
    }

    const discrepanciesFound: Array<ReconcileZpRow & { season_id: string }> = [];

    for (const season of activeSeasons ?? []) {
      const { data: recData, error: recErr } = await dynamicAdmin.rpc('reconcile_zp', {
        p_season_id: season.id,
      });

      if (recErr) continue;

      const rows = (recData as unknown as ReconcileZpRow[]) ?? [];
      for (const row of rows) {
        if (row.diff !== 0) {
          discrepanciesFound.push({ ...row, season_id: season.id });

          const { data: rebuildData } = await dynamicAdmin.rpc('rebuild_zp_balance', {
            p_season_id: season.id,
            p_team_id: row.team_id,
          });

          const rebuildRes = rebuildData as unknown as RebuildZpResult | null;

          await dynamicAdmin.from('audit_logs').insert({
            action: 'UPDATE',
            entity_type: 'zp_reconciliation',
            entity_id: row.team_id,
            reason: 'AUTO_RECONCILE_ZP_CRON',
            after_data: {
              season_id: season.id,
              discrepancy: row.diff,
              was_corrected: rebuildRes?.success ?? false,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      discrepancies_count: discrepanciesFound.length,
      discrepancies: discrepanciesFound,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}