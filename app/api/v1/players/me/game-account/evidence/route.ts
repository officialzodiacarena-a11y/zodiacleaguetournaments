import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SubmitEvidenceSchema } from '@/types/verification';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } },
        { status: 401 }
      );
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } },
        { status: 404 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } },
        { status: 400 }
      );
    }

    const parseResult = SubmitEvidenceSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด — ต้องแนบ evidence_url', details: parseResult.error.format() } },
        { status: 400 }
      );
    }
    const { evidence_url } = parseResult.data;

    const { data: gameAccount, error: fetchError } = await supabase
      .from('game_accounts')
      .select('id, verification_status')
      .eq('player_id', player.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (fetchError || !gameAccount) {
      return NextResponse.json(
        { error: { code: 'GAME_ACCOUNT_NOT_FOUND', message: 'ยังไม่มีการผูก Riot ID กรุณากรอกข้อมูลบัญชีก่อน' } },
        { status: 404 }
      );
    }

    if (gameAccount.verification_status === 'VERIFIED') {
      return NextResponse.json(
        { error: { code: 'ACCOUNT_LOCKED_AFTER_VERIFICATION', message: 'บัญชีนี้ยืนยันตัวตนสำเร็จแล้ว ไม่สามารถแก้ไขหลักฐานได้' } },
        { status: 403 }
      );
    }

    // Idempotent: ไม่ว่าจะเป็น UNVERIFIED / REJECTED / MANUAL_REVIEW / REVOKED / PENDING (แก้รูปเบลอ)
    // ก็ UPDATE แถวเดิมเสมอ ไม่สร้างเรคคอร์ดใหม่
    const adminSupabase = createAdminClient();
    const { data: updated, error: updateError } = await adminSupabase
      .from('game_accounts')
      .update({
        evidence_url,
        verification_status: 'PENDING',
        rejection_reason: null,
        reviewed_at: null,
      })
      .eq('id', gameAccount.id)
      .select('id, verification_status, evidence_url, updated_at')
      .single();

    if (updateError) {
      return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: updateError.message } }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'อัปโหลดหลักฐานยืนยันตัวตนสำเร็จ คิวของคุณเข้าสู่สถานะรอแอดมินตรวจสอบ',
      data: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
