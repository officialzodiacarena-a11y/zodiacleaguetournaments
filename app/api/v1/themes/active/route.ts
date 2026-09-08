import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { BrandThemeRow } from '@/types/themes';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function fetchActiveTheme(
  supabase: SupabaseClient,
  nowISO: string,
  scopeType: string,
  scopeId: string | null
): Promise<BrandThemeRow | null> {
  let query = supabase
    .from('brand_themes')
    .select('*')
    .eq('scope_type', scopeType)
    .eq('is_active', true)
    .lte('active_from', nowISO)
    .or(`active_until.is.null,active_until.gte.${nowISO}`)
    .order('priority', { ascending: false })
    .order('active_from', { ascending: false })
    .limit(1);

  query = scopeId ? query.eq('scope_id', scopeId) : query.is('scope_id', null);

  const { data } = await query.maybeSingle();
  return (data as BrandThemeRow | null) ?? null;
}

// SEASON เลือกจากวันที่ปัจจุบันเท่านั้น ไม่ระบุ scope_id ตายตัว (เว้นแต่ผู้เรียกจะขอ
// SEASON scope_id เจาะจงมาเอง ซึ่งจะ override ชั้นนี้แทน)
async function fetchCurrentSeasonTheme(supabase: SupabaseClient, nowISO: string): Promise<BrandThemeRow | null> {
  const { data } = await supabase
    .from('brand_themes')
    .select('*')
    .eq('scope_type', 'SEASON')
    .eq('is_active', true)
    .lte('active_from', nowISO)
    .or(`active_until.is.null,active_until.gte.${nowISO}`)
    .order('priority', { ascending: false })
    .order('active_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as BrandThemeRow | null) ?? null;
}

function mergeLayer(
  base: Record<string, string>,
  layer: BrandThemeRow | null,
  field: 'colors' | 'typography' | 'assets' | 'custom_css_vars'
): Record<string, string> {
  return layer ? { ...base, ...layer[field] } : base;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scopeType = searchParams.get('scope_type');
    const scopeId = searchParams.get('scope_id');

    const supabase = await createClient();
    const nowISO = new Date().toISOString();

    const global = await fetchActiveTheme(supabase, nowISO, 'GLOBAL', null);

    if (!global) {
      return NextResponse.json(
        { error: { code: 'GLOBAL_THEME_MISSING', message: 'ไม่พบ GLOBAL theme ที่ active อยู่ในระบบ' } },
        { status: 500 }
      );
    }

    let season = await fetchCurrentSeasonTheme(supabase, nowISO);

    let specific: BrandThemeRow | null = null;

    if (scopeType && scopeType !== 'GLOBAL' && scopeId) {
      if (scopeType === 'SEASON') {
        const explicitSeason = await fetchActiveTheme(supabase, nowISO, 'SEASON', scopeId);
        if (explicitSeason) season = explicitSeason;
      } else {
        specific = await fetchActiveTheme(supabase, nowISO, scopeType, scopeId);
      }
    }

    let colors = mergeLayer({}, global, 'colors');
    let typography = mergeLayer({}, global, 'typography');
    let assets = mergeLayer({}, global, 'assets');
    let customCssVars = mergeLayer({}, global, 'custom_css_vars');

    colors = mergeLayer(colors, season, 'colors');
    typography = mergeLayer(typography, season, 'typography');
    assets = mergeLayer(assets, season, 'assets');
    customCssVars = mergeLayer(customCssVars, season, 'custom_css_vars');

    colors = mergeLayer(colors, specific, 'colors');
    typography = mergeLayer(typography, specific, 'typography');
    assets = mergeLayer(assets, specific, 'assets');
    customCssVars = mergeLayer(customCssVars, specific, 'custom_css_vars');

    return NextResponse.json({
      data: {
        colors,
        typography,
        assets,
        custom_css_vars: customCssVars,
      },
      layers: {
        global: { code: global.code, id: global.id },
        season: season ? { code: season.code, id: season.id } : null,
        specific: specific ? { code: specific.code, id: specific.id } : null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
