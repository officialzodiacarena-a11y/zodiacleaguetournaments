import { z } from 'zod';

export const ESCROW_STATUSES = ['PENDING', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'AUTO_RELEASED', 'CANCELLED_BANNED'] as const;
export type EscrowStatus = (typeof ESCROW_STATUSES)[number];

export const VerifyOtpSchema = z.object({
  otp_code: z.string().trim().length(6),
});
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

export const InitiateTransferSchema = z.object({
  receiver_id: z.string().uuid(),
  amount_ap: z.number().int().positive(),
  transfer_token: z.string().min(10),
  idempotency_key: z.string().min(10),
});
export type InitiateTransferInput = z.infer<typeof InitiateTransferSchema>;

export const DisputeEscrowSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
export type DisputeEscrowInput = z.infer<typeof DisputeEscrowSchema>;

export interface EscrowRecord {
  escrow_id: string;
  sender_id: string;
  receiver_id: string;
  amount_ap: number;
  status: EscrowStatus;
  approval_deadline: string;
  auto_released_at: string | null;
}
