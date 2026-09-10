import { z } from 'zod';

// Watch-to-Earn V2 — a distinct, newer architecture from the V1 system at
// app/api/v1/streams/[id]/watch/* (batch-claim-at-session-end). V2 credits AP
// incrementally on every heartbeat instead. Both coexist; V1 is untouched.

export const StartWatchSessionSchema = z.object({
  stream_id: z.string().uuid(),
});
export type StartWatchSessionInput = z.infer<typeof StartWatchSessionSchema>;

export const WatchHeartbeatSchema = z.object({
  session_id: z.string().uuid(),
});
export type WatchHeartbeatInput = z.infer<typeof WatchHeartbeatSchema>;

export interface HeartbeatOkResponse {
  status: 'OK';
  earned: number;
  total_today: number;
  daily_cap: number;
}

export interface HeartbeatCapReachedResponse {
  status: 'CAP_REACHED';
  earned: 0;
  total_today: number;
  daily_cap: number;
  next_reset_at: string;
}

export type HeartbeatResponse = HeartbeatOkResponse | HeartbeatCapReachedResponse;
