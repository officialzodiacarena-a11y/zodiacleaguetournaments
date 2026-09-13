import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AwardZpPayloadSchema, type AwardZpRpcResult } from '@/types/zp-engine';
import { asRpcResult } from '@/types/supabase-helpers';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const tournamentId = resolvedParams.id;
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

    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('player_id', player.id)
      .is('revoked_at', null)
      .single();

    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (roleError || !userRole || !allowedRoles.includes(userRole.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN_ROLE', message: 'บัญชีนี้ไม่มีอภิสิทธิ์เข้าถึงฟังก์ชันแจกคะแนน' } },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ขาเข้าไม่ถูกต้อง' } },
        { status: 400 }
      );
    }

    const parseResult = AwardZpPayloadSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'ข้อมูลขาเข้าไม่ตรงกับเกณฑ์จัดอันดับ ZP',
            details: parseResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const { teamId, amount, reason, placement, idempotencyKey } = parseResult.data;

    const rpcPayload = {
      p_team_id: teamId,
      p_tournament_id: tournamentId,
      p_amount: amount,
      p_reason: reason,
      p_placement: placement ?? null,
      p_idempotency_key: idempotencyKey,
      p_awarded_by: player.id,
    };

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'award_zp' as never,
      rpcPayload as never
    );

    if (rpcError) {
      return NextResponse.json(
        { error: { code: 'RPC_FAILED', message: rpcError.message } },
        { status: 500 }
      );
    }

    const result = asRpcResult<AwardZpRpcResult>(rpcResult);

    if (!result.success) {
      if (result.error === 'DUPLICATE_KEY') {
        return NextResponse.json(
          {
            error: {
              code: 'DUPLICATE_KEY',
              message: 'รายการแจกคะแนนนี้เคยได้รับการอนุมัติไปแล้ว (Idempotency Key Blocked)',
            },
          },
          { status: 409 }
        );
      }
      if (result.error === 'SEASON_LOCKED') {
        return NextResponse.json(
          {
            error: {
              code: 'SEASON_LOCKED',
              message: 'ไม่สามารถแจกคะแนนเพิ่มเติมได้เนื่องจากซีซันนี้ถูกแช่แข็งผลคะแนนไปแล้ว',
            },
          },
          { status: 422 }
        );
      }
      if (result.error === 'TOURNAMENT_NOT_IN_SEASON') {
        return NextResponse.json(
          { error: { code: 'TOURNAMENT_NOT_IN_SEASON', message: 'ทัวร์นาเมนต์นี้ไม่ได้อยู่ในซีซันใด ๆ' } },
          { status: 422 }
        );
      }
      if (result.error === 'INSUFFICIENT_ZP') {
        return NextResponse.json(
          {
            error: {
              code: 'INSUFFICIENT_ZP',
              message: 'คะแนนสะสมปัจจุบันไม่เพียงพอสำหรับการหักแต้มนี้',
              current_balance: result.current_balance,
              requested: result.requested,
            },
          },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: { code: 'AWARD_FAILED', message: result.error } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'บันทึกประวัติการแจกคะแนนสโมสรลง Ledger เรียบร้อยแล้ว',
        data: {
          ledger_id: result.ledger_id,
          amount_awarded: result.amount_awarded,
          multiplier: result.multiplier,
          balance_after: result.balance_after,
        },
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