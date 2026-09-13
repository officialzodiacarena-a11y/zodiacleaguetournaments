//app/api/v1/athlete-market/buyout/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const BuyoutSchema = z.object({
  listing_id: z.string().uuid(),
  destination_team_id: z.string().uuid(),
});

interface BuyoutRpcSuccess {
  success: true;
  deal_price: number;
  fee_burned: number;
}

interface BuyoutRpcError {
  success: false;
  code: string;
  message: string;
}

type BuyoutRpcResult = BuyoutRpcSuccess | BuyoutRpcError;

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
    const payload = BuyoutSchema.parse(body);
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } },
        { status: 401 }
      );
    }

    const { data: buyer } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!buyer) {
      return NextResponse.json(
        { error: { code: 'PLAYER_NOT_FOUND', message: 'ไม่พบข้อมูลโปรไฟล์ผู้ใช้' } },
        { status: 404 }
      );
    }

    const { data: rawResult, error: rpcError } = await supabase.rpc('buyout_athlete_listing', {
      p_listing_id: payload.listing_id,
      p_buyer_player_id: buyer.id,
      p_destination_team_id: payload.destination_team_id,
    });

    if (rpcError) {
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: rpcError.message } },
        { status: 500 }
      );
    }

    if (!rawResult) {
      return NextResponse.json(
        { error: { code: 'RPC_EMPTY_RESPONSE', message: 'ไม่ได้รับข้อมูลตอบกลับจากระบบซื้อสัญญา' } },
        { status: 500 }
      );
    }

    const result = rawResult as unknown as BuyoutRpcResult;

    if (!result.success) {
      const statusCode = result.code === 'LISTING_NOT_ACTIVE' ? 409 : (result.code === 'ROSTER_LOCKED' ? 422 : 400);
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      deal_price: result.deal_price,
      fee_burned: result.fee_burned,
      message: "ดำเนินการซื้อสัญญาตัวนักกีฬาสำเร็จ ย้ายสังกัดเรียบร้อยแล้ว",
    }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message } }, { status: 400 });
  }
}