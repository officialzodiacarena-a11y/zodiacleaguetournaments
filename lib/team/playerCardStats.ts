// lib/team/playerCardStats.ts
// เลือกแถวสถิติผู้เล่นสำหรับการ์ดในหน้าทีม (ฟังก์ชันล้วน)
// ใช้สถิติสะสมทุกซีซัน (season_id = null) ก่อน ไม่มีค่อยใช้แถวที่อัปเดตล่าสุด

export interface PlayerStatRow {
  player_id: string;
  game_id: string;
  season_id: string | null;
  avg_kd: number | string | null;
  avg_adr: number | string | null;
  updated_at: string | null;
}

export interface CardStats {
  avgKd: number | null;
  avgAdr: number | null;
}

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function pickCardStats(rows: PlayerStatRow[], playerId: string, gameId: string): CardStats {
  const mine = rows.filter((r) => r.player_id === playerId && r.game_id === gameId);
  if (mine.length === 0) return { avgKd: null, avgAdr: null };
  const career = mine.find((r) => r.season_id === null);
  const row =
    career ??
    [...mine].sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime())[0];
  return { avgKd: num(row.avg_kd), avgAdr: num(row.avg_adr) };
}

export function formatKd(v: number | null): string {
  return v === null ? '—' : v.toFixed(2);
}

export function formatAdr(v: number | null): string {
  return v === null ? '—' : String(Math.round(v));
}

/** K/D ตั้งแต่ 2.00 ขึ้นไปใช้สีเขียวตามดีไซน์ */
export function isStrongKd(v: number | null): boolean {
  return v !== null && v >= 2;
}
