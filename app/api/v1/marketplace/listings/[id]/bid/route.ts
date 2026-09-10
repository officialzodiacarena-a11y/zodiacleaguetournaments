import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PlaceBidSchema } from '@/types/marketplace';

// Zero-Leak: this route never returns floor_price, the price gap, or any
// error code that would reveal it. A non-matching bid always looks identical
// to a successfully-recorded-but-not-winning bid from the response shape.
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

    const parsed = PlaceBidSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลขาเข้าไม่ถูกต้อง', details: parsed.error.format() } },
        { status: 400 }
      );
    }

    const { bid_amount, idempotency_key } = parsed.data;

    const { data: rpcResult, error: rpcError } = await supabase.rpc('match_ffxi_blind_bid', {
      p_listing_id: listingId,
      p_bidder_id: player.id,
      p_bid_amount: bid_amount,
      p_idempotency_key: idempotency_key,
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; matched?: boolean; listing_id?: string };

    if (!result.success) {
      const statusByError: Record<string, number> = {
        LISTING_NOT_FOUND: 404,
        ITEM_ALREADY_SOLD: 409,
        AUCTION_ENDED: 422,
        SELF_BID_FORBIDDEN: 403,
        BID_TOO_LOW: 422,
        DUPLICATE_KEY: 409,
        INSUFFICIENT_AP_BALANCE: 422,
      };
      return NextResponse.json({ error: { code: result.error, message: result.error } }, { status: statusByError[result.error ?? ''] ?? 400 });
    }

    return NextResponse.json(
      result.matched
        ? { success: true, matched: true, message: 'การซื้อขายสำเร็จตามราคาประมูล', listing_id: result.listing_id }
        : { success: true, matched: false, message: 'บันทึกราคาเสนอประมูลเรียบร้อย' }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
