// lib/tournament/registrationSteps.ts
// สถานะของแถบขั้นตอนการสมัคร 3 ขั้น (ฟังก์ชันล้วน ไม่แตะ React ฐานข้อมูล และเครือข่าย)
//   1 เลือกทีม → 2 ตรวจสอบ Roster (หน้า /register) → 3 ชำระและยืนยัน (หน้า /pay: ชื่อบัญชีผู้โอน + แนบสลิป)
// ใช้ร่วมกันทั้งสองหน้า เพื่อให้แถบขั้นตอนตรงกับสถานะจริงของการสมัคร

export type StepState = 'DONE' | 'ACTIVE' | 'LOCKED';
export type StepStates = [StepState, StepState, StepState];

export interface RegistrationStepDef {
  id: 'team' | 'roster' | 'pay';
  th: string;
  en: string;
}

export const REGISTRATION_STEPS: readonly [RegistrationStepDef, RegistrationStepDef, RegistrationStepDef] = [
  { id: 'team', th: 'เลือกทีม', en: 'SELECT TEAM' },
  { id: 'roster', th: 'ตรวจสอบ Roster', en: 'VERIFY ROSTER' },
  { id: 'pay', th: 'ชำระและยืนยัน', en: 'PAY & CONFIRM' },
];

const CLOSED_REGISTRATION = ['REJECTED', 'CANCELLED'];

/**
 * @param registrationStatus สถานะแถว tournament_registrations (null = ยังไม่ได้สมัคร)
 * @param paymentStatus สถานะแถว tournament_entry_payments ถ้ามี (หน้า /pay ส่งมา)
 */
export function registrationStepStates(
  registrationStatus: string | null | undefined,
  paymentStatus?: string | null,
): StepStates {
  if (!registrationStatus) return ['DONE', 'ACTIVE', 'LOCKED'];

  // ยกเลิก/ถูกปฏิเสธ: ผ่านขั้น 1–2 มาแล้วแต่ขั้นชำระปิดแล้ว
  if (paymentStatus === 'REJECTED' || CLOSED_REGISTRATION.includes(registrationStatus)) {
    return ['DONE', 'DONE', 'LOCKED'];
  }
  if (paymentStatus === 'APPROVED') return ['DONE', 'DONE', 'DONE'];

  // สมัครแล้วแต่ยังไม่ชำระครบ (รอโอน · ส่งสลิปแล้วรอแอดมินตรวจ)
  if (registrationStatus === 'AWAITING_PAYMENT') return ['DONE', 'DONE', 'ACTIVE'];

  // สถานะอื่นหลังชำระ/สมัครสำเร็จ (ไม่มีค่าสมัคร หรือชำระแล้ว)
  return ['DONE', 'DONE', 'DONE'];
}
