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

export interface AdminBannerDetail extends SponsorBannerPublic {
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  impression_count: number;
  click_count: number;
  ctr_percent: number;
  created_at: string;
  updated_at: string;
}

export const TrackBannerEventSchema = z.object({
  event_type: z.enum(['IMPRESSION', 'CLICK']),
});

export const BannerIdParamSchema = z.string().uuid({ message: 'Invalid Banner UUID format' });

export const CreateBannerSchema = z.object({
  title: z.string().min(2, 'ชื่อแบนเนอร์ต้องมีอย่างน้อย 2 ตัวอักษร'),
  slot_position: z.enum(['TOP_LEADERBOARD', 'LEFT_TOWER', 'RIGHT_TOWER']),
  image_url: z.string().url('URL รูปภาพไม่ถูกต้อง'),
  target_url: z.string().min(1, 'ต้องระบุ URL ปลายทาง'),
  brand_name: z.string().optional().nullable(),
  priority: z.coerce.number().int().default(0),
  is_active: z.boolean().default(true),
  starts_at: z.string().optional(),
  ends_at: z.string().optional().nullable(),
});

export const UpdateBannerSchema = CreateBannerSchema.partial();

export type CreateBannerInput = z.infer<typeof CreateBannerSchema>;
export type UpdateBannerInput = z.infer<typeof UpdateBannerSchema>;
export type TrackBannerEventInput = z.infer<typeof TrackBannerEventSchema>;