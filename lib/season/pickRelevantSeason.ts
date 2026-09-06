export interface SeasonLike {
  id: string;
  circuit_id: string;
  name: string;
  status: 'UPCOMING' | 'ACTIVE' | 'CONCLUDED';
  starts_at: string;
  ends_at: string;
}

// เลือก season ที่ "เกี่ยวข้องที่สุด" ของ circuit หนึ่ง: ACTIVE ก่อน, ไม่มีก็เอา UPCOMING ที่ใกล้สุด,
// ไม่มีอีกก็เอา CONCLUDED ล่าสุด
export function pickRelevantSeason<T extends SeasonLike>(list: T[] | undefined): T | null {
  if (!list || list.length === 0) return null;

  const active = list.find((s) => s.status === 'ACTIVE');
  if (active) return active;

  const upcoming = [...list]
    .filter((s) => s.status === 'UPCOMING')
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];
  if (upcoming) return upcoming;

  const concluded = [...list]
    .filter((s) => s.status === 'CONCLUDED')
    .sort((a, b) => new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime())[0];
  return concluded ?? null;
}
