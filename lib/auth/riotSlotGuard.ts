// Riot RSO/Game API login (spec T4.1) is on hold — athlete identity is verified
// through the Manual Athlete Verification flow (T4.0, GameAccountModal.tsx) instead.
// The legacy Riot OAuth routes (app/auth/riot, app/auth/callback/riot) stay in the
// codebase for when T4.1 resumes, but must not be reachable until then. Both routes
// call requireRiotLoginDisabled's counterpart below — flip RIOT_LOGIN_ENABLED=true
// only once Riot RSO is actually approved and ready to re-enable.
export const RIOT_LOGIN_ENABLED = process.env.RIOT_LOGIN_ENABLED === 'true';

export function isRiotLoginEnabled(): boolean {
  return RIOT_LOGIN_ENABLED;
}

export const RIOT_LOGIN_DISABLED_MESSAGE =
  'เข้าสู่ระบบผ่าน Riot ID ปิดใช้งานชั่วคราว กรุณายืนยันตัวตนนักกีฬาผ่านหน้าโปรไฟล์แทน';
