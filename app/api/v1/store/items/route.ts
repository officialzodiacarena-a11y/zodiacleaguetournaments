import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface VariantRow {
  id: string;
  name: string;
  price_ap: number;
  price_thb: number;
  stock: number;
  reserved_stock: number;
  available_until: string | null;
}

interface ItemRow {
  id: string;
  name: string;
  type: string;
  description: string | null;
  max_per_player: number | null;
  store_item_variants: VariantRow[];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type');

    const supabase = await createClient();

    let query = supabase
      .from('store_items')
      .select(
        'id, name, type, description, max_per_player, store_item_variants(id, name, price_ap, price_thb, stock, reserved_stock, available_until)'
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (typeFilter) {
      query = query.eq('type', typeFilter);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: error.message } }, { status: 500 });
    }

    const now = Date.now();
    const items = ((data ?? []) as unknown as ItemRow[])
      .map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        description: item.description,
        max_per_player: item.max_per_player,
        variants: (item.store_item_variants ?? [])
          .filter((v) => !v.available_until || new Date(v.available_until).getTime() > now)
          .map((v) => ({
            id: v.id,
            name: v.name,
            price_ap: v.price_ap,
            price_thb: v.price_thb,
            available_until: v.available_until,
            sold_out: v.stock - v.reserved_stock <= 0,
          })),
      }))
      .filter((item) => item.variants.length > 0);

    return NextResponse.json({ data: items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
