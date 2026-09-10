import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

interface TransferTokenPayload {
  jti: string;
  sender_id: string;
  exp: number; // unix seconds
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function issueTransferToken(senderId: string, ttlSeconds = 900): { token: string; jti: string; expiresAt: string } {
  const secret = process.env.P2P_TRANSFER_JWT_SECRET;
  if (!secret) throw new Error('P2P_TRANSFER_JWT_SECRET is not configured');

  const jti = randomUUID();
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload: TransferTokenPayload = { jti, sender_id: senderId, exp };
  const body = base64url(JSON.stringify(payload));
  const signature = sign(body, secret);

  return { token: `${body}.${signature}`, jti, expiresAt: new Date(exp * 1000).toISOString() };
}

export function verifyTransferToken(token: string): { valid: true; payload: TransferTokenPayload } | { valid: false; reason: 'MALFORMED' | 'BAD_SIGNATURE' | 'EXPIRED' } {
  const secret = process.env.P2P_TRANSFER_JWT_SECRET;
  if (!secret) throw new Error('P2P_TRANSFER_JWT_SECRET is not configured');

  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, reason: 'MALFORMED' };
  const [body, signature] = parts;

  const expected = sign(body, secret);
  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== receivedBuf.length || !timingSafeEqual(expectedBuf, receivedBuf)) {
    return { valid: false, reason: 'BAD_SIGNATURE' };
  }

  let payload: TransferTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, reason: 'MALFORMED' };
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: 'EXPIRED' };
  }

  return { valid: true, payload };
}

export function hashOtpCode(code: string): string {
  const secret = process.env.P2P_TRANSFER_JWT_SECRET ?? '';
  return createHmac('sha256', secret).update(code).digest('hex');
}
