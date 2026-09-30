export const REGISTRATION_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'กรุณาเข้าสู่ระบบก่อน',
  PLAYER_NOT_FOUND: 'ไม่พบโปรไฟล์นักกีฬาของคุณ',
  TEAM_NOT_FOUND: 'ไม่พบทีมนี้',
  FORBIDDEN: 'เฉพาะ Captain เท่านั้นที่สมัครแข่งขันแทนทีมได้',
  TOURNAMENT_NOT_FOUND: 'ไม่พบทัวร์นาเมนต์นี้',
  REGISTRATION_CLOSED: 'ทัวร์นาเมนต์นี้ปิดรับสมัครแล้ว',
  REGISTRATION_NOT_OPEN: 'ยังไม่เปิดรับสมัคร',
  ALREADY_REGISTERED: 'ทีมนี้สมัครทัวร์นาเมนต์นี้ไปแล้ว',
  TOURNAMENT_FULL: 'ทีมเต็มแล้ว',
  INSUFFICIENT_AP: 'AP ไม่พอสำหรับค่าสมัคร',
  REGISTRATION_FAILED: 'สมัครไม่สำเร็จ กรุณาลองใหม่',
};

export function registrationErrorMessage(code?: string): string {
  if (!code) return REGISTRATION_ERROR_MESSAGES.REGISTRATION_FAILED;
  return REGISTRATION_ERROR_MESSAGES[code] ?? REGISTRATION_ERROR_MESSAGES.REGISTRATION_FAILED;
}
