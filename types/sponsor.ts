// types/sponsor.ts
import { z } from 'zod';

export type SponsorSlotPosition = 'TOP_LEADERBOARD' | 'LEFT_TOWER' | 'RIGHT_TOWER';

export interface SponsorBannerPublic {
  id: string;
  title: string;
  slot_position: SponsorSlotPosition;
  image_url: string;
  target_url: string;
  brand_name: string | null;
  priority: number;
}

export const TrackBannerEventSchema = z.object({
  event_type: z.enum(['IMPRESSION', 'CLICK']),
});

export type TrackBannerEventInput = z.infer<typeof TrackBannerEventSchema>;