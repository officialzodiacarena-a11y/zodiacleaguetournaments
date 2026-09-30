export const AP_PER_THB = 2;
export const TOPUP_MIN_AP = 40; // = 20 บาท
export const TOPUP_MAX_AP = 20000; // = 10,000 บาท

export function computeTopupThb(
  apAmount: number
): { ok: true; amountThb: number } | { ok: false; code: 'TOPUP_AP_INVALID' } {
  if (!Number.isInteger(apAmount)) return { ok: false, code: 'TOPUP_AP_INVALID' };
  if (apAmount % 2 !== 0) return { ok: false, code: 'TOPUP_AP_INVALID' };
  if (apAmount < TOPUP_MIN_AP || apAmount > TOPUP_MAX_AP) return { ok: false, code: 'TOPUP_AP_INVALID' };

  return { ok: true, amountThb: apAmount / AP_PER_THB };
}
