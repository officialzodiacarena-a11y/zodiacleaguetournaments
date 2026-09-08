import { z } from 'zod';

export const AwardZpPayloadSchema = z.object({
  teamId: z.string().uuid({ message: 'teamId ต้องเป็น UUID ที่ถูกต้อง' }),
  amount: z.number().int().refine((val) => val !== 0, { message: 'ยอดคะแนนห้ามเป็น 0' }),
  reason: z.enum(['PLACEMENT', 'PARTICIPATION', 'MATCH_WIN', 'BONUS', 'PENALTY', 'ADMIN_ADJUSTMENT']),
  placement: z.number().int().min(1).optional(),
  idempotencyKey: z.string().min(10, {
    message: 'คีย์ idempotencyKey สลักความปลอดภัยต้องยาวอย่างน้อย 10 ตัวอักษร',
  }),
});

export type AwardZpPayload = z.infer<typeof AwardZpPayloadSchema>;

export interface AwardZpRpcResult {
  success: boolean;
  error?: string;
  ledger_id?: number;
  amount_awarded?: number;
  multiplier?: number;
  balance_after?: number;
  current_balance?: number;
  requested?: number;
}

export interface ReconcileZpRow {
  team_id: string;
  ledger_sum: number;
  cached: number;
  diff: number;
}
