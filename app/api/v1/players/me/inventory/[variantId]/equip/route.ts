import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ variantId: string }> | { variantId: string } }
) {
  try {
    const { variantId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' } },
        { status: 401 }
      );
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('equip_inventory_item', {
      p_variant_id: variantId,
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'EQUIP_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; item_type?: string };

    if (!result.success) {
      if (result.error === 'ITEM_NOT_OWNED') {
        return NextResponse.json(
          { error: { code: 'ITEM_NOT_OWNED', message: 'คุณไม่มีไอเทมนี้ในคลัง' } },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: { code: 'EQUIP_FAILED', message: result.error ?? 'สวมใส่ไอเทมไม่สำเร็จ' } },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, item_type: result.item_type });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
