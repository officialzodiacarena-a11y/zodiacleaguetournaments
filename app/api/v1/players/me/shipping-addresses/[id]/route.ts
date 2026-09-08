import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: addressId } = await params;
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

    const { error: deleteError, count } = await supabase
      .from('shipping_addresses')
      .delete({ count: 'exact' })
      .eq('id', addressId)
      .eq('player_id', player.id);

    if (deleteError) {
      return NextResponse.json({ error: { code: 'DELETE_FAILED', message: deleteError.message } }, { status: 500 });
    }

    if (!count) {
      return NextResponse.json(
        { error: { code: 'ADDRESS_NOT_FOUND', message: 'ไม่พบที่อยู่จัดส่งนี้ หรือไม่ใช่ของคุณ' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
