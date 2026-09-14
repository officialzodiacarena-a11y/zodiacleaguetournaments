// app/api/v1/affiliate/stats/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!player) {
      return NextResponse.json(
        { success: false, error: 'PLAYER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Fetch or Generate Unique Affiliate Code
    let { data: affCode } = await supabase
      .from('affiliate_codes')
      .select('*')
      .eq('player_id', player.id)
      .maybeSingle();

    if (!affCode) {
      const generatedCode = `ZODIAC-${player.id.substring(0, 5).toUpperCase()}`;
      const { data: newCode } = await supabase
        .from('affiliate_codes')
        .insert({
          player_id: player.id,
          code: generatedCode,
        })
        .select()
        .single();
      affCode = newCode;
    }

    // Fetch Referral Counts
    const { count: tier1Count } = await supabase
      .from('affiliate_referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', player.id)
      .eq('status', 'ACTIVE');

    return NextResponse.json({
      success: true,
      data: {
        affiliate_code: affCode?.code || 'ZODIAC-VIP',
        referral_url: `https://zodiac.arena/register?ref=${affCode?.code}`,
        total_referrals: affCode?.total_referrals || 0,
        total_ap_earned: Number(affCode?.total_ap_earned || 0),
        tier1_active_count: tier1Count || 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
