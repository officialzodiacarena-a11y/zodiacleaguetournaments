import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// รหัสห้องเกมเก็บในตาราง match_lobby_secrets (ไม่ใช่ matches.format_config ซึ่ง anon อ่านได้)
// ฟังก์ชันที่รับ admin client ต้องเรียกหลังตรวจสิทธิ์ผู้เรียกแล้วเท่านั้น

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_LOBBY_CODE_IDS = 50;

/** แยก `?ids=a,b,c` เป็น uuid ที่ถูกต้อง ตัดซ้ำ จำกัดจำนวน */
export function parseMatchIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => UUID_RE.test(s));
  return Array.from(new Set(ids)).slice(0, MAX_LOBBY_CODE_IDS);
}

export async function readLobbyCodes(
  admin: SupabaseClient<Database>,
  matchIds: string[]
): Promise<Record<string, string>> {
  if (matchIds.length === 0) return {};
  const { data, error } = await admin
    .from('match_lobby_secrets')
    .select('match_id, lobby_code')
    .in('match_id', matchIds);
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const row of data ?? []) out[row.match_id] = row.lobby_code;
  return out;
}

export async function saveLobbyCode(
  admin: SupabaseClient<Database>,
  matchId: string,
  lobbyCode: string,
  playerId: string
): Promise<{ error: string | null }> {
  const { error } = await admin
    .from('match_lobby_secrets')
    .upsert(
      { match_id: matchId, lobby_code: lobbyCode, updated_by: playerId, updated_at: new Date().toISOString() },
      { onConflict: 'match_id' }
    );
  return { error: error?.message ?? null };
}
