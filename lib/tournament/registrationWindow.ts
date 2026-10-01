// lib/tournament/registrationWindow.ts
// เช็คว่าเลยเวลาปิดรับสมัคร (tournaments.registration_closes_at) แล้วหรือยัง — ใช้เวลา server เสมอ
// ไม่มีค่า (null/ว่าง) = ไม่จำกัดเวลา · ถึงเวลาพอดี (now >= closes_at) ถือว่าปิดแล้ว
export function isRegistrationClosed(
  closesAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!closesAt) return false;
  const closesMs = Date.parse(closesAt);
  if (Number.isNaN(closesMs)) return false;
  return now.getTime() >= closesMs;
}
