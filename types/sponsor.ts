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

// ── Sponsor & Partner Tier Management ──────────────────────────────────────

export type SponsorTier = 'SPONSOR' | 'SPONSOR_PARTNER' | 'PARTNER_COOP';
export type SponsorStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface AdminSponsorDetail {
  id: string;
  company_name: string;
  brand_logo_url: string;
  contact_email: string;
  partner_player_id: string | null;
  tier: SponsorTier;
  status: SponsorStatus;
  is_active: boolean;
  rejection_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const CreateSponsorSchema = z.object({
  company_name: z.string().min(2, 'ชื่อบริษัทต้องมีอย่างน้อย 2 ตัวอักษร'),
  brand_logo_url: z.string().url('URL โลโก้ไม่ถูกต้อง'),
  contact_email: z.string().email('อีเมลติดต่อไม่ถูกต้อง'),
  partner_player_id: z.string().uuid().optional().nullable(),
  tier: z.enum(['SPONSOR', 'SPONSOR_PARTNER', 'PARTNER_COOP']),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

export const SponsorApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
  rejection_reason: z.string().optional(),
});

export const SponsorIdParamSchema = z.string().uuid({ message: 'Invalid Sponsor UUID format' });

export type CreateSponsorInput = z.infer<typeof CreateSponsorSchema>;
export type SponsorApprovalInput = z.infer<typeof SponsorApprovalSchema>;

// ── Partner Coupon & Discount Engine (PARTNER_COOP only) ───────────────────

export const VerifyCouponSchema = z.object({
  code: z.string().min(1, 'ต้องระบุโค้ดคูปอง'),
  purchase_amount_ap: z.number().int().nonnegative('ยอดซื้อต้องไม่ติดลบ'),
  idempotency_key: z.string().min(16, 'ต้องระบุ idempotency key ที่ถูกต้อง'),
});

export type VerifyCouponInput = z.infer<typeof VerifyCouponSchema>;

export interface SponsorMetricsSummary {
  sponsor_id: string;
  company_name: string;
  tier: SponsorTier;
  total_impressions: number;
  total_clicks: number;
  ctr_percent: number;
  banners_count: number;
  active_coupons_redeemed: number;
}