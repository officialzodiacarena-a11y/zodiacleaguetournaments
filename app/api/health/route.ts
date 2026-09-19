// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'disconnected';
  let dbLatencyMs = 0;
  let errorDetail: string | null = null;

  try {
    const supabase = await createClient();
    const dbStart = Date.now();
    const { error } = await supabase.from('tournaments').select('id').limit(1);
    dbLatencyMs = Date.now() - dbStart;

    if (error) {
      dbStatus = 'error';
      errorDetail = error.message;
    } else {
      dbStatus = 'connected';
    }
  } catch (err: unknown) {
    dbStatus = 'failed';
    errorDetail = err instanceof Error ? err.message : 'Failed to initialize Supabase client';
  }

  const isHealthy = dbStatus === 'connected';

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'zodiacleague-web',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      total_latency_ms: Date.now() - startTime,
      checks: {
        database: {
          status: dbStatus,
          latency_ms: dbLatencyMs,
          error: errorDetail,
        },
        env: {
          supabase_url_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        },
      },
    },
    { status: isHealthy ? 200 : 503 }
  );
}
