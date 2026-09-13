// app/api/v1/banners/[id]/track/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TrackBannerEventSchema } from '@/types/sponsor';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const bannerId = resolvedParams.id;

    if (!bannerId) {
      return NextResponse.json({ error: 'Missing banner ID' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parseResult = TrackBannerEventSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid event_type. Allowed: IMPRESSION, CLICK' },
        { status: 400 }
      );
    }

    const { event_type } = parseResult.data;
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase.rpc('increment_banner_metric', {
      p_banner_id: bannerId,
      p_metric_type: event_type,
    });

    if (error) {
      console.error(`[Track Banner Error] ID: ${bannerId}, Event: ${event_type}`, error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      event: event_type,
      banner_id: bannerId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Track Banner Fatal]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}