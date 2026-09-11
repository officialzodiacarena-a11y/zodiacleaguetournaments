import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const LOOKBACK_HOURS = 1;
const AP_DRAIN_THRESHOLD = 1000;

interface LedgerRow {
  player_id: string;
  amount: number;
}

// Patch V1.01 (B3-3): app/api/cron/abuse-analysis already exists but its
// abuse_flags.flag_type CHECK constraint only allows DEVICE_MULTI_ACCOUNT /
// IP_CLUSTER / BOT_PATTERN — no AP-drain category, and adding one needs a
// migration this route is not permitted to write or run. So this scans
// ap_ledger via the Supabase query builder (no raw SQL) and reports/logs
// anomalies instead of persisting a new flag row. If พี่หยัด wants these
// persisted, ap_ledger's own idempotency/audit trail (Gate D6) already
// covers "what happened" — this cron only needs to widen abuse_flags'
// flag_type CHECK to add e.g. 'AP_DRAIN' for that to slot in directly.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createAdminClient();
  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

  const { data, error } = await adminSupabase
    .from('ap_ledger')
    .select('player_id, amount')
    .lt('amount', 0)
    .gte('created_at', since);

  if (error) {
    console.error(`[ap-anomaly-alert] ${now.toISOString()} fetch failed: ${error.message}`);
    return NextResponse.json({ error: `Fetch failed: ${error.message}` }, { status: 500 });
  }

  const rows = (data ?? []) as LedgerRow[];

  const spentByPlayer = new Map<string, number>();
  for (const row of rows) {
    spentByPlayer.set(row.player_id, (spentByPlayer.get(row.player_id) ?? 0) + Math.abs(row.amount));
  }

  const anomalies = Array.from(spentByPlayer.entries())
    .filter(([, totalSpent]) => totalSpent > AP_DRAIN_THRESHOLD)
    .map(([player_id, total_spent_ap]) => ({ player_id, total_spent_ap }));

  if (anomalies.length > 0) {
    console.error(
      `[ap-anomaly-alert] ${now.toISOString()} ⚠️ AP_DRAIN_ANOMALY detected (>${AP_DRAIN_THRESHOLD} AP/${LOOKBACK_HOURS}h): ${JSON.stringify(anomalies)}`
    );
  }

  return NextResponse.json({
    success: true,
    lookback_hours: LOOKBACK_HOURS,
    threshold_ap: AP_DRAIN_THRESHOLD,
    players_scanned: spentByPlayer.size,
    anomalies,
  });
}
