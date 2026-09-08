import { z } from 'zod';

// T4.0 Manual Athlete Verification — รองรับเฉพาะ VALORANT ในสปรินต์บริดจ์นี้
// region เป็น free-text ตาม games.region ปัจจุบัน (ap/na/eu/kr) ไม่ใช่ ENUM ในฐานข้อมูล
export const CreateGameAccountSchema = z.object({
  game_name: z.string().trim().min(1).max(50),
  tag_line: z.string().trim().min(1).max(10),
  region: z.string().trim().toLowerCase().min(2).max(10).default('ap'),
});

export const SubmitEvidenceSchema = z.object({
  evidence_url: z.string().trim().url().max(500),
});

export const RejectVerificationSchema = z.object({
  rejection_reason: z.string().trim().min(3).max(500),
});

export const RevokeVerificationSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export type CreateGameAccountInput = z.infer<typeof CreateGameAccountSchema>;
export type SubmitEvidenceInput = z.infer<typeof SubmitEvidenceSchema>;
export type RejectVerificationInput = z.infer<typeof RejectVerificationSchema>;
export type RevokeVerificationInput = z.infer<typeof RevokeVerificationSchema>;

// verification_status_type ค่าจริงจาก DB (ยืนยันแล้ว 2026-09-08) — ไม่มี UNLINKED/SELF_DECLARED
export const VERIFICATION_STATUS_VALUES = [
  'UNVERIFIED',
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'REVOKED',
  'MANUAL_REVIEW',
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUS_VALUES)[number];
