// app/api/cron/abuse-analysis/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { MoveApResult } from '@/types/watch-to-earn';
import type { Json } from '@/types/database.types';

const LOOKBACK_HOURS = 24;
const IP_CLUSTER_THRESHOLD = 5;
const BOT_RISK_SCORE_THRESHOLD = 75;

interface WatchSessionAbuseRow {
  id: string;
  player_id: string;
  device_id: string | null;
  ip_address: string | null;
  status: string;
  ap_awarded: number | null;
  risk_score: number;
  is_anomalous: boolean;
}

interface AbuseFlagInsert {
  player_id: string;
  flag_type: 'DEVICE_MULTI_ACCOUNT' | 'IP_CLUSTER' | 'BOT_PATTERN';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  details: Json;
  status: 'OPEN' | 'CLAWED_BACK';
  clawback_amount?: number;
}

// รันทุกวัน 03:00 Asia/Bangkok — วิเคราะห์ watch_sessions ย้อนหลัง 24 ชม.
// เพื่อจับ device ใช้หลายบัญชี, IP รวมกลุ่มผิดปกติ, และ session ที่ความเสี่ยงสูง (bot pattern)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createAdminClient();
  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

  const { data: sessionsData, error: sessionsError } = await adminSupabase
    .from('watch_sessions')
    .select('id, player_id, device_id, ip_address, status, ap_awarded, risk_score, is_anomalous')
    .gte('created_at', since);

  if (sessionsError) {
    console.error(`[abuse-analysis] ${now.toISOString()} fetch failed: ${sessionsError.message}`);
    return NextResponse.json({ error: `Fetch failed: ${sessionsError.message}` }, { status: 500 });
  }

  const sessions = (sessionsData ?? []) as WatchSessionAbuseRow[];
  const flagsToInsert: AbuseFlagInsert[] = [];

  // 1) Device multi-account — 1 device_id มีหลาย player_id ใน 24 ชม.
  const deviceToPlayers = new Map<string, Set<string>>();
  for (const s of sessions) {
    if (!s.device_id) continue;
    const set = deviceToPlayers.get(s.device_id) ?? new Set<string>();
    set.add(s.player_id);
    deviceToPlayers.set(s.device_id, set);
  }

  for (const [device_id, players] of deviceToPlayers.entries()) {
    if (players.size > 1) {
      for (const player_id of players) {
        flagsToInsert.push({
          player_id,
          flag_type: 'DEVICE_MULTI_ACCOUNT',
          severity: players.size >= 5 ? 'HIGH' : 'MEDIUM',
          details: {
            device_id,
            shared_with_count: players.size,
            player_ids: Array.from(players),
          } as unknown as Json,
          status: 'OPEN',
        });
      }
    }
  }

  // 2) IP cluster — 1 IP มี player_id เกิน IP_CLUSTER_THRESHOLD
  const ipToPlayers = new Map<string, Set<string>>();
  for (const s of sessions) {
    if (!s.ip_address) continue;
    const set = ipToPlayers.get(s.ip_address) ?? new Set<string>();
    set.add(s.player_id);
    ipToPlayers.set(s.ip_address, set);
  }

  for (const [ip_address, players] of ipToPlayers.entries()) {
    if (players.size >= IP_CLUSTER_THRESHOLD) {
      for (const player_id of players) {
        flagsToInsert.push({
          player_id,
          flag_type: 'IP_CLUSTER',
          severity: players.size >= 10 ? 'HIGH' : 'MEDIUM',
          details: {
            ip_address,
            cluster_size: players.size,
          } as unknown as Json,
          status: 'OPEN',
        });
      }
    }
  }

  // 3) Bot pattern — session เสี่ยงสูงที่รับ AP ไปแล้ว ต้อง clawback
  const botSessions = sessions.filter((s) => s.is_anomalous && s.risk_score >= BOT_RISK_SCORE_THRESHOLD);
  let clawbackCount = 0;
  let clawbackTotal = 0;

  for (const s of botSessions) {
    const canClawback = s.status === 'CLAIMED' && (s.ap_awarded ?? 0) > 0;

    if (!canClawback) {
      flagsToInsert.push({
        player_id: s.player_id,
        flag_type: 'BOT_PATTERN',
        severity: 'HIGH',
        details: { session_id: s.id, risk_score: s.risk_score } as unknown as Json,
        status: 'OPEN',
      });
      continue;
    }

    const clawbackAmount = s.ap_awarded as number;
    const { data: moveResult, error: moveError } = await adminSupabase.rpc('move_ap', {
      p_player_id: s.player_id,
      p_amount: -clawbackAmount,
      p_reason: 'CLAWBACK',
      p_idempotency_key: `clawback-session-${s.id}`,
    });

    if (moveError) {
      console.error(`[abuse-analysis] ${now.toISOString()} move_ap failed for session ${s.id}: ${moveError.message}`);
      flagsToInsert.push({
        player_id: s.player_id,
        flag_type: 'BOT_PATTERN',
        severity: 'HIGH',
        details: {
          session_id: s.id,
          risk_score: s.risk_score,
          clawback_error: moveError.message,
        } as unknown as Json,
        status: 'OPEN',
      });
      continue;
    }

    const result = moveResult as unknown as MoveApResult;
    const wasClawedBack = result?.success || result?.error === 'DUPLICATE_KEY';

    if (wasClawedBack) {
      clawbackCount += 1;
      clawbackTotal += clawbackAmount;
    }

    flagsToInsert.push({
      player_id: s.player_id,
      flag_type: 'BOT_PATTERN',
      severity: 'HIGH',
      details: {
        session_id: s.id,
        risk_score: s.risk_score,
        move_ap_result: result as unknown as Json,
      } as unknown as Json,
      status: wasClawedBack ? 'CLAWED_BACK' : 'OPEN',
      clawback_amount: wasClawedBack ? clawbackAmount : undefined,
    });
  }

  if (flagsToInsert.length > 0) {
    const { error: insertError } = await adminSupabase.from('abuse_flags').insert(flagsToInsert);
    if (insertError) {
      console.error(`[abuse-analysis] ${now.toISOString()} insert abuse_flags failed: ${insertError.message}`);
      return NextResponse.json({ error: `Insert abuse_flags failed: ${insertError.message}` }, { status: 500 });
    }
  }

  console.log(
    `[abuse-analysis] ${now.toISOString()} sessions_scanned=${sessions.length} flags_created=${flagsToInsert.length} clawbacks=${clawbackCount} (${clawbackTotal} AP)`
  );

  return NextResponse.json({
    success: true,
    sessions_scanned: sessions.length,
    flags_created: flagsToInsert.length,
    clawbacks: clawbackCount,
    clawback_total_ap: clawbackTotal,
  });
}