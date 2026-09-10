import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Not in the abbreviated API_Stage2_Phase6.md contract (which only lists a
// single POST /bid), but the QA verification report explicitly tests
// buyout_marketplace_item() as its own concurrency scenario (Case 7 —
// "2 คนกด buyout พร้อมกัน"), so it needs its own explicit "Buy Now" action
// distinct from a blind bid against the publicly-visible buyout_price.
const BuyoutSchema = z.object({ idempotency_key: z.string().min(10) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id: listingId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } }, { status: 401 });
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ขาเข้าไม่ถูกต้อง' } }, { status: 400 });
    }

    const parsed = BuyoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลขาเข้าไม่ถูกต้อง' } }, { status: 400 });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('buyout_marketplace_item', {
      p_listing_id: listingId,
      p_buyer_id: player.id,
      p_idempotency_key: parsed.data.idempotency_key,
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; listing_id?: string };

    if (!result.success) {
      const statusByError: Record<string, number> = {
        LISTING_NOT_FOUND: 404,
        ITEM_ALREADY_SOLD: 409,
        BUYOUT_NOT_AVAILABLE: 400,
        SELF_BID_FORBIDDEN: 403,
        DUPLICATE_KEY: 409,
        INSUFFICIENT_AP_BALANCE: 422,
      };
      return NextResponse.json({ error: { code: result.error, message: result.error } }, { status: statusByError[result.error ?? ''] ?? 400 });
    }

    return NextResponse.json({ success: true, message: 'ซื้อสำเร็จ', listing_id: result.listing_id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
