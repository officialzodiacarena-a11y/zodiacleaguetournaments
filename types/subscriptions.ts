import { z } from 'zod';

export const PLAN_CODES = ['PRO_CLUB', 'VIP_CLUB', 'ATHLETE_PASS'] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const SUBSCRIBER_TYPES = ['TEAM', 'PLAYER'] as const;
export type SubscriberType = (typeof SUBSCRIBER_TYPES)[number];

export const SUBSCRIPTION_STATUSES = ['ACTIVE', 'GRACE_PERIOD', 'PAST_DUE', 'EXPIRED', 'CANCELLED'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const CheckoutSubscriptionSchema = z.object({
  plan_code: z.enum(PLAN_CODES),
  subscriber_type: z.enum(SUBSCRIBER_TYPES),
  subscriber_id: z.string().uuid(),
  idempotency_key: z.string().min(10),
});
export type CheckoutSubscriptionInput = z.infer<typeof CheckoutSubscriptionSchema>;

export const RenewSubscriptionSchema = z.object({
  subscription_id: z.string().uuid(),
  idempotency_key: z.string().min(10),
});
export type RenewSubscriptionInput = z.infer<typeof RenewSubscriptionSchema>;

export interface SubscriptionRecord {
  id: string;
  plan_code: PlanCode;
  current_status: SubscriptionStatus;
  valid_until: string;
  grace_until: string | null;
  auto_renew_with_ap: boolean;
  subscriber_type: SubscriberType;
  team_id: string | null;
  player_id: string | null;
}

export interface CheckAccessResult {
  has_access: boolean;
  plan_code: PlanCode | null;
  current_status: SubscriptionStatus | null;
  read_only: boolean;
}

export type PhaseApiFeature = 'ANALYTICS' | 'VIP_PERK';
