// lib/overlay/match-game-rows.ts
// จัดการแถว match_games ของเกมที่ "กำลังเล่น" กับ "จบแล้ว" ให้ใช้แถวเดียวกัน
// - ensureLiveGameRow: สร้างแถวสถานะ LIVE ตอนล็อกรายชื่อก่อนเริ่มแมพ (match_participants ต้องอ้างอิง match_game_id)
// - saveFinishedGame: ตอน END MAP ถ้ามีแถว LIVE ของเกมนั้นอยู่แล้วให้อัปเดตแถวเดิม แทนการ insert ซ้ำจนชน unique
// แถวที่ยังไม่ COMPLETED ไม่ถูกนับในสกอร์ซีรีส์ (isGameDone) จึงสร้างล่วงหน้าได้โดยไม่กระทบผลซีรีส์
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { isGameDone, type OverlayGame } from '@/components/overlay/series';
import { asInsert, asUpdate } from '@/types/supabase-helpers';

type Db = SupabaseClient<Database>;
type GameRow = Database['public']['Tables']['match_games']['Row'];
type GameInsert = Omit<Database['public']['Tables']['match_games']['Insert'], 'match_id'>;
type DbError = { code?: string; message: string };

// สถานะ "กำลังเล่น" ที่ check constraint match_games_status_check ยอมรับ (IN_PROGRESS / PENDING ไม่ผ่าน)
export const LIVE_GAME_STATUS = 'LIVE';

export async function ensureLiveGameRow(
  db: Db,
  matchId: string,
  gameNumber: number,
  mapName: string | null
): Promise<{ id: string } | { error: DbError }> {
  const findExisting = () =>
    db.from('match_games').select('id').eq('match_id', matchId).eq('game_number', gameNumber).maybeSingle();

  const { data: existing, error: selErr } = await findExisting();
  if (selErr) return { error: selErr };
  if (existing) return { id: existing.id };

  const { data: created, error: insErr } = await db
    .from('match_games')
    .insert(
      asInsert<'match_games'>({
        match_id: matchId,
        game_number: gameNumber,
        map_name: mapName,
        status: LIVE_GAME_STATUS,
        started_at: new Date().toISOString(),
      })
    )
    .select('id')
    .single();

  if (insErr) {
    // กดล็อกพร้อมกันสองเครื่อง — อีกเครื่องสร้างแถวไปแล้ว ใช้แถวนั้นต่อ
    if (insErr.code === '23505') {
      const { data: raced } = await findExisting();
      if (raced) return { id: raced.id };
    }
    return { error: insErr };
  }
  return { id: created.id };
}

export async function saveFinishedGame(
  db: Db,
  matchId: string,
  game: GameInsert & { game_number: number }
): Promise<{ data: GameRow | null; error: DbError | null }> {
  const { data: existing, error: selErr } = await db
    .from('match_games')
    .select('id, status')
    .eq('match_id', matchId)
    .eq('game_number', game.game_number)
    .maybeSingle();
  if (selErr) return { data: null, error: selErr };

  if (!existing) {
    const { data, error } = await db
      .from('match_games')
      .insert(asInsert<'match_games'>({ match_id: matchId, ...game }))
      .select()
      .single();
    return { data, error };
  }

  // จบไปแล้ว — คงพฤติกรรมเดิม (23505 = GAME_ALREADY_REPORTED)
  if (isGameDone(existing as unknown as OverlayGame)) {
    return { data: null, error: { code: '23505', message: 'game already reported' } };
  }

  const { data, error } = await db
    .from('match_games')
    .update(asUpdate<'match_games'>(game))
    .eq('id', existing.id)
    .select()
    .single();
  return { data, error };
}
