// app/api/v1/admin/banners/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminRole, MARKETPLACE_ADMIN_ROLES } from '@/lib/admin/requireAdminRole';
import { CreateBannerSchema, type AdminBannerDetail } from '@/types/sponsor';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const gate = await requireAdminRole(supabase, MARKETPLACE_ADMIN_ROLES);
    if ('error' in gate) return gate.error;

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('sponsor_banners')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: error.message } }, { status: 500 });
    }

    const banners: AdminBannerDetail[] = (data ?? []).map((row) => {
      const impressions = Number(row.impression_count || 0);
      const clicks = Number(row.click_count || 0);
      const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0.0;

      return {
        id: row.id,
        title: row.title,
        slot_position: row.slot_position,
        image_url: row.image_url,
        target_url: row.target_url,
        brand_name: row.brand_name,
        priority: row.priority,
        is_active: row.is_active,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
        impression_count: impressions,
        click_count: clicks,
        ctr_percent: ctr,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return NextResponse.json({ success: true, data: banners });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const gate = await requireAdminRole(supabase, MARKETPLACE_ADMIN_ROLES);
    if ('error' in gate) return gate.error;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON ไม่ถูกต้อง' } }, { status: 400 });
    }

    const parseResult = CreateBannerSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ถูกต้อง', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const payload = parseResult.data;
    const adminSupabase = createAdminClient();

    const { data: created, error } = await adminSupabase
      .from('sponsor_banners')
      .insert({
        title: payload.title,
        slot_position: payload.slot_position,
        image_url: payload.image_url,
        target_url: payload.target_url,
        brand_name: payload.brand_name || null,
        priority: payload.priority,
        is_active: payload.is_active,
        starts_at: payload.starts_at || new Date().toISOString(),
        ends_at: payload.ends_at || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: { code: 'INSERT_FAILED', message: error.message } }, { status: 500 });
    }

    // Audit Log
    await adminSupabase.from('audit_logs').insert({
      actor_id: gate.playerId,
      action: 'CREATE',
      entity_type: 'sponsor_banners',
      entity_id: created.id,
      reason: `Create sponsor banner: ${created.title}`,
      after_data: created,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}