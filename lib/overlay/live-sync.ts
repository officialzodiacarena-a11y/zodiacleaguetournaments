// lib/overlay/live-sync.ts
// ตัวช่วยให้จอถ่ายทอดตามสกอร์รอบและแถวเกมจากตัวตรวจทุก 5 วินาที — ฟังก์ชันล้วน ไม่แตะ React / เครือข่าย

export interface RoundScore {
  a: number;
  b: number;
}

export interface GameKeyRow {
  id: string;
  status: string | null;
  updated_at: string | null;
}

// ทีมที่ได้รอบเพิ่มเพียงฝั่งเดียว = "A" / "B" · อื่น ๆ ทั้งหมด (prev ว่าง · เท่าเดิม · ลดลง · ขึ้นสองฝั่ง · รีเซ็ต) = null
export function detectRoundWin(prev: RoundScore | null, next: RoundScore): "A" | "B" | null {
  if (!prev) return null;
  if (next.a > prev.a && next.b === prev.b) return "A";
  if (next.b > prev.b && next.a === prev.a) return "B";
  return null;
}

// ลายนิ้วมือของแถวเกม: เรียงตาม id แล้วต่อ id:status:updated_at — ลำดับแถวขาเข้าไม่มีผล · ไม่มีแถว = ข้อความว่าง
export function gamesFingerprint(rows: GameKeyRow[] | null | undefined): string {
  if (!rows || rows.length === 0) return "";
  return [...rows]
    .sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
    .map((r) => `${r.id}:${r.status ?? ""}:${r.updated_at ?? ""}`)
    .join("|");
}
