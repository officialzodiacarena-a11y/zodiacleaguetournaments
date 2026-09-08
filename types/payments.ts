import { z } from 'zod';

export const FiatMethodEnum = z.enum(['PROMPTPAY', 'CREDIT_CARD', 'BANK_TRANSFER', 'TRUE_MONEY']);

export const CreateFiatIntentSchema = z
  .object({
    purpose: z.enum(['TOP_UP', 'ORDER']),
    method: FiatMethodEnum,
    orderId: z.string().uuid().optional(),
    amountThb: z.number().positive().optional(),
    apAmount: z.number().int().positive().optional(),
    omiseToken: z.string().optional(),
  })
  .refine((data) => data.purpose !== 'ORDER' || !!data.orderId, {
    message: 'orderId จำเป็นเมื่อ purpose = ORDER',
    path: ['orderId'],
  })
  .refine((data) => data.purpose !== 'TOP_UP' || (!!data.amountThb && !!data.apAmount), {
    message: 'amountThb และ apAmount จำเป็นเมื่อ purpose = TOP_UP',
    path: ['apAmount'],
  });

export const CreateCryptoIntentSchema = z
  .object({
    purpose: z.enum(['TOP_UP', 'ORDER']),
    orderId: z.string().uuid().optional(),
    tokenSymbol: z.string().min(2).max(10),
    apAmount: z.number().int().positive().optional(),
    amountThb: z.number().positive().optional(),
  })
  .refine((data) => data.purpose !== 'ORDER' || !!data.orderId, {
    message: 'orderId จำเป็นเมื่อ purpose = ORDER',
    path: ['orderId'],
  })
  .refine((data) => data.purpose !== 'TOP_UP' || (!!data.amountThb && !!data.apAmount), {
    message: 'amountThb และ apAmount จำเป็นเมื่อ purpose = TOP_UP',
    path: ['apAmount'],
  });

export const CreatePrizePayoutSchema = z
  .object({
    playerId: z.string().uuid(),
    gross: z.number().int().nonnegative(),
    taxWithheld: z.number().int().nonnegative().default(0),
  })
  .refine((data) => data.taxWithheld <= data.gross, {
    message: 'taxWithheld ต้องไม่มากกว่า gross',
    path: ['taxWithheld'],
  });

export const ApprovePrizePayoutSchema = z.object({
  status: z.enum(['APPROVED', 'PROCESSING', 'PAID']),
});

export const CreateRefundSchema = z.object({
  paymentIntentId: z.string().uuid(),
  reason: z.string().min(5),
});

export const CryptoWebhookSchema = z.object({
  paymentIntentId: z.string().uuid(),
  txHash: z.string().min(10).optional(),
  blockNumber: z.number().int().positive().optional(),
  confirmations: z.number().int().nonnegative().optional(),
  isReverted: z.boolean().optional(),
});

export type CreateFiatIntentInput = z.infer<typeof CreateFiatIntentSchema>;
export type CreateCryptoIntentInput = z.infer<typeof CreateCryptoIntentSchema>;
export type CreatePrizePayoutInput = z.infer<typeof CreatePrizePayoutSchema>;
export type ApprovePrizePayoutInput = z.infer<typeof ApprovePrizePayoutSchema>;
export type CreateRefundInput = z.infer<typeof CreateRefundSchema>;
export type CryptoWebhookInput = z.infer<typeof CryptoWebhookSchema>;

export interface SettlePaymentIntentResult {
  success: boolean;
  error?: string;
  already_settled?: boolean;
  purpose?: string;
}

const PRIZE_PAYOUT_TRANSITIONS: Record<string, string> = {
  PENDING: 'APPROVED',
  APPROVED: 'PROCESSING',
  PROCESSING: 'PAID',
};

export function isValidPrizePayoutTransition(currentStatus: string, nextStatus: string): boolean {
  return PRIZE_PAYOUT_TRANSITIONS[currentStatus] === nextStatus;
}
