export type SlipVerdict = 'AUTO_OK' | 'MANUAL' | 'REJECT';

export interface SlipCheck {
  verdict: SlipVerdict;
  code: string;
  message: string;
  transRef: string | null;
  transAt: string | null;
  amountThb: number | null;
  providerResponse: unknown;
}

export interface EntryFeeBankEnv {
  code: string;
  name: string;
  accountName: string;
  accountNo: string;
}

export function readEntryFeeEnv(): {
  slipok: { branchId: string; apiKey: string } | null;
  bank: EntryFeeBankEnv | null;
} {
  const branchId = process.env.SLIPOK_BRANCH_ID;
  const apiKey = process.env.SLIPOK_API_KEY;
  const slipok = branchId && apiKey ? { branchId, apiKey } : null;

  const code = process.env.ENTRY_FEE_BANK_CODE;
  const name = process.env.ENTRY_FEE_BANK_NAME;
  const accountName = process.env.ENTRY_FEE_ACCOUNT_NAME;
  const accountNoRaw = process.env.ENTRY_FEE_ACCOUNT_NO;
  const bank =
    code && name && accountName && accountNoRaw
      ? { code, name, accountName, accountNo: accountNoRaw.replace(/\D/g, '') }
      : null;

  return { slipok, bank };
}

export function matchMaskedAccount(masked: string, fullDigits: string): 'MATCH' | 'MISMATCH' | 'UNKNOWN' {
  const m = masked.replace(/[-\s]/g, '');
  const f = fullDigits.replace(/\D/g, '');

  if (!m || !f || m.length !== f.length) return 'UNKNOWN';
  if (/[^0-9xX]/.test(m)) return 'UNKNOWN';

  let digitPositions = 0;
  let mismatch = false;
  for (let i = 0; i < m.length; i++) {
    if (/[0-9]/.test(m[i])) {
      digitPositions++;
      if (m[i] !== f[i]) mismatch = true;
    }
  }

  if (digitPositions < 4) return 'UNKNOWN';
  return mismatch ? 'MISMATCH' : 'MATCH';
}

