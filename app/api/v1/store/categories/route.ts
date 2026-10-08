import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toStoreBrand, type StoreBrand } from '@/lib/store/brand-display';

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  partner_brand: string | null;
  icon_url: string | null;
  display_order: number;
  brand: { slug: string; name: string; badge_icon: string | null; sponsor_id: string | null } | null;
}

interface CategoryNode extends Omit<CategoryRow, 'brand'> {
  brand: StoreBrand | null;
  children: CategoryNode[];
}

function buildTree(rows: CategoryRow[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>(rows.map((r) => [r.id, { ...r, brand: toStoreBrand(r.brand), children: [] }]));
  const roots: CategoryNode[] = [];

  for (const row of rows) {
    const node = nodes.get(row.id)!;
    if (row.parent_id && nodes.has(row.parent_id)) {
      nodes.get(row.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('store_categories')
      .select('id, name, slug, parent_id, partner_brand, icon_url, display_order, brand:brand_id(slug, name, badge_icon, sponsor_id)')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: error.message } }, { status: 500 });
    }

    const rows = (data ?? []) as unknown as CategoryRow[];
    return NextResponse.json({ data: buildTree(rows) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
