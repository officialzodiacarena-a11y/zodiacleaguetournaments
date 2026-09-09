import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAccessGate } from '@/lib/billing/checkAccessGate';
import { SUBSCRIBER_TYPES, type PhaseApiFeature, type SubscriberType } from '@/types/subscriptions';

const FEATURES: PhaseApiFeature[] = ['ANALYTICS', 'VIP_PERK'];

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subscriberId = searchParams.get('subscriber_id');
    const subscriberType = searchParams.get('subscriber_type') as SubscriberType | null;
    const feature = searchParams.get('feature') as PhaseApiFeature | null;

    if (!subscriberId || !subscriberType || !SUBSCRIBER_TYPES.includes(subscriberType)) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'ต้องระบุ subscriber_id และ subscriber_type (TEAM|PLAYER)' } }, { status: 400 });
    }

    if (!feature || !FEATURES.includes(feature)) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'ต้องระบุ feature (ANALYTICS|VIP_PERK)' } }, { status: 400 });
    }

    const result = await checkAccessGate(subscriberType, subscriberId, feature);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
