// lib/overlay/telemetry-schema.ts
// รูปแบบข้อมูล telemetry รายรอบที่ Observer Bridge (เครื่องคนจับกล้อง / OCR Engine) ยิงเข้ามา
// จับคู่ผู้เล่นด้วย "name" (ชื่อที่เห็นในเกม) เพราะฝั่ง Bridge ไม่รู้จัก player_id ภายในระบบเรา
// ฝั่ง Overlay (app/overlay/match/[id]/page.tsx) เป็นคนจับคู่ชื่อกับ roster เอง — route นี้แค่ตรวจรูปแบบแล้ว relay ต่อ
// Expanded 2026-09-23 (SPEC-OCR-TELEMETRY-ROUNDS-V8.01-001 Part 2.3): เพิ่ม round_event สำหรับบันทึก
// ผล Round-End ลงตาราง match_rounds ผ่าน RPC record_match_round_event() และเพิ่มฟิลด์ debug ของ OCR
// (raw_ocr_name / matched_player_id / match_confidence) ไว้ในตัว payload ผู้เล่นเพื่อ audit ย้อนหลังได้
import { z } from 'zod';

export const WinConditionEnum = z.enum([
  'elimination',
  'spike_detonate',
  'spike_defuse',
  'time_expire',
]);

export const RoundEventSchema = z.object({
  stage: z.enum(['BUY_PHASE', 'COMBAT_PHASE', 'ROUND_ENDED']),
  game_number: z.number().int().min(1).default(1),
  round_number: z.number().int().min(1),
  winner_team_id: z.string().uuid().optional(),
  win_condition: WinConditionEnum.optional(),
  ocr_confidence: z.number().min(0).max(100).optional(),
  idempotency_key: z.string().min(1).max(128).optional(),
});

export const TelemetryPlayerSchema = z.object({
  name: z.string().min(1).max(64),
  raw_ocr_name: z.string().max(64).optional(),
  matched_player_id: z.string().uuid().optional(),
  match_confidence: z.number().min(0).max(100).optional(),
  credits: z.number().int().min(0).max(99999).optional(),
  weapon: z.string().min(1).max(32).optional(),
  armor: z.enum(['HEAVY', 'LIGHT', 'NONE']).optional(),
  ultPoints: z.number().int().min(0).max(20).optional(),
  ultMax: z.number().int().min(1).max(20).optional(),
  hp: z.number().int().min(0).max(999).optional(),
  hpMax: z.number().int().min(1).max(999).optional(),
});

export const TelemetryFrameSchema = z.object({
  timestamp: z.number().optional(),
  round_event: RoundEventSchema.optional(),
  // min(0): เฟรม round_event-only (แค่แจ้งผลจบรอบ) ไม่จำเป็นต้องแนบสถานะผู้เล่นมาด้วย
  players: z.array(TelemetryPlayerSchema).max(10).default([]),
});

export type WinCondition = z.infer<typeof WinConditionEnum>;
export type RoundEvent = z.infer<typeof RoundEventSchema>;
export type TelemetryPlayerFrame = z.infer<typeof TelemetryPlayerSchema>;
export type TelemetryFrame = z.infer<typeof TelemetryFrameSchema>;
