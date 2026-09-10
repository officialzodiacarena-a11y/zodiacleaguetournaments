import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateListingSchema, LISTING_CURRENCIES } from '@/types/marketplace';

// Zero-Leak: this GET handler's SELECT explicitly lists columns and never
// includes floor_price — do not change this to select('*').
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    const vendorId = searchParams.get('vendor_id');
    const currencyType = searchParams.get('currency_type');
    const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '20') || 20));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('marketplace_listings')
      .select('id, vendor_id, item_title, currency_type, current_highest_bid, buyout_price, status, auction_ends_at', { count: 'exact' })
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (vendorId) query = query.eq('vendor_id', vendorId);
    if (currencyType && LISTING_CURRENCIES.includes(currencyType as never)) query = query.eq('currency_type', currencyType);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: error.message } }, { status: 500 });
    }

    const listings = (data ?? []).map((row) => ({
      listing_id: row.id,
      vendor_id: row.vendor_id,
      item_title: row.item_title,
      currency_type: row.currency_type,
      current_highest_bid: row.current_highest_bid,
      buyout_price: row.buyout_price,
      status: row.status,
      auction_ends_at: row.auction_ends_at,
    }));

    return NextResponse.json({ listings, total: count ?? listings.length, page, limit });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } }, { status: 401 });
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ขาเข้าไม่ถูกต้อง' } }, { status: 400 });
    }

    const parsed = CreateListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลขาเข้าไม่ถูกต้อง', details: parsed.error.format() } },
        { status: 400 }
      );
    }

    const { vendor_id, item_title, description, image_urls, currency_type, floor_price, buyout_price, is_paid_slot, auction_ends_at } = parsed.data;

    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id, player_id')
      .eq('id', vendor_id)
      .single();

    if (vendorError || !vendor || vendor.player_id !== player.id) {
      return NextResponse.json({ error: { code: 'INVALID_VENDOR', message: 'vendor_id ไม่ใช่ของตัวเอง' } }, { status: 403 });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_marketplace_listing', {
      p_vendor_id: vendor_id,
      p_item_title: item_title,
      p_description: description ?? null,
      p_image_urls: JSON.stringify(image_urls ?? []),
      p_currency_type: currency_type,
      p_floor_price: floor_price,
      p_buyout_price: buyout_price ?? null,
      p_is_paid_slot: is_paid_slot ?? false,
      p_auction_ends_at: auction_ends_at ?? null,
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as {
      success: boolean;
      error?: string;
      listing_id?: string;
      status?: string;
      is_paid_slot?: boolean;
      monthly_listing_count?: number;
      monthly_remaining_free?: number;
    };

    if (!result.success) {
      const statusByError: Record<string, number> = { CONCURRENT_SLOT_FULL: 422, MONTHLY_CAP_REACHED: 422, BUYOUT_BELOW_FLOOR: 400, VENDOR_NOT_FOUND: 404 };
      return NextResponse.json({ error: { code: result.error, message: result.error } }, { status: statusByError[result.error ?? ''] ?? 400 });
    }

    return NextResponse.json(
      {
        listing_id: result.listing_id,
        status: result.status,
        is_paid_slot: result.is_paid_slot,
        monthly_listing_count: result.monthly_listing_count,
        monthly_remaining_free: result.monthly_remaining_free,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
