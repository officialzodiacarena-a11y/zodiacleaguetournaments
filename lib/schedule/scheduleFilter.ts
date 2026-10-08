// lib/schedule/scheduleFilter.ts
// ตัวกรองหน้า /schedule (ทั้งหมด · LIVE · วันนี้ · ที่ผ่านมา) และข้อความเกมปัจจุบันของแมตช์ LIVE
// ฟังก์ชันล้วน ไม่แตะฐานข้อมูล · วันนี้อิงเขตเวลาไทย (Asia/Bangkok)

export type ScheduleFilter = 'all' | 'live' | 'today' | 'past';

export const SCHEDULE_FILTERS: readonly { key: ScheduleFilter; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'live', label: 'LIVE' },
  { key: 'today', label: 'วันนี้' },
  { key: 'past', label: 'ที่ผ่านมา' },
];

export function parseScheduleFilter(raw: string | string[] | undefined): ScheduleFilter {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === 'live' || v === 'today' || v === 'past' ? v : 'all';
}

export function scheduleFilterHref(f: ScheduleFilter): string {
  return f === 'all' ? '/schedule' : `/schedule?f=${f}`;
}

export interface FilterableMatch {
  status: 'LIVE' | 'UPCOMING' | 'COMPLETED' | 'DISPUTED';
  scheduledAt?: string | null;
}

const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

function bangkokDayKey(d: Date): string {
  return new Date(d.getTime() + BKK_OFFSET_MS).toISOString().slice(0, 10);
}

export function filterScheduleMatches<T extends FilterableMatch>(matches: T[], filter: ScheduleFilter, now: Date): T[] {
  if (filter === 'all') return matches;
  if (filter === 'live') return matches.filter((m) => m.status === 'LIVE');
  if (filter === 'today') {
    const today = bangkokDayKey(now);
    return matches.filter((m) => m.scheduledAt && bangkokDayKey(new Date(m.scheduledAt)) === today);
  }
  // past: แข่งจบแล้ว (COMPLETED) เท่านั้น เรียงล่าสุดก่อน
  return matches
    .filter((m) => m.status === 'COMPLETED')
    .sort((a, b) => new Date(b.scheduledAt ?? 0).getTime() - new Date(a.scheduledAt ?? 0).getTime());
}

export interface GameRow {
  game_number: number;
  map_name: string | null;
  status: string;
}

/** "Map 2/3 · Haven" จากเกมที่กำลัง LIVE (ไม่มี LIVE ใช้เกมล่าสุดที่เริ่มแล้ว) · ไม่มีข้อมูล = undefined (ไม่แสดงของปลอม) */
export function liveMapLabel(games: GameRow[], bestOf: number): string | undefined {
  const live = games.find((g) => g.status === 'LIVE');
  const g = live ?? [...games].reverse().find((x) => x.status === 'COMPLETED');
  if (!g) return undefined;
  const name = g.map_name?.trim();
  return `Map ${g.game_number}/${bestOf}${name ? ` · ${name}` : ''}`;
}
