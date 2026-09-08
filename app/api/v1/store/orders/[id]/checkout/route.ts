import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CheckoutOrderResult } from '@/types/store';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' } },
        { status: 401 }
      );
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('checkout_order', { p_order_id: orderId });

    if (rpcError) {
      const msg = rpcError.message;
      if (msg.includes('ORDER_NOT_FOUND')) {
        return NextResponse.json({ error: { code: 'ORDER_NOT_FOUND', message: 'ไม่พบคำสั่งซื้อนี้' } }, { status: 404 });
      }
      if (msg.includes('FORBIDDEN')) {
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ทำรายการนี้' } }, { status: 403 });
      }
      if (msg.includes('ORDER_NOT_PENDING')) {
        return NextResponse.json(
          { error: { code: 'ORDER_NOT_PENDING', message: 'คำสั่งซื้อนี้ไม่ได้อยู่ในสถานะรอชำระเงินแล้ว' } },
          { status: 409 }
        );
      }
      if (msg.includes('ORDER_EXPIRED')) {
        return NextResponse.json(
          { error: { code: 'ORDER_EXPIRED', message: 'คำสั่งซื้อนี้หมดเวลาการจองสต็อกแล้ว' } },
          { status: 409 }
        );
      }
      if (msg.includes('INSUFFICIENT_AP')) {
        return NextResponse.json(
          { error: { code: 'INSUFFICIENT_AP', message: 'ยอด AP คงเหลือไม่เพียงพอสำหรับคำสั่งซื้อนี้' } },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: { code: 'CHECKOUT_FAILED', message: msg } }, { status: 500 });
    }

    const result = rpcResult as CheckoutOrderResult;

    return NextResponse.json({
      success: true,
      order_id: result.order_id,
      status: result.status,
      fulfilled_items_count: result.fulfilled_items_count,
      ap_deducted: result.ap_deducted,
      remaining_balance: result.remaining_balance,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
