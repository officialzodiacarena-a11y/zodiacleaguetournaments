import { z } from 'zod';

export const PREDICTION_POOL_STATUSES = ['OPEN', 'LOCKED', 'SETTLED', 'SETTLEMENT_ERROR', 'VOIDED', 'JACKPOT_CARRIED'] as const;
export type PredictionPoolStatus = (typeof PREDICTION_POOL_STATUSES)[number];

export const PREDICTION_TICKET_TIERS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as const;
export type PredictionTicketTier = (typeof PREDICTION_TICKET_TIERS)[number];

export const BuyTicketSchema = z.object({
  pool_id: z.string().uuid(),
  predicted_team_id: z.string().uuid(),
  tier: z.enum(PREDICTION_TICKET_TIERS).default('BRONZE'),
  ap_amount: z.number().int().positive(),
  idempotency_key: z.string().min(10),
});
export type BuyTicketInput = z.infer<typeof BuyTicketSchema>;

export const SettlePoolSchema = z.object({
  winning_team_id: z.string().uuid(),
});
export type SettlePoolInput = z.infer<typeof SettlePoolSchema>;

export const VoidMatchSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
export type VoidMatchInput = z.infer<typeof VoidMatchSchema>;

export interface PublicPredictionPoolRow {
  pool_id: string;
  match_id: string;
  house_fee_percent: number;
  total_ap_pool_a: number;
  total_ap_pool_b: number;
  bonus_pool_ap: number;
  status: PredictionPoolStatus;
}
