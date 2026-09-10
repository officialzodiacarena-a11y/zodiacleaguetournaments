import { z } from 'zod';

export const LISTING_CURRENCIES = ['AP', 'THB'] as const;
export type ListingCurrency = (typeof LISTING_CURRENCIES)[number];

export const LISTING_STATUSES = ['ACTIVE', 'PENDING_PAYMENT', 'UNPUBLISHED_OVERDUE', 'SOLD', 'CANCELLED', 'EXPIRED'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const RegisterVendorSchema = z.object({
  shop_name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).nullable().optional(),
  team_id: z.string().uuid().nullable().optional(),
});
export type RegisterVendorInput = z.infer<typeof RegisterVendorSchema>;

export const CreateListingSchema = z.object({
  vendor_id: z.string().uuid(),
  item_title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  image_urls: z.array(z.string().url()).default([]),
  currency_type: z.enum(LISTING_CURRENCIES),
  floor_price: z.number().positive(),
  buyout_price: z.number().positive().nullable().optional(),
  is_paid_slot: z.boolean().default(false),
  auction_ends_at: z.string().datetime().nullable().optional(),
});
export type CreateListingInput = z.infer<typeof CreateListingSchema>;

export const PlaceBidSchema = z.object({
  bid_amount: z.number().positive(),
  idempotency_key: z.string().min(10),
});
export type PlaceBidInput = z.infer<typeof PlaceBidSchema>;

// Public/buyer-facing listing shape — floor_price is intentionally never a
// field on this type. Never widen this without re-checking the zero-leak spec.
export interface PublicListingRow {
  listing_id: string;
  vendor_id: string;
  item_title: string;
  description?: string | null;
  image_urls?: unknown;
  currency_type: ListingCurrency;
  current_highest_bid: number | null;
  buyout_price: number | null;
  status: ListingStatus;
  auction_ends_at: string | null;
}
