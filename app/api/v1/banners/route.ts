// app/api/v1/banners/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SponsorBannerPublic, SponsorSlotPosition } from '@/types/sponsor';

export const dynamic = 'force-dynamic';

const VALID_SLOTS: SponsorSlotPosition[] = [
  'TOP_LEADERBOARD',
  'LEFT_TOWER',
  'RIGHT_TOWER',
  'OFFICIAL_SPONSORS_BAR',
  'OBS_SPONSOR_BADGE',
  'STREAM_HUB_BOX',
  'SPONSOR_LANDING_HERO',
];

// ✅ รับเฉพาะ request ไม่ต้องมี { params }
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slotPosition = searchParams.get('slot_position') as SponsorSlotPosition | null;

    if (slotPosition && !VALID_SLOTS.includes(slotPosition)) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    let query = supabase
      .from('sponsor_banners')
      .select('id, title, slot_position, image_url, target_url, brand_name, priority, sponsor_id')
      .eq('is_active', true)
      .lte('starts_at', nowIso)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order('priority', { ascending: false })
      .order('starts_at', { ascending: false })
      .order('id', { ascending: true });

    if (slotPosition) {
      query = query.eq('slot_position', slotPosition as never);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[API /api/v1/banners] Query error:', error.message);
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      data: (data ?? []) as SponsorBannerPublic[],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/v1/banners] Fatal error:', message);
    return NextResponse.json({ success: true, data: [] }, { status: 200 });
  }
}