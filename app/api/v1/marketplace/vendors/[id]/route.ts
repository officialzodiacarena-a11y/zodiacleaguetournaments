import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: vendor, error } = await supabase
      .from('vendors')
      .select('id, player_id, shop_name, description, is_active, monthly_listing_count, monthly_reset_at')
      .eq('id', id)
      .single();

    if (error || !vendor) {
      return NextResponse.json({ error: { code: 'VENDOR_NOT_FOUND', message: 'ไม่พบร้านค้านี้' } }, { status: 404 });
    }

    // monthly_listing_count is only shown to the vendor owner or an admin —
    // everyone else sees the public shape only.
    let isOwnerOrAdmin = false;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: player } = await supabase.from('players').select('id').eq('user_id', user.id).maybeSingle();
      if (player?.id === vendor.player_id) isOwnerOrAdmin = true;
      if (!isOwnerOrAdmin) {
        const { data: isAdmin } = await supabase.rpc('is_admin');
        isOwnerOrAdmin = Boolean(isAdmin);
      }
    }

    return NextResponse.json({
      vendor_id: vendor.id,
      shop_name: vendor.shop_name,
      description: vendor.description,
      is_active: vendor.is_active,
      ...(isOwnerOrAdmin ? { monthly_listing_count: vendor.monthly_listing_count, monthly_reset_at: vendor.monthly_reset_at } : {}),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
