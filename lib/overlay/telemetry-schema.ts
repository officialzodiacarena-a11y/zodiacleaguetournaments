// lib/overlay/telemetry-schema.ts
// รูปแบบข้อมูล telemetry รายรอบที่ Observer Bridge (เครื่องคนจับกล้อง) ยิงเข้ามา
// จับคู่ผู้เล่นด้วย "name" (ชื่อที่เห็นในเกม) เพราะฝั่ง Bridge ไม่รู้จัก player_id ภายในระบบเรา
// ฝั่ง Overlay (app/overlay/match/[id]/page.tsx) เป็นคนจับคู่ชื่อกับ roster เอง — route นี้แค่ตรวจรูปแบบแล้ว relay ต่อ
import { z } from 'zod';

export const TelemetryPlayerSchema = z.object({
  name: z.string().min(1).max(64),
  credits: z.number().int().min(0).max(99999).optional(),
  weapon: z.string().min(1).max(32).optional(),
  armor: z.enum(['HEAVY', 'LIGHT', 'NONE']).optional(),
  ultPoints: z.number().int().min(0).max(20).optional(),
  ultMax: z.number().int().min(1).max(20).optional(),
  hp: z.number().int().min(0).max(999).optional(),
  hpMax: z.number().int().min(1).max(999).optional(),
});

export const TelemetryFrameSchema = z.object({
  players: z.array(TelemetryPlayerSchema).min(1).max(10),
});

export type TelemetryPlayerFrame = z.infer<typeof TelemetryPlayerSchema>;
export type TelemetryFrame = z.infer<typeof TelemetryFrameSchema>;
