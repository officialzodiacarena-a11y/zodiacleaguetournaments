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
      displayName: 'NOVA_LEO',
      riotId: 'ren george#333',
      isVerified: true,
      divisionTier: 'CELESTIAL',
      zodiacSign: 'LEO',
      role: 'DUELIST',
      teamName: 'ARIES ESPORTS',
      zpBalance: 1450,
      apBalance: 850,
    },
    kpi: {
      acs: 268,
      kdRatio: 1.45,
      winRatePct: 68,
      kastPct: 74.2,
      headshotPct: 33.3,
      adr: 153.8,
      recentRecord: '14W - 6L',
    },
    radar: {
      aim: 85,
      acs: 92,
      firstKills: 84,
      clutchPct: 78,
      utility: 88,
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