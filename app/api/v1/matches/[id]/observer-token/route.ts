import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireBroadcastRole } from '@/lib/auth/require-broadcast-role';
import { generateObserverToken, hashObserverToken, withObserverTokenHash } from '@/lib/overlay/observer-token';
import { asUpdate } from '@/types/supabase-helpers';

// ออก/หมุน Observer Bridge Token ของแมตช์นี้ — ใช้ครั้งเดียวตอนตั้งค่าเครื่องคนจับกล้อง
// คืน token ดิบให้ครั้งเดียวตอนนี้เท่านั้น (เหมือน API key ทั่วไป) เก็บแค่ hash ไว้ใน DB
// หมุนคีย์ใหม่ = token เก่าใช้ไม่ได้ทันที (เผื่อรั่วไหลหรือเปลี่ยนเครื่อง Observer)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: matchId } = await params;
    const supabase = await createClient();

    const auth = await requireBroadcastRole(supabase);
    if (!auth.ok) return auth.response;

    const admin = createAdminClient();
    const { data: match, error: findError } = await admin
      .from('matches')
      .select('id, format_config')
      .eq('id', matchId)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: findError.message } }, { status: 500 });
    }
    if (!match) {
      return NextResponse.json({ error: { code: 'MATCH_NOT_FOUND', message: 'ไม่พบข้อมูลแมตช์' } }, { status: 404 });
    }

    const token = generateObserverToken();
    const tokenHash = hashObserverToken(token);

    const { error: updateError } = await admin
      .from('matches')
      .update(asUpdate<'matches'>({
        format_config: withObserverTokenHash(match.format_config, tokenHash),
        updated_at: new Date().toISOString(),
      }))
      .eq('id', matchId);

    if (updateError) {
      return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: updateError.message } }, { status: 500 });
    }

    return NextResponse.json({ token, matchId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
