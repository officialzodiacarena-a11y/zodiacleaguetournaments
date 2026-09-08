import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CreateDisputeSchema } from '@/types/dispute-ops';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const matchId = resolvedParams.id;
    const supabase = await createClient();

    // 1. ตรวจสอบการ Authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนยื่นข้อพิพาท' } },
        { status: 401 }
      );
    }

    // 2. Validate JSON Request Body ด้วย Zod Schema
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } },
        { status: 400 }
      );
    }

    const parseResult = CreateDisputeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'ข้อมูลไม่ตรงข้อกำหนด',
            details: parseResult.error.format(),
          },
        },
        { status: 400 }
      );
    }
    const { category, title, description, evidenceUrls } = parseResult.data;

    // 3. ดึงข้อมูล Player Profile
    const { data: player } = await supabase
      .from('players')
      .select('id, display_name')
      .eq('user_id', user.id)
      .single();

    if (!player) {
      return NextResponse.json(
        { error: { code: 'PLAYER_NOT_FOUND', message: 'ไม่พบโปรไฟล์ผู้เล่นของบัญชีนี้' } },
        { status: 404 }
      );
    }

    // 4. ดึงและตรวจสถานะ Match ปัจจุบัน
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json(
        { error: { code: 'MATCH_NOT_FOUND', message: 'ไม่พบข้อมูลแมตช์การแข่งขันที่ระบุ' } },
        { status: 404 }
      );
    }

    if (!['LIVE', 'PAUSED', 'AWAITING_RESULT'].includes(match.status)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_DISPUTE_STATE',
            message: `ไม่สามารถยื่นข้อพิพาทได้ในสถานะแมตช์ปัจจุบัน (${match.status})`,
          },
        },
        { status: 422 }
      );
    }

    // 5. ตรวจสอบสิทธิ์ (ต้องเป็น Captain / Manager / Owner ของทีมในแมตช์นี้)
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('player_id', player.id)
      .eq('status', 'ACTIVE')
      .in('team_id', [match.team_a_id ?? '', match.team_b_id ?? ''])
      .in('role', ['CAPTAIN', 'MANAGER', 'OWNER']);

    if (memberError || !member || member.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED_TEAM_ROLE',
            message: 'สิทธิ์ในการยื่นข้อพิพาทจำกัดเฉพาะกัปตันหรือผู้จัดการทีมในคู่นี้เท่านั้น',
          },
        },
        { status: 403 }
      );
    }

    // 6. บันทึก Dispute ลงตาราง disputes ตาม DB Schema
    const formattedReason = `[${title}]\n${description}`;

    const { data: dispute, error: insertErr } = await supabase
      .from('disputes')
      .insert({
        match_id: matchId,
        filed_by: player.id,
        category,
        priority: 'HIGH',
        reason: formattedReason,
        evidence_urls: evidenceUrls,
        status: 'OPEN',
      })
      .select()
      .single();

    if (insertErr || !dispute) {
      return NextResponse.json(
        { error: { code: 'DISPUTE_FILING_FAILED', message: insertErr?.message || 'Insert failed' } },
        { status: 500 }
      );
    }

    // 7. ใช้ Admin Client อัปเดต Match Status เป็น DISPUTED & บันทึก Audit State Transition
    // Fix (2026-09-09): เดิมไม่เช็ค error ที่คืนจาก UPDATE เลย — ถ้า DB trigger
    // (trg_validate_match_transition) ปฏิเสธการเปลี่ยนสถานะ, dispute จะถูกบันทึก
    // ไว้แล้วแต่แมตช์ยังไม่ถูกล็อกเป็น DISPUTED จริง ต้อง rollback dispute row ทิ้ง
    // และแจ้ง error กลับไปแทนที่จะรายงานสำเร็จลวง ๆ
    const adminSupabase = createAdminClient();

    const { error: matchUpdateErr } = await adminSupabase
      .from('matches')
      .update({
        status: 'DISPUTED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId);

    if (matchUpdateErr) {
      await adminSupabase.from('disputes').delete().eq('id', dispute.id);
      return NextResponse.json(
        {
          error: {
            code: 'MATCH_TRANSITION_FAILED',
            message: `ไม่สามารถล็อกสถานะแมตช์เป็น DISPUTED ได้: ${matchUpdateErr.message}`,
          },
        },
        { status: 409 }
      );
    }

    await adminSupabase.from('match_state_transitions').insert({
      match_id: matchId,
      from_status: match.status,
      to_status: 'DISPUTED',
      trigger_source: 'PLAYER',
      actor_id: player.id,
      reason: `Dispute filed: ${title}`,
      state_snapshot: {
        dispute_id: dispute.id,
        dispute_number: dispute.dispute_number,
        previous_match_data: match,
      },
    });

    // 8. ยิง Broadcast แจ้งเตือน Realtime ไปยังห้อง Match Lobby
    await adminSupabase.channel(`match-lobby-${matchId}`).send({
      type: 'broadcast',
      event: 'match_status_changed',
      payload: {
        status: 'DISPUTED',
        dispute_id: dispute.id,
        dispute_number: dispute.dispute_number,
      },
    });

    return NextResponse.json(
      {
        success: true,
        dispute_id: dispute.id,
        dispute_number: dispute.dispute_number,
        next_status: 'DISPUTED',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}