export function evaluateSlipOkResponse(
  json: unknown,
  expectedAmountThb: number,
  bank: EntryFeeBankEnv
): SlipCheck {
  const providerResponse = json;
  const j = json as Record<string, unknown> | null | undefined;
  const amountLabel = expectedAmountThb.toFixed(2);

  if (j && j.success === true && (j.data as Record<string, unknown> | undefined)?.success === true) {
    const data = j.data as Record<string, unknown>;
    const receiver = data.receiver as Record<string, unknown> | undefined;
    const account = receiver?.account as Record<string, unknown> | undefined;

    const transRef = data.transRef ? String(data.transRef) : null;
    const transTimestamp = data.transTimestamp;
    const parsedDate = transTimestamp ? new Date(transTimestamp as string) : null;
    const transAt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null;
    const amountThb = data.amount !== undefined && data.amount !== null ? Number(data.amount) : null;

    if (String(data.receivingBank) !== bank.code) {
      return {
        verdict: 'REJECT',
        code: 'RECEIVER_BANK_MISMATCH',
        message: 'สลิปนี้ไม่ได้โอนเข้าบัญชีบริษัท',
        transRef,
        transAt,
        amountThb,
        providerResponse,
      };
    }

    const accountMatch = matchMaskedAccount(String(account?.value ?? ''), bank.accountNo);
    if (accountMatch === 'MISMATCH') {
      return {
        verdict: 'REJECT',
        code: 'RECEIVER_ACCOUNT_MISMATCH',
        message: 'สลิปนี้ไม่ได้โอนเข้าบัญชีบริษัท',
        transRef,
        transAt,
        amountThb,
        providerResponse,
      };
    }
    if (accountMatch === 'UNKNOWN') {
      return {
        verdict: 'MANUAL',
        code: 'RECEIVER_ACCOUNT_UNVERIFIED',
        message: 'ตรวจบัญชีผู้รับอัตโนมัติไม่ได้ ส่งให้แอดมินตรวจ',
        transRef,
        transAt,
        amountThb,
        providerResponse,
      };
    }

    if (Math.round(Number(data.amount) * 100) !== Math.round(expectedAmountThb * 100)) {
      return {
        verdict: 'REJECT',
        code: 'AMOUNT_MISMATCH',
        message: `ยอดในสลิปไม่ตรงกับค่าสมัคร ${amountLabel} บาท`,
        transRef,
        transAt,
        amountThb,
        providerResponse,
      };
    }

    if (!data.transRef || !parsedDate || Number.isNaN(parsedDate.getTime())) {
      return {
        verdict: 'MANUAL',
        code: 'SLIP_FIELDS_MISSING',
        message: 'ข้อมูลสลิปไม่ครบ ส่งให้แอดมินตรวจ',
        transRef,
        transAt,
        amountThb,
        providerResponse,
      };
    }

    return {
      verdict: 'AUTO_OK',
      code: 'OK',
      message: 'ตรวจสลิปผ่าน',
      transRef: String(data.transRef),
      transAt: new Date(data.transTimestamp as string).toISOString(),
      amountThb: Number(data.amount),
      providerResponse,
    };
  }

  const rawCode = j ? Number(j.code) : NaN;
  const code = Number.isNaN(rawCode) ? null : rawCode;

  const manual = (c: string, message: string): SlipCheck => ({
    verdict: 'MANUAL',
    code: c,
    message,
    transRef: null,
    transAt: null,
    amountThb: null,
    providerResponse,
  });
  const reject = (c: string, message: string): SlipCheck => ({
    verdict: 'REJECT',
    code: c,
    message,
    transRef: null,
    transAt: null,
    amountThb: null,
    providerResponse,
  });

  switch (code) {
    case 1012:
      return reject('SLIPOK_1012', 'สลิปนี้ถูกใช้ไปแล้ว');
    case 1013:
      return reject('SLIPOK_1013', `ยอดในสลิปไม่ตรงกับค่าสมัคร ${amountLabel} บาท`);
    case 1014:
      return reject('SLIPOK_1014', 'สลิปนี้ไม่ได้โอนเข้าบัญชีบริษัท');
    case 1005:
    case 1006:
      return reject(`SLIPOK_${code}`, 'ไฟล์รูปไม่ถูกต้อง กรุณาอัปโหลดรูปสลิปต้นฉบับ');
    case 1007:
    case 1008:
      return reject(`SLIPOK_${code}`, 'ไม่พบ QR ในรูป กรุณาอัปโหลดสลิปจากแอปธนาคารแบบเต็มใบ ไม่ครอป');
    case 1011:
      return reject('SLIPOK_1011', 'ไม่พบรายการนี้ในระบบธนาคาร');
    case 1010:
      return manual('SLIPOK_1010', 'ธนาคารยังไม่อัปเดตรายการ ส่งให้แอดมินตรวจ');
    default:
      return manual(`SLIPOK_${code ?? 'UNKNOWN'}`, 'ส่งให้แอดมินตรวจ');
  }
}

export async function checkSlip(file: Blob, fileName: string, expectedAmountThb: number, senderAccountName?: string): Promise<SlipCheck> {
  const { slipok, bank } = readEntryFeeEnv();

  if (!slipok || !bank) {
    return {
      verdict: 'MANUAL',
      code: 'SLIPOK_NOT_CONFIGURED',
      message: senderAccountName ? `ส่งให้แอดมินตรวจ (บัญชี: ${senderAccountName})` : 'ส่งให้แอดมินตรวจ',
      transRef: null,
      transAt: null,
      amountThb: null,
      providerResponse: null,
    };
  }

  const formData = new FormData();
  formData.append('files', file, fileName);
  formData.append('log', 'true');
  formData.append('amount', String(expectedAmountThb));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let json: unknown;
  try {
    const res = await fetch(`https://api.slipok.com/api/line/apikey/${slipok.branchId}`, {
      method: 'POST',
      headers: { 'x-authorization': slipok.apiKey },
      body: formData,
      signal: controller.signal,
    });
    json = await res.json();
  } catch {
    return {
      verdict: 'MANUAL',
      code: 'SLIPOK_UNAVAILABLE',
      message: 'ระบบตรวจสลิปไม่ตอบ ส่งให้แอดมินตรวจ',
      transRef: null,
      transAt: null,
      amountThb: null,
      providerResponse: null,
    };
  } finally {
    clearTimeout(timeout);
  }

  return evaluateSlipOkResponse(json, expectedAmountThb, bank);
}
