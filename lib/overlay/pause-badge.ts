// lib/overlay/pause-badge.ts
// ข้อความป้ายหยุด (Time out) บนจอถ่ายทอด — ฟังก์ชันล้วน ไม่แตะ React / เครือข่าย

export interface OverlayTimeout {
  type: "TACTICAL" | "TECHNICAL";
  team: "A" | "B" | null;
  reason: string | null;
  started_at: string;
  ends_at: string | null;
}

export interface PauseBadgeInput {
  status: string | null;
  // true เมื่อได้คำตอบข้อมูล Time out ของการหยุดครั้งนี้แล้ว (GET /timeout ตอบ หรือได้ timeout จากสัญญาณ)
  loaded: boolean;
  info: OverlayTimeout | null;
  nowMs: number;
  teamAName?: string;
  teamBName?: string;
}

// ไม่ใช่ PAUSED / ยังไม่ได้คำตอบ / Tactical ครบเวลา = null · Tactical ที่เหลือเวลา = ชื่อทีม + วินาที · อื่น ๆ = TECHNICAL PAUSE
export function resolvePauseBadge({ status, loaded, info, nowMs, teamAName, teamBName }: PauseBadgeInput): string | null {
  if (status !== "PAUSED") return null;
  if (!loaded) return null;
  if (info?.type === "TACTICAL" && info.ends_at) {
    const left = Math.ceil((new Date(info.ends_at).getTime() - nowMs) / 1000);
    if (left <= 0) return null;
    const name = (info.team === "B" ? teamBName : teamAName) ?? (info.team === "B" ? "B" : "A");
    return `TACTICAL TIMEOUT · ${name} · ${String(left).padStart(2, "0")}`;
  }
  return "TECHNICAL PAUSE";
}
