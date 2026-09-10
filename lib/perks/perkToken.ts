import { createHmac, timingSafeEqual } from 'crypto';

interface PerkTokenPayload {
  redemption_id: string;
  perk_id: string;
  team_id: string;
  redeemed_by_player_id: string;
  exp: number; // unix seconds
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function issuePerkToken(payload: Omit<PerkTokenPayload, 'exp'>, ttlSeconds = 300): string {
  const secret = process.env.PERK_QR_JWT_SECRET;
  if (!secret) throw new Error('PERK_QR_JWT_SECRET is not configured');

  const fullPayload: PerkTokenPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = base64url(JSON.stringify(fullPayload));
  const signature = sign(body, secret);
  return `${body}.${signature}`;
}

export function verifyPerkToken(token: string): { valid: true; payload: PerkTokenPayload } | { valid: false; reason: 'MALFORMED' | 'BAD_SIGNATURE' | 'EXPIRED' } {
  const secret = process.env.PERK_QR_JWT_SECRET;
  if (!secret) throw new Error('PERK_QR_JWT_SECRET is not configured');

  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, reason: 'MALFORMED' };
  const [body, signature] = parts;

  const expected = sign(body, secret);
  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== receivedBuf.length || !timingSafeEqual(expectedBuf, receivedBuf)) {
    return { valid: false, reason: 'BAD_SIGNATURE' };
  }

  let payload: PerkTokenPayload;
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

export function verifyPartnerApiKey(headerValue: string | null): boolean {
  const expected = process.env.PARTNER_PERK_API_KEY;
  if (!expected || !headerValue) return false;
  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(headerValue, 'utf8');
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}
