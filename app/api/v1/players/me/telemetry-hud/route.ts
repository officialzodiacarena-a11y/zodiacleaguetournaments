// app/api/v1/players/me/telemetry-hud/route.ts
//
// Serves the caller's own telemetry by default. Pass ?playerId=<players.id>
// to view another athlete's public HUD (e.g. from a profile page) — the RPC
// itself still requires the caller to be signed in, and only exposes
// balance-type fields (AP) when the viewer is the profile's owner.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TelemetryHudCompositePayload } from '@/types/athlete-telemetry-hud';

interface TelemetryHudRpcArgs {
  p_player_id: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    let targetPlayerId = req.nextUrl.searchParams.get('playerId');
    let requestingUserId: string | null = null;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      requestingUserId = user.id;
    }

    if (!targetPlayerId) {
      if (!user) {
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

      targetPlayerId = player.id;
    }

    if (targetPlayerId && !UUID_RE.test(targetPlayerId)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PLAYER_ID' },
        { status: 400 }
      );
    }

    const { data, error: rpcError } = await supabase.rpc<
      'get_athlete_telemetry_dashboard_v26',
      TelemetryHudRpcArgs
    >('get_athlete_telemetry_dashboard_v26', {
      p_player_id: targetPlayerId,
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
