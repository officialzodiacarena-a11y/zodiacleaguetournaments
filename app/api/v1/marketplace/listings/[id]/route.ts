import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Zero-Leak: explicit column list, floor_price is never selected here.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: listing, error } = await supabase
      .from('marketplace_listings')
      .select('id, vendor_id, item_title, description, image_urls, currency_type, current_highest_bid, buyout_price, status, auction_ends_at')
      .eq('id', id)
      .single();

    if (error || !listing) {
      return NextResponse.json({ error: { code: 'LISTING_NOT_FOUND', message: 'ไม่พบสินค้านี้' } }, { status: 404 });
    }

    return NextResponse.json({
      listing_id: listing.id,
      vendor_id: listing.vendor_id,
      item_title: listing.item_title,
      description: listing.description,
      image_urls: listing.image_urls,
      currency_type: listing.currency_type,
      current_highest_bid: listing.current_highest_bid,
      buyout_price: listing.buyout_price,
      status: listing.status,
      auction_ends_at: listing.auction_ends_at,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
