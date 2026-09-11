import { createHmac, timingSafeEqual } from 'crypto';

// Compact HMAC-signed token for the digital voucher QR (Phase C spec: signed
// payload of voucher_id + player_id + exp, 5-minute TTL). No jsonwebtoken/jose
// dependency is installed, and a full JWT isn't needed for a same-origin,
// short-lived, single-purpose token — base64url(payload).hex(hmac) is enough
// and reuses the same HMAC-SHA256 + timingSafeEqual pattern the Patch V1.01
// brief specifies for its (separate) request-signing layer.
const VOUCHER_TTL_SECONDS = 5 * 60;

export interface VoucherTokenPayload {
  inventoryId: string;
  playerId: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.AP_TRANSACTION_SECRET;
  if (!secret) throw new Error('AP_TRANSACTION_SECRET is not configured');
  return secret;
}

function base64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

export function signVoucherToken(inventoryId: string, playerId: string): { token: string; expiresAt: string } {
  const exp = Math.floor(Date.now() / 1000) + VOUCHER_TTL_SECONDS;
  const payload: VoucherTokenPayload = { inventoryId, playerId, exp };
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = createHmac('sha256', getSecret()).update(encodedPayload).digest('hex');
  return { token: `${encodedPayload}.${signature}`, expiresAt: new Date(exp * 1000).toISOString() };
}

export function verifyVoucherToken(token: string): VoucherTokenPayload | null {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expected = createHmac('sha256', getSecret()).update(encodedPayload).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as VoucherTokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
