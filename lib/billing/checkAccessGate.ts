import { createClient } from '@/lib/supabase/server';
import type { CheckAccessResult, PhaseApiFeature, SubscriberType, PlanCode, SubscriptionStatus } from '@/types/subscriptions';

const ANALYTICS_ELIGIBLE_PLANS = ['PRO_CLUB', 'VIP_CLUB'];
const VIP_PERK_ELIGIBLE_PLANS = ['VIP_CLUB'];

/**
 * Server-side subscription access gate. Must be called fresh on every
 * Server Action / API Route that serves gated Pro data — never cached,
 * never trusted from a client-supplied flag. Reads the live subscriptions
 * row so a mid-session expiry is caught on the very next request (Case 8).
 */
export async function checkAccessGate(
  subscriberType: SubscriberType,
  subscriberId: string,
  feature: PhaseApiFeature
): Promise<CheckAccessResult> {
  const supabase = await createClient();

  const query = supabase
    .from('subscriptions')
    .select('plan_code, current_status')
    .eq('subscriber_type', subscriberType)
    .order('created_at', { ascending: false })
    .limit(1);

  const { data } = subscriberType === 'TEAM'
    ? await query.eq('team_id', subscriberId).maybeSingle()
    : await query.eq('player_id', subscriberId).maybeSingle();

  if (!data) {
    return { has_access: false, plan_code: null, current_status: null, read_only: false };
  }

  const planCode = data.plan_code as PlanCode;
  const currentStatus = data.current_status as SubscriptionStatus;

  const eligiblePlans = feature === 'ANALYTICS' ? ANALYTICS_ELIGIBLE_PLANS : VIP_PERK_ELIGIBLE_PLANS;
  const planEligible = eligiblePlans.includes(planCode);

  if (!planEligible) {
    return { has_access: false, plan_code: planCode, current_status: currentStatus, read_only: false };
  }

  if (currentStatus === 'ACTIVE') {
    return { has_access: true, plan_code: planCode, current_status: currentStatus, read_only: false };
  }

  if (currentStatus === 'GRACE_PERIOD') {
    // Grace Period: dashboard visible read-only; VIP perk generation is blocked
    // at the /perks/generate-qr route itself (Gate 4), not here.
    return { has_access: feature === 'ANALYTICS', plan_code: planCode, current_status: currentStatus, read_only: true };
  }

  // PAST_DUE / EXPIRED / CANCELLED
  return { has_access: false, plan_code: planCode, current_status: currentStatus, read_only: false };
}