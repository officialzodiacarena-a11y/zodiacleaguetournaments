import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateOrderSchema } from '@/types/store';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const idempotencyKey = req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key') || null;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' } },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } },
        { status: 400 }
      );
    }

    const parseResult = CreateOrderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ผ่านเกณฑ์คัดกรอง', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { shippingAddressId, items } = parseResult.data;

    const { data: orderId, error: rpcError } = await supabase.rpc('create_store_order', {
      p_items_json: items,
      p_address_id: shippingAddressId ?? null,
      p_idempotency_key: idempotencyKey,
    });

    if (rpcError) {
      const msg = rpcError.message;
      if (msg.includes('SHIPPING_ADDRESS_REQUIRED')) {
        return NextResponse.json(
          { error: { code: 'SHIPPING_ADDRESS_REQUIRED', message: 'สินค้าประเภทจัดส่งจริงต้องระบุที่อยู่จัดส่ง (shipping_address_id)' } },
          { status: 400 }
        );
      }
      if (msg.includes('OUT_OF_STOCK')) {
        return NextResponse.json(
          { error: { code: 'OUT_OF_STOCK', message: 'สินค้าคงเหลือไม่เพียงพอสำหรับจำนวนที่สั่ง' } },
          { status: 422 }
        );
      }
      if (msg.includes('MAX_LIMIT_REACHED')) {
        return NextResponse.json(
          { error: { code: 'LIMIT_REACHED', message: 'คุณแลกไอเทมนี้ครบโควต้าสูงสุดต่อคนแล้ว' } },
          { status: 422 }
        );
      }
      if (msg.includes('ITEM_NOT_AVAILABLE')) {
        return NextResponse.json(
          { error: { code: 'ITEM_NOT_AVAILABLE', message: 'มีสินค้าในรายการที่ไม่พร้อมจำหน่ายแล้ว' } },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: { code: 'ORDER_CREATION_FAILED', message: msg } },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'สร้างคำสั่งซื้อและจองสต็อกสำเร็จเป็นเวลา 15 นาที',
        order_id: orderId,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
