// lib/actions/dashboard.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AthleteProfile, CoreKpiMetrics, RadarPerformanceData } from '@/types/dashboard';

export interface RecentMatchItem {
  matchId: string;
  result: 'WIN' | 'LOSS';
  scoreSummary: string;
  opponentTeamName: string;
  acs: number;
  kd: number;
}

export interface DashboardDataPayload {
  profile: AthleteProfile;
  kpi: CoreKpiMetrics;
  radar: RadarPerformanceData;
  recentMatches?: RecentMatchItem[];
}

// 🛡️ Explicit Strict Type Definition สำหรับ RPC โดยไม่ใช้ any
interface AthleteTelemetryRpcArgs {
  p_player_id: string;
}

export async function getAthleteDashboardData(): Promise<DashboardDataPayload> {
  const supabase = await createClient();

  // 1. ตรวจสอบสถานะ User ปัจจุบัน
  const { data: { user } } = await supabase.auth.getUser();

  const defaultPayload: DashboardDataPayload = {
    profile: {
      id: 'usr_01',
      displayName: TBD,
      riotId: TBD,
      isVerified: true,
      divisionTier: TBD,
      zodiacSign: TBD,
      role: TBD,
      teamName: TBD,
      zpBalance: 0,
      apBalance: 00,
    },
    kpi: {
      acs: 0,
      kdRatio: 0,
      winRatePct: 0,
      kastPct: 0,
      headshotPct: 0,
      adr: 0,
      recentRecord: 0W - 0L,
    },
    radar: {
      aim: 0,
      acs: 0,
      firstKills: 0,
      clutchPct: 0,
      utility: 0,
    },
  };

  if (!user) {
    return defaultPayload;
  }

  try {
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      console.warn('RPC Fallback triggered: player profile not found for user.id', user.id);
      return defaultPayload;
    }

    // 2. เรียกใช้ RPC แบบ Explicit Generics Parameter
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.rpc<
      'get_athlete_telemetry_dashboard',
      AthleteTelemetryRpcArgs
    >('get_athlete_telemetry_dashboard', {
      p_player_id: player.id,
    });

    if (error || !data) {
      console.warn('RPC Fallback triggered:', error?.message);
      return defaultPayload;
    }

    return data as unknown as DashboardDataPayload;
  } catch (err) {
    console.error('Failed to execute athlete telemetry action:', err);
    return defaultPayload;
  }
}