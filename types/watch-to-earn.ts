import { z } from 'zod';

// ต้องตรงกับ ENUM stream_type_type ที่มีอยู่แล้วใน DB
export const StreamTypeEnum = z.enum(['LIVE_MATCH', 'VOD', 'HIGHLIGHT', 'CREATOR', 'OFFICIAL']);
// ต้องตรงกับ ENUM stream_status_type ที่มีอยู่แล้วใน DB
export const StreamStatusEnum = z.enum(['SCHEDULED', 'LIVE', 'ENDED', 'PROCESSING', 'AVAILABLE', 'REMOVED']);

export const CreateStreamSchema = z.object({
  title: z.string().min(3).max(200),
  matchId: z.string().uuid().optional(),
  tournamentId: z.string().uuid().optional(),
  type: StreamTypeEnum.default('OFFICIAL'),
  streamUrl: z.string().url().optional(),
  isEarnEligible: z.boolean().default(false),
  earningRuleId: z.string().uuid().optional(),
  apBudgetTotal: z.number().positive().optional(),
});

export const UpdateStreamSchema = z.object({
  status: StreamStatusEnum.optional(),
  earningRuleId: z.string().uuid().nullable().optional(),
  apBudgetTotal: z.number().nonnegative().nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'ต้องระบุอย่างน้อย 1 ฟิลด์ที่ต้องการอัปเดต',
});

export const CreateEarningRuleSchema = z.object({
  name: z.string().min(3).max(100),
  apPerInterval: z.number().positive(),
  intervalSeconds: z.number().int().positive(),
  dailyCapAp: z.number().int().positive().default(100),
  maxSessionMinutes: z.number().int().positive().default(180),
  isActive: z.boolean().default(true),
});

export const UpdateEarningRuleSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  apPerInterval: z.number().positive().optional(),
  intervalSeconds: z.number().int().positive().optional(),
  dailyCapAp: z.number().int().positive().optional(),
  maxSessionMinutes: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'ต้องระบุอย่างน้อย 1 ฟิลด์ที่ต้องการอัปเดต',
});

export const HeartbeatPayloadSchema = z.object({
  positionSec: z.number().nonnegative(),
  playbackRate: z.number().positive(),
  deltaSec: z.number().nonnegative(),
  watchedSeconds: z.number().nonnegative(),
});

export type CreateStreamInput = z.infer<typeof CreateStreamSchema>;
export type UpdateStreamInput = z.infer<typeof UpdateStreamSchema>;
export type CreateEarningRuleInput = z.infer<typeof CreateEarningRuleSchema>;
export type UpdateEarningRuleInput = z.infer<typeof UpdateEarningRuleSchema>;
export type HeartbeatPayload = z.infer<typeof HeartbeatPayloadSchema>;

export interface EarningRuleRow {
  id: string;
  name: string;
  ap_per_interval: number;
  interval_seconds: number;
  daily_cap_ap: number;
  max_session_minutes: number;
  is_active: boolean;
}

export interface WatchSessionRow {
  id: string;
  stream_id: string;
  player_id: string;
  earning_rule_id: string | null;
  status: 'ACTIVE' | 'CLAIMED' | 'EXPIRED' | 'ABANDONED';
  started_at: string;
  last_heartbeat_at: string | null;
  position_sec: number;
  watched_seconds: number;
  risk_score: number;
  is_anomalous: boolean;
  anomaly_note: string | null;
}

export interface ClaimWatchRewardResult {
  success: boolean;
  error?: string;
  ap_awarded?: number;
  capped?: boolean;
  balance_after?: number;
  daily_earned?: number;
  daily_cap?: number;
}

export interface MoveApResult {
  success: boolean;
  error?: string;
  balance_after?: number;
  ledger_id?: string;
}
