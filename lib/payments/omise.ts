const OMISE_API_BASE = 'https://api.omise.co';

const SOURCE_TYPE_MAP: Record<string, string> = {
  PROMPTPAY: 'promptpay',
  TRUE_MONEY: 'truemoney',
  BANK_TRANSFER: 'internet_banking_bay',
};

interface OmiseSource {
  id: string;
  scannable_code?: { image?: { download_uri?: string } };
}

interface OmiseCharge {
  id: string;
  status: string;
  authorize_uri?: string | null;
}

interface OmiseRefund {
  id: string;
  status?: string;
}

async function omiseRequest<T>(path: string, body: Record<string, string>): Promise<T> {
  const secretKey = process.env.OMISE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('OMISE_SECRET_KEY ยังไม่ได้ตั้งค่าใน environment');
  }

  const res = await fetch(`${OMISE_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });

  const json = await res.json();

  if (!res.ok) {
    const message = typeof json?.message === 'string' ? json.message : `Omise API error (${res.status})`;
    throw new Error(message);
  }

  return json as T;
}

export interface OmiseChargeResult {
  chargeId: string;
  status: string;
  checkoutUrl: string | null;
}

export async function createOmiseCharge(params: {
  amountThb: number;
  method: 'PROMPTPAY' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'TRUE_MONEY';
  omiseToken?: string;
  paymentIntentId: string;
}): Promise<OmiseChargeResult> {
  const amountSatang = String(Math.round(params.amountThb * 100));

  if (params.method === 'CREDIT_CARD') {
    if (!params.omiseToken) {
      throw new Error('ต้องแนบ omiseToken (สร้างจาก Omise.js ฝั่ง client) สำหรับการชำระด้วยบัตรเครดิต');
    }

    const charge = await omiseRequest<OmiseCharge>('/charges', {
      amount: amountSatang,
      currency: 'thb',
      card: params.omiseToken,
      'metadata[payment_intent_id]': params.paymentIntentId,
    });

    return { chargeId: charge.id, status: charge.status, checkoutUrl: charge.authorize_uri ?? null };
  }

  const sourceType = SOURCE_TYPE_MAP[params.method];
  const source = await omiseRequest<OmiseSource>('/sources', {
    type: sourceType,
    amount: amountSatang,
    currency: 'thb',
  });

  const charge = await omiseRequest<OmiseCharge>('/charges', {
    amount: amountSatang,
    currency: 'thb',
    source: source.id,
    'metadata[payment_intent_id]': params.paymentIntentId,
  });

  return {
    chargeId: charge.id,
    status: charge.status,
    checkoutUrl: charge.authorize_uri ?? source.scannable_code?.image?.download_uri ?? null,
  };
}

export async function refundOmiseCharge(chargeId: string, amountThb?: number): Promise<{ refundId: string; status: string }> {
  const body: Record<string, string> = {};
  if (amountThb !== undefined) {
    body.amount = String(Math.round(amountThb * 100));
  }

  const refund = await omiseRequest<OmiseRefund>(`/charges/${chargeId}/refunds`, body);
  return { refundId: refund.id, status: refund.status ?? 'pending' };
}
