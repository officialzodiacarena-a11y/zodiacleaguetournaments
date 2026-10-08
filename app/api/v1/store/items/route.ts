import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toStoreBrand } from '@/lib/store/brand-display';

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
  category_id: string | null;
  item_type: string | null;
  partner_brand: string | null;
  image_url: string | null;
  brand: { slug: string; name: string; badge_icon: string | null; sponsor_id: string | null } | null;
  store_item_variants: VariantRow[];
}

// ร้านเริ่มต้น (Master Spec Commerce Hub หมวด 4) · ?storefront=<slug> เปลี่ยนร้านได้
const DEFAULT_STOREFRONT = 'zodiac-esports';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type');
    const categorySlug = searchParams.get('category');
    const brandFilter = searchParams.get('brand');
    const explicitStorefront = searchParams.get('storefront');

    const supabase = await createClient();

    let query = supabase
      .from('store_items')
      .select(
        'id, name, type, description, max_per_player, category_id, item_type, partner_brand, image_url, brand:brand_id(slug, name, badge_icon, sponsor_id), store_item_variants(id, name, price_ap, price_thb, stock, reserved_stock, available_until)'
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // กรองตามร้าน: สินค้าที่ยังไม่มี storefront_id (เพิ่มก่อน K4) นับเป็นร้านเริ่มต้น
    const storefrontSlug = explicitStorefront ?? DEFAULT_STOREFRONT;
    const { data: storefront } = await supabase
      .from('storefronts')
      .select('id')
      .eq('slug', storefrontSlug)
      .eq('is_active', true)
      .maybeSingle();
    if (storefront) {
      query =
        storefrontSlug === DEFAULT_STOREFRONT
          ? query.or(`storefront_id.eq.${storefront.id},storefront_id.is.null`)
          : query.eq('storefront_id', storefront.id);
    } else if (explicitStorefront) {
      return NextResponse.json({ data: [] });
    }

    if (typeFilter) {
      query = query.eq('type', typeFilter);
    }

    if (brandFilter) {
      query = query.eq('partner_brand', brandFilter);
    }

    if (categorySlug) {
      const { data: category, error: categoryError } = await supabase
        .from('store_categories')
        .select('id')
        .eq('slug', categorySlug)
        .single();

      if (categoryError || !category) {
        return NextResponse.json({ data: [] });
      }

      query = query.eq('category_id', category.id);
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
        category_id: item.category_id,
        item_type: item.item_type,
        partner_brand: item.partner_brand,
        brand: toStoreBrand(item.brand),
        image_url: item.image_url,
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
