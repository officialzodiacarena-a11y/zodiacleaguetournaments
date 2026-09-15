// app/api/v1/players/me/telemetry-hud/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TelemetryHudCompositePayload } from '@/types/athlete-telemetry-hud';

interface TelemetryHudRpcArgs {
  p_player_id: string;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED: Session invalid or expired' },
        { status: 401 }
      );
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      return NextResponse.json(
        { success: false, error: 'PLAYER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const { data, error: rpcError } = await supabase.rpc<
      'get_athlete_telemetry_dashboard_v26',
      TelemetryHudRpcArgs
    >('get_athlete_telemetry_dashboard_v26', {
      p_player_id: player.id,
    });

    if (rpcError) {
      console.error('[TELEMETRY_HUD_RPC_ERROR]', rpcError);
      return NextResponse.json(
        { success: false, error: rpcError.message },
        { status: 500 }
      );
    }

    const payload = data as unknown as TelemetryHudCompositePayload;

    return NextResponse.json(
      { success: true, data: payload },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'INTERNAL_SERVER_ERROR';
    console.error('[TELEMETRY_HUD_HANDLER_EXCEPTION]', err);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
