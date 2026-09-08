import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildTrackingUrl } from '@/types/store';

export async function GET(
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

    const { data: shipment, error } = await supabase
      .from('shipments')
      .select('id, order_id, tracking_number, carrier, status, shipped_at, created_at')
      .eq('order_id', orderId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: error.message } }, { status: 500 });
    }

    if (!shipment) {
      return NextResponse.json(
        { error: { code: 'SHIPMENT_NOT_FOUND', message: 'ไม่พบข้อมูลการจัดส่งของคำสั่งซื้อนี้' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        ...shipment,
        tracking_url: buildTrackingUrl(shipment.carrier, shipment.tracking_number),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
