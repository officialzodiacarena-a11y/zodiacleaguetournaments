// lib/overlay/observer-token.ts
// Observer Bridge (คนจับกล้อง) auth token — ยืนยันตัวเครื่องที่ยิง telemetry เข้า /api/v1/matches/[id]/telemetry
// เก็บเฉพาะ hash ไว้ใน matches.format_config (ไม่เพิ่มตาราง/คอลัมน์ใหม่) เพราะ matches มี RLS อ่านสาธารณะ
// (20260917_enable_public_spectate.sql) — ถ้าเก็บ token ดิบไว้ตรงนั้นใครก็ query เห็นแล้วปลอม telemetry ได้
import { createHash, randomBytes } from 'crypto';

function asConfig(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function generateObserverToken(): string {
  return randomBytes(24).toString('base64url');
}

export function hashObserverToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// merge เข้า format_config เดิม (ห้ามทับ overlay_scene / lobby_code / stream_url ที่คีย์อื่นเก็บไว้)
export function withObserverTokenHash(formatConfig: unknown, tokenHash: string): Record<string, unknown> {
  return { ...asConfig(formatConfig), observer_token_hash: tokenHash };
}

export function getObserverTokenHash(formatConfig: unknown): string | null {
  const value = asConfig(formatConfig).observer_token_hash;
  return typeof value === 'string' ? value : null;
}
