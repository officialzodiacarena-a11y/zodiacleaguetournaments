import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signVoucherToken } from '@/lib/store/voucherToken';

// Issues a short-lived (5 min) signed QR token for a digital voucher already
// in the caller's player_inventory. A partner-facing scan/redeem endpoint
// that flips the item to REDEEMED is the natural next step, but
// player_inventory (as written by checkout_order()) has no status/redeemed_at
// column yet — that needs a migration this task can't write or run, so it's
// out of scope here. This route only proves ownership and issues the token.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ inventoryId: string }> | { inventoryId: string } }
) {
  try {
    const { inventoryId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' } },
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

    const { data: inventoryItem, error: inventoryError } = await supabase
      .from('player_inventory')
      .select('id, player_id')
      .eq('id', inventoryId)
      .single();

    if (inventoryError || !inventoryItem) {
      return NextResponse.json(
        { error: { code: 'INVENTORY_NOT_FOUND', message: 'ไม่พบไอเทมนี้ในคลังของคุณ' } },
        { status: 404 }
      );
    }

    if (inventoryItem.player_id !== player.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์เข้าถึงไอเทมนี้' } },
        { status: 403 }
      );
    }

    const { token, expiresAt } = signVoucherToken(inventoryItem.id, player.id);

    return NextResponse.json({ token, expires_at: expiresAt });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
