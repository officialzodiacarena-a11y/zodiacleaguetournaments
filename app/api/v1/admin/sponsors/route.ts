// app/api/v1/admin/sponsors/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminRole, MARKETPLACE_ADMIN_ROLES } from '@/lib/admin/requireAdminRole';
import { CreateSponsorSchema, type AdminSponsorDetail } from '@/types/sponsor';
import type { Json } from '@/types/database.types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const gate = await requireAdminRole(supabase, MARKETPLACE_ADMIN_ROLES);
    if ('error' in gate) return gate.error;

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('sponsors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: (data ?? []) as AdminSponsorDetail[] });
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

    const parseResult = CreateSponsorSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ถูกต้อง', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const payload = parseResult.data;
    const adminSupabase = createAdminClient();

    const { data: created, error } = await adminSupabase
      .from('sponsors')
      .insert({
        company_name: payload.company_name,
        brand_logo_url: payload.brand_logo_url,
        contact_email: payload.contact_email,
        partner_player_id: payload.partner_player_id || null,
        tier: payload.tier,
        status: 'PENDING',
        is_active: true,
        created_by: gate.playerId,
        metadata: payload.metadata as Json,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: { code: 'INSERT_FAILED', message: error.message } }, { status: 500 });
    }

    await adminSupabase.from('audit_logs').insert({
      actor_id: gate.playerId,
      action: 'CREATE',
      entity_type: 'sponsors',
      entity_id: created.id,
      reason: `Onboard new sponsor: ${created.company_name} (${created.tier})`,
      after_data: created,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
