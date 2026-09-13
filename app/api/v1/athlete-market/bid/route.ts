import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const BidSchema = z.object({
  listing_id: z.string().uuid(),
  bid_amount_ap: z.number().int().positive(),
  destination_team_id: z.string().uuid(),
});

interface BidRpcResponse {
  success: boolean;
  code?: string;
  message?: string;
  matched?: boolean;
}

export async function POST(req: Request) {
  try {
    const idempotencyKey = req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key');
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'Header Idempotency-Key จำเป็นต้องระบุ' } },
        { status: 400 }
      );
    }

    const body = await req.json();
    const payload = BidSchema.parse(body);
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } }, { status: 401 });
    }

    const { data: bidder } = await supabase
      .from('players')
      .select('id, kyc_verified_at')
      .eq('user_id', user.id)
      .single();

    if (!bidder) {
      return NextResponse.json({ error: { code: 'PLAYER_NOT_FOUND', message: 'ไม่พบข้อมูลโปรไฟล์ผู้ใช้' } }, { status: 404 });
    }

    // Anti-Sybil Check: Unverified KYC จำกัด 500 AP/วัน
    if (!bidder.kyc_verified_at) {
      const { data: dailyBidsSum } = await supabase.rpc('get_daily_unverified_bid_total' as never, { p_player_id: bidder.id } as never);
      if (Number(dailyBidsSum || 0) + payload.bid_amount_ap > 500) {
        return NextResponse.json({
          error: {
            code: 'ANTI_SYBIL_DAILY_LIMIT_EXCEEDED',
            message: 'บัญชีที่ยังไม่ได้ยืนยัน KYC สามารถยื่นประมูลได้ไม่เกิน 500 AP ต่อวัน'
          }
        }, { status: 422 });
      }
    }

    const { data: rawRpcResult, error: rpcError } = await supabase.rpc('match_ffxi_athlete_bid' as never, {
      p_listing_id: payload.listing_id,
      p_bidder_player_id: bidder.id,
      p_destination_team_id: payload.destination_team_id,
      p_bid_amount_ap: payload.bid_amount_ap,
      p_idempotency_key: idempotencyKey,
    } as never);

    if (rpcError) {
      return NextResponse.json({ error: { code: 'DATABASE_RPC_ERROR', message: rpcError.message } }, { status: 500 });
    }

    if (!rawRpcResult) {
      return NextResponse.json({ error: { code: 'RPC_EMPTY_RESPONSE', message: 'ไม่ได้รับข้อมูลตอบกลับจากระบบประมูล' } }, { status: 500 });
    }

    const rpcResult = rawRpcResult as unknown as BidRpcResponse;

    if (!rpcResult.success) {
      return NextResponse.json({ error: { code: rpcResult.code ?? 'BID_FAILED', message: rpcResult.message ?? 'เกิดข้อผิดพลาดในการประมูล' } }, { status: 400 });
    }

    const isMatched = Boolean(rpcResult.matched);

    return NextResponse.json({
      success: true,
      matched: isMatched,
      message: isMatched
        ? "ข้อเสนอประมูลถึงราคาขั้นต่ำ ทำการซื้อขายสัญญาสำเร็จทันที!"
        : "บันทึกราคาเสนอประมูลเรียบร้อยแล้ว",
      data: {
        listing_id: payload.listing_id,
        status: isMatched ? "SOLD" : "BID_RECORDED",
      }
    }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message } }, { status: 400 });
  }
}