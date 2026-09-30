import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateOrderSchema } from '@/types/store';
import { toJson } from '@/types/supabase-helpers';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const idempotencyKey = req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key') || undefined;

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

    const { shippingAddressId, items, paymentMethod, couponCode } = parseResult.data;

    const { data: orderId, error: rpcError } = await supabase.rpc(
      'create_store_order' as never,
      {
        p_items_json: toJson(items),
        p_address_id: shippingAddressId ?? undefined,
        p_idempotency_key: idempotencyKey,
        p_payment_method: paymentMethod,
        p_coupon_code: couponCode ?? undefined,
      } as never
    );

    if (rpcError) {
      const msg = rpcError.message;
      const ORDER_ERRORS: Array<[string, number, string]> = [
        ['UNAUTHORIZED', 401, 'กรุณาเข้าสู่ระบบก่อนดำเนินการ'],
        ['EMPTY_CART', 400, 'ตะกร้าว่าง'],
        ['INVALID_QUANTITY', 400, 'จำนวนสินค้าไม่ถูกต้อง'],
        ['INVALID_PAYMENT_METHOD', 400, 'วิธีชำระเงินไม่ถูกต้อง'],
        ['MIXED_STOREFRONT', 422, 'สินค้าในตะกร้ามาจากหลายหน้าร้าน กรุณาสั่งแยกทีละร้าน'],
        ['STOREFRONT_INACTIVE', 422, 'หน้าร้านนี้ปิดให้บริการชั่วคราว'],
        ['PAYMENT_METHOD_NOT_ALLOWED', 422, 'หน้าร้านนี้ไม่รองรับวิธีชำระเงินที่เลือก'],
        ['PRICE_NOT_SET_FOR_METHOD', 422, 'มีสินค้าที่ยังไม่เปิดขายด้วยวิธีชำระเงินนี้'],
        ['SHIPPING_ADDRESS_REQUIRED', 400, 'สินค้าประเภทจัดส่งจริงต้องระบุที่อยู่จัดส่ง (shipping_address_id)'],
        ['OUT_OF_STOCK', 422, 'สินค้าคงเหลือไม่เพียงพอสำหรับจำนวนที่สั่ง'],
        ['MAX_LIMIT_REACHED', 422, 'คุณแลกไอเทมนี้ครบโควต้าสูงสุดต่อคนแล้ว'],
        ['ITEM_NOT_AVAILABLE', 422, 'มีสินค้าในรายการที่ไม่พร้อมจำหน่ายแล้ว'],
        ['USER_REACHED_PER_USER_LIMIT', 422, 'คุณใช้คูปองนี้ครบสิทธิ์แล้ว'],
        ['SPONSOR_SUSPENDED_OR_INACTIVE', 422, 'คูปองนี้ไม่สามารถใช้งานได้ในขณะนี้'],
        ['COUPON_', 422, 'ใช้คูปองนี้กับคำสั่งซื้อนี้ไม่ได้'],
      ];
      const hit = ORDER_ERRORS.find(([k]) => msg.includes(k));
      if (hit) {
        const code = hit[0] === 'COUPON_' ? (msg.match(/COUPON_[A-Z_]+/)?.[0] ?? 'COUPON_INVALID') : (hit[0] === 'MAX_LIMIT_REACHED' ? 'LIMIT_REACHED' : hit[0]);
        return NextResponse.json({ error: { code, message: hit[2] } }, { status: hit[1] });
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