import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id: listingId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('marketplace_trade_history')
      .select('id, item_title, sold_price, currency_type, sold_at')
      .eq('listing_id', listingId)
      .order('sold_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: error.message } }, { status: 500 });
    }

    const trades = (data ?? []).map((row) => ({
      trade_id: row.id,
      item_title: row.item_title,
      sold_price: row.sold_price,
      currency_type: row.currency_type,
      sold_at: row.sold_at,
    }));

    return NextResponse.json({ trades });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
