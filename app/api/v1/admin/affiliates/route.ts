// app/api/v1/admin/affiliates/route.ts
//
// หมายเหตุ: SPEC-QUEST-AFFILIATE-V6.0202 (DIA-002) ระบุ endpoint นี้ไว้ในรายการสรุป REST
// endpoints เป็น "GET/PATCH" สำหรับโต๊ะมอนิเตอร์ Flagged Queue แต่ใน "Full Production Code"
// section ของสเปคไม่มีโค้ดตัวอย่างให้เลยทั้ง GET และ PATCH — เขียน GET (อ่านอย่างเดียว, ปลอดภัย)
// ให้ตามแพทเทิร์นเดียวกับ /api/v1/admin/verifications/route.ts ที่มีอยู่แล้ว ส่วน PATCH
// (เปลี่ยนสถานะ FLAGGED -> ACTIVE/BLOCKED) ยังไม่ implement เพราะเป็นการตัดสินใจระดับ
// product/fraud-policy (เช่น จะ claw back AP ที่จ่ายไปแล้วหรือไม่ตอน BLOCK) ต้องให้อลิส
// (QA/CTO) กำหนดสโคปที่ชัดเจนก่อนตาม AGENTS.md ข้อ "ไม่แน่ใจอะไร → ถามอลิสก่อน ไม่ตัดสินใจเอง"

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const AFFILIATE_STATUS_VALUES = ['PENDING_KYC', 'ACTIVE', 'FLAGGED', 'BLOCKED'] as const;
type AffiliateStatus = (typeof AFFILIATE_STATUS_VALUES)[number];

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } },
      { status: 401 }
    ) };
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (playerError || !player) {
    return { error: NextResponse.json(
      { error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } },
      { status: 404 }
    ) };
  }

  const { data: userRole, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('player_id', player.id)
    .is('revoked_at', null)
    .single();

  const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
  if (roleError || !userRole || !allowedRoles.includes(userRole.role)) {
    return { error: NextResponse.json(
      { error: { code: 'FORBIDDEN_ROLE', message: 'บัญชีนี้ไม่มีสิทธิ์เข้าถึงคิวตรวจสอบ Affiliate' } },
      { status: 403 }
    ) };
  }

  return { player };
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const guard = await requireAdmin(supabase);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20') || 20));
    const statusParam = (searchParams.get('status') ?? 'FLAGGED').toUpperCase();
    const status = statusParam as AffiliateStatus;

    if (!AFFILIATE_STATUS_VALUES.includes(status)) {
      return NextResponse.json(
        { error: { code: 'INVALID_STATUS', message: `status ต้องเป็นหนึ่งใน ${AFFILIATE_STATUS_VALUES.join(', ')}` } },
        { status: 400 }
      );
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('affiliate_referrals')
      .select(
        'id, referrer_id, referee_id, affiliate_code, status, flag_reason, kyc_reward_claimed, device_id_hash, ip_address_hash, created_at, referrer:players!affiliate_referrals_referrer_id_fkey(athlete_id, display_name), referee:players!affiliate_referrals_referee_id_fkey(athlete_id, display_name)',
        { count: 'exact' }
      )
      .eq('status', status)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: error.message } }, { status: 500 });
    }

    type PlayerRef = { athlete_id: string; display_name: string } | { athlete_id: string; display_name: string }[] | null;

    const rows = (data ?? []).map((row) => {
      const { referrer, referee, ...rest } = row as typeof row & {
        referrer: PlayerRef;
        referee: PlayerRef;
      };
      const referrerInfo = Array.isArray(referrer) ? referrer[0] : referrer;
      const refereeInfo = Array.isArray(referee) ? referee[0] : referee;
      return {
        ...rest,
        referrer_athlete_id: referrerInfo?.athlete_id ?? null,
        referrer_display_name: referrerInfo?.display_name ?? null,
        referee_athlete_id: refereeInfo?.athlete_id ?? null,
        referee_display_name: refereeInfo?.display_name ?? null,
      };
    });

    const total = count ?? rows.length;

    return NextResponse.json({
      data: rows,
      meta: { total, page, limit, total_pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
