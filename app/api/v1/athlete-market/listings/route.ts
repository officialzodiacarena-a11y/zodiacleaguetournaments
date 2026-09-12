import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const QuerySchema = z.object({
  role: z.enum(['ALL', 'DUELIST', 'INITIATOR', 'CONTROLLER', 'SENTINEL']).default('ALL'),
  sort: z.enum(['RECENT', 'PRICE_ASC', 'PRICE_DESC', 'HIGHEST_ACS']).default('RECENT'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = QuerySchema.parse(Object.fromEntries(searchParams));
    const supabase = await createClient();

    const offset = (query.page - 1) * query.limit;

    // 🛑 STRICT: Explicit Column Projection — NEVER SELECT floor_price_ap
    let dbQuery = supabase
      .from('athlete_market_listings')
      .select(`
        id,
        listing_type,
        buyout_price_ap,
        current_highest_bid_ap,
        status,
        contract_note,
        expires_at,
        created_at,
        seller_player:seller_player_id (
          id, athlete_id, display_name, avatar_url
        ),
        seller_team:seller_team_id (
          id, name, tag, logo_url
        ),
        target_player:target_player_id (
          id, athlete_id, display_name, avatar_url, country_code,
          player_stats (
            avg_acs, avg_kd, avg_adr, headshot_pct, win_rate
          )
        )
      `, { count: 'exact' })
      .eq('status', 'ACTIVE')
      .gt('expires_at', new Date().toISOString());

    // Role Filter
    if (query.role !== 'ALL') {
      dbQuery = dbQuery.eq('target_player.primary_role', query.role);
    }

    // Sorting Logic — แก้ไข nullsFirst ให้ถูกต้องตาม Supabase JS Client Specs
    if (query.sort === 'RECENT') {
      dbQuery = dbQuery.order('created_at', { ascending: false });
    } else if (query.sort === 'PRICE_ASC') {
      dbQuery = dbQuery.order('buyout_price_ap', { ascending: true, nullsFirst: false });
    } else if (query.sort === 'PRICE_DESC') {
      dbQuery = dbQuery.order('buyout_price_ap', { ascending: false, nullsFirst: false });
    }

    const { data: listings, count, error } = await dbQuery.range(offset, offset + query.limit - 1);

    if (error) {
      return NextResponse.json({ error: { code: 'DATABASE_ERROR', message: error.message } }, { status: 500 });
    }

    // Transform and sanitize Payload
    const formattedData = (listings || []).map((item) => ({
      listing_id: item.id,
      listing_type: item.listing_type,
      pricing: {
        buyout_price_ap: item.buyout_price_ap,
        current_highest_bid_ap: item.current_highest_bid_ap,
      },
      seller_team: item.seller_team,
      target_player: item.target_player,
      contract_note: item.contract_note,
      expires_at: item.expires_at,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      pagination: {
        current_page: query.page,
        total_pages: Math.ceil((count || 0) / query.limit),
        total_records: count || 0,
      },
    }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid parameters';
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message } }, { status: 400 });
  }
}
