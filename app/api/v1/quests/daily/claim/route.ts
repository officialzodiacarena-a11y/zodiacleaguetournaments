// app/api/v1/quests/daily/claim/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const ClaimSchema = z.object({
  questId: z.string().min(1),
});

export async function POST(req: Request) {
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    const parseResult = ClaimSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    const { questId } = parseResult.data;

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

    const idempotencyKey =
      req.headers.get('Idempotency-Key') ||
      `quest_claim_${player.id}_${questId}_${new Date().toISOString().split('T')[0]}`;

    // Call Atomic RPC claim_daily_quest_reward
    const { data: rpcRes, error: rpcError } = await supabase.rpc(
      'claim_daily_quest_reward',
      {
        p_player_id: player.id,
        p_quest_id: questId,
        p_idempotency_key: idempotencyKey,
      }
    );

    if (rpcError) {
      return NextResponse.json(
        { success: false, error: rpcError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rpcRes,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
