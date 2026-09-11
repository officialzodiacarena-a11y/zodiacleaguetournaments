import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  partner_brand: string | null;
  icon_url: string | null;
  display_order: number;
}

interface CategoryNode extends CategoryRow {
  children: CategoryNode[];
}

function buildTree(rows: CategoryRow[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>(rows.map((r) => [r.id, { ...r, children: [] }]));
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
      .select('id, name, slug, parent_id, partner_brand, icon_url, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: error.message } }, { status: 500 });
    }

    const rows = (data ?? []) as CategoryRow[];
    return NextResponse.json({ data: buildTree(rows) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
