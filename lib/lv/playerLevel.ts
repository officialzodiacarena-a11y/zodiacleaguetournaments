// lib/lv/playerLevel.ts
// อ่านเลเวล/EXP ผู้เล่นจาก view public.player_lv_current (อ่านอย่างเดียว · ไม่เขียนฐานข้อมูล)
// ผู้เล่นที่ยังไม่มีแถว = เลเวล 1 EXP 0 (view จัดการให้แล้ว) · เลเวลไม่ลด · EXP ในถังลดได้ต่ำสุด 0
import type { createClient } from '@/lib/supabase/client';

export type LvSupabase = ReturnType<typeof createClient>;

export interface PlayerLevel {
  playerId: string;
  seasonYear: number;
  rankOrder: number; // 1-8
  rankCode: string; // F E D C B A S L
  expInRank: number;
  expBucket: number;
}

export interface RankedPlayer extends PlayerLevel {
  displayName: string;
  avatarUrl: string | null;
}

export const MAX_RANK_ORDER = 8;

interface LvRow {
  player_id: string | null;
  season_year: number | null;
  rank_order: number | null;
  rank_code: string | null;
  exp_in_rank: number | null;
  exp_bucket: number | null;
}

function toLevel(r: LvRow): PlayerLevel | null {
  if (!r.player_id || r.rank_order == null || !r.rank_code || r.exp_bucket == null) return null;
  return {
    playerId: r.player_id,
    seasonYear: r.season_year ?? new Date().getFullYear(),
    rankOrder: r.rank_order,
    rankCode: r.rank_code,
    expInRank: r.exp_in_rank ?? 0,
    expBucket: r.exp_bucket,
  };
}

/** สัดส่วนหลอด EXP 0-100 · ถังเป็น 0/ไม่มีค่า = 0 */
export function expPercent(expInRank: number, expBucket: number): number {
  if (!expBucket || expBucket <= 0) return 0;
  return Math.max(0, Math.min(100, (expInRank / expBucket) * 100));
}

/** เลเวล 8 และ EXP เต็มถัง = MAX */
export function isMaxed(level: Pick<PlayerLevel, 'rankOrder' | 'expInRank' | 'expBucket'>): boolean {
  return level.rankOrder >= MAX_RANK_ORDER && level.expInRank >= level.expBucket;
}

export async function fetchPlayerLevel(client: LvSupabase, playerId: string): Promise<PlayerLevel | null> {
  const { data, error } = await client
    .from('player_lv_current')
    .select('player_id, season_year, rank_order, rank_code, exp_in_rank, exp_bucket')
    .eq('player_id', playerId)
    .maybeSingle();
  if (error || !data) return null;
  return toLevel(data as LvRow);
}

export interface LevelPage {
  rows: RankedPlayer[];
  total: number;
}

/**
 * อันดับตามเลเวลแล้ว EXP: rank_order DESC, exp_in_rank DESC
 * ลำดับรอง (คะแนนเท่ากัน เช่น ทุกคนเลเวล 1 EXP 0): player_id ASC — คงที่ทุกครั้งที่โหลด แต่เป็นลำดับตามรหัส ไม่มีความหมายเชิงผลงาน
 */
export async function fetchLevelLeaderboard(client: LvSupabase, page: number, pageSize: number): Promise<LevelPage> {
  const from = Math.max(0, page) * pageSize;
  const { data, error, count } = await client
    .from('player_lv_current')
    .select('player_id, season_year, rank_order, rank_code, exp_in_rank, exp_bucket', { count: 'exact' })
    .order('rank_order', { ascending: false })
    .order('exp_in_rank', { ascending: false })
    .order('player_id', { ascending: true })
    .range(from, from + pageSize - 1);
  if (error || !data) return { rows: [], total: 0 };

  const levels = (data as LvRow[]).map(toLevel).filter((l): l is PlayerLevel => l !== null);
  const ids = levels.map((l) => l.playerId);
  const names = new Map<string, { display_name: string; avatar_url: string | null }>();
  if (ids.length > 0) {
    const { data: players } = await client.from('players').select('id, display_name, avatar_url').in('id', ids);
    for (const p of (players ?? []) as { id: string; display_name: string; avatar_url: string | null }[]) {
      names.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
    }
  }

  return {
    rows: levels.map((l) => ({
      ...l,
      displayName: names.get(l.playerId)?.display_name ?? 'ATHLETE',
      avatarUrl: names.get(l.playerId)?.avatar_url ?? null,
    })),
    total: count ?? levels.length,
  };
}
