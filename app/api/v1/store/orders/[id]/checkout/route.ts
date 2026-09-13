import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rateLimit';
import type { CheckoutOrderResult } from '@/types/store';
import { asRpcResult } from '@/types/supabase-helpers';

const CHECKOUT_RATE_LIMIT = 3;
const CHECKOUT_RATE_WINDOW_SECONDS = 60;

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

    // Server-side idempotency for this checkout already lives one layer down:
    // checkout_order() locks the order row FOR UPDATE, only proceeds while
    // status = 'PENDING', and calls move_ap() with a deterministic key
    // ('checkout-order-' || order_id) it derives itself — the client never
    // supplies one, so a duplicate request either hits ORDER_NOT_PENDING
    // (order already flipped to PAID) or move_ap's own DUPLICATE_KEY guard.
    // This rate limit is the remaining gap: it stops the retry storm before
    // it reaches Postgres at all.
    const rateLimit = checkRateLimit(`store_checkout:${user.id}`, CHECKOUT_RATE_LIMIT, CHECKOUT_RATE_WINDOW_SECONDS);
    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'ทำรายการถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' } },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
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

    const result = asRpcResult<CheckoutOrderResult>(rpcResult);

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
