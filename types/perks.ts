import { z } from 'zod';

export const GenerateQrSchema = z.object({
  perk_id: z.string().uuid(),
  redeemed_by_player_id: z.string().uuid(),
  redeem_amount: z.number().positive(),
});
export type GenerateQrInput = z.infer<typeof GenerateQrSchema>;

export const RedeemPerkSchema = z.object({
  perk_token: z.string().min(10),
  redeemed_amount: z.number().positive(),
});
export type RedeemPerkInput = z.infer<typeof RedeemPerkSchema>;

export interface SponsorPerkRecord {
  id: string;
  team_id: string;
  subscription_id: string;
  perk_type: 'HEALTH_WELLNESS_CHECK';
  max_quota_amount: number;
  amount_used: number;
  valid_until: string;
  is_active: boolean;
}
