// app/api/v1/admin/sponsors/[id]/metrics/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminRole, MARKETPLACE_ADMIN_ROLES } from '@/lib/admin/requireAdminRole';
import { SponsorIdParamSchema, type SponsorMetricsSummary } from '@/types/sponsor';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const idValidation = SponsorIdParamSchema.safeParse(resolvedParams.id);
    if (!idValidation.success) {
      return NextResponse.json({ error: { code: 'INVALID_ID', message: 'รูปแบบ Sponsor ID ไม่ถูกต้อง' } }, { status: 400 });
    }
    const sponsorId = idValidation.data;

    const supabase = await createClient();
    const gate = await requireAdminRole(supabase, MARKETPLACE_ADMIN_ROLES);
    if ('error' in gate) return gate.error;

    const adminSupabase = createAdminClient();

    const { data: sponsor, error: sponsorError } = await adminSupabase
      .from('sponsors')
      .select('id, company_name, tier')
      .eq('id', sponsorId)
      .single();

    if (sponsorError || !sponsor) {
      return NextResponse.json({ error: { code: 'SPONSOR_NOT_FOUND', message: 'ไม่พบข้อมูลสปอนเซอร์' } }, { status: 404 });
    }

    const { data: banners, error: bannersError } = await adminSupabase
      .from('sponsor_banners')
      .select('impression_count, click_count')
      .eq('sponsor_id', sponsorId);

    if (bannersError) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: bannersError.message } }, { status: 500 });
    }

    const totalImpressions = (banners ?? []).reduce((sum, b) => sum + Number(b.impression_count || 0), 0);
    const totalClicks = (banners ?? []).reduce((sum, b) => sum + Number(b.click_count || 0), 0);
    const ctr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0.0;

    const { data: coupons } = await adminSupabase
      .from('partner_coupons')
      .select('id')
      .eq('sponsor_id', sponsorId);

    const couponIds = (coupons ?? []).map((c) => c.id);
    let redemptionsCount = 0;
    if (couponIds.length > 0) {
      const { count } = await adminSupabase
        .from('partner_coupon_redemptions')
        .select('id', { count: 'exact', head: true })
        .in('coupon_id', couponIds);
      redemptionsCount = count ?? 0;
    }

    const summary: SponsorMetricsSummary = {
      sponsor_id: sponsor.id,
      company_name: sponsor.company_name,
      tier: sponsor.tier,
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      ctr_percent: ctr,
      banners_count: (banners ?? []).length,
      active_coupons_redeemed: redemptionsCount,
    };

    return NextResponse.json({ success: true, data: summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
