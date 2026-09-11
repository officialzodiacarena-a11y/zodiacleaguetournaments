import { z } from 'zod';

export const CreateOrderSchema = z.object({
  shippingAddressId: z.string().uuid({ message: 'shippingAddressId ต้องเป็น UUID ที่สมบูรณ์' }).optional(),
  items: z
    .record(z.string(), z.number().int().positive({ message: 'จำนวนสินค้าต้องไม่ต่ำกว่า 1 ชิ้น' }))
    .refine((obj) => Object.keys(obj).length > 0, { message: 'ต้องเลือกสินค้าอย่างน้อย 1 รายการ' })
    .refine((obj) => Object.keys(obj).every((k) => z.string().uuid().safeParse(k).success), {
      message: 'variant_id ในรายการสินค้าต้องเป็น UUID ที่สมบูรณ์',
    }),
});

export const CreateShippingAddressSchema = z.object({
  recipientName: z.string().min(2).max(100),
  phone: z.string().min(9).max(20),
  addressLine1: z.string().min(5),
  addressLine2: z.string().optional(),
  province: z.string().min(2).max(100),
  postalCode: z.string().min(4).max(10),
  isDefault: z.boolean().default(false),
});

// item_type is the live-schema categorization (PHYSICAL/DIGITAL/VOUCHER, set
// by the admin UI) — distinct from `type`, the original NOT NULL column with
// its own DB CHECK (DIGITAL/PHYSICAL only, no VOUCHER). VOUCHER items map
// `type` to DIGITAL since a voucher is never physically shipped; see the
// itemTypeToType() mapping used by the POST /items route.
export const StoreItemTypeEnum = z.enum(['PHYSICAL', 'DIGITAL', 'VOUCHER']);

export const CreateStoreItemSchema = z.object({
  name: z.string().min(2).max(150),
  // Optional: the admin UI only collects itemType (PHYSICAL/DIGITAL/VOUCHER)
  // and the route derives this NOT NULL column via itemTypeToType() below —
  // still overridable by callers that pass it explicitly.
  type: z.enum(['DIGITAL', 'PHYSICAL']).optional(),
  description: z.string().optional(),
  maxPerPlayer: z.number().int().positive().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  itemType: StoreItemTypeEnum.nullable().optional().default('PHYSICAL'),
  partnerBrand: z.string().max(50).nullable().optional(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        priceAp: z.number().int().nonnegative().default(0),
        priceThb: z.number().int().nonnegative().default(0),
        stock: z.number().int().nonnegative().default(0),
        availableUntil: z.string().datetime().optional(),
      })
    )
    .min(1, { message: 'ต้องมีอย่างน้อย 1 variant' }),
});

export const UpdateStoreItemSchema = z
  .object({
    name: z.string().min(2).max(150).optional(),
    description: z.string().nullable().optional(),
    maxPerPlayer: z.number().int().positive().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'ต้องระบุอย่างน้อย 1 ฟิลด์ที่ต้องการอัปเดต' });

export const CreateStoreVariantSchema = z.object({
  name: z.string().min(1).max(100),
  priceAp: z.number().int().nonnegative().default(0),
  priceThb: z.number().int().nonnegative().default(0),
  stock: z.number().int().nonnegative().default(0),
  availableUntil: z.string().datetime().nullable().optional(),
});

export const UpdateStoreVariantSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    priceAp: z.number().int().nonnegative().optional(),
    priceThb: z.number().int().nonnegative().optional(),
    stock: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
    availableUntil: z.string().datetime().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'ต้องระบุอย่างน้อย 1 ฟิลด์ที่ต้องการอัปเดต' });

export const CreateStoreCategorySchema = z.object({
  name: z.string().min(1).max(150),
  slug: z
    .string()
    .min(1)
    .max(150)
    .regex(/^[a-z0-9-]+$/, { message: 'slug ต้องเป็นตัวพิมพ์เล็ก ตัวเลข และ - เท่านั้น' }),
  parentId: z.string().uuid().nullable().optional(),
  partnerBrand: z.string().max(50).nullable().optional(),
  iconUrl: z.string().url().nullable().optional(),
  displayOrder: z.number().int().default(0),
});

export const UpdateStoreCategorySchema = z
  .object({
    name: z.string().min(1).max(150).optional(),
    displayOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'ต้องระบุอย่างน้อย 1 ฟิลด์ที่ต้องการอัปเดต' });

// item_type -> type derivation for the POST /items insert: `type` is the
// original NOT NULL column (CHECK DIGITAL/PHYSICAL only) and has no VOUCHER
// value, so a VOUCHER item is stored as type=DIGITAL (never shipped).
export function itemTypeToType(itemType: 'PHYSICAL' | 'DIGITAL' | 'VOUCHER' | null | undefined): 'PHYSICAL' | 'DIGITAL' {
  return itemType === 'PHYSICAL' ? 'PHYSICAL' : 'DIGITAL';
}

export type CreateStoreCategoryInput = z.infer<typeof CreateStoreCategorySchema>;
export type UpdateStoreCategoryInput = z.infer<typeof UpdateStoreCategorySchema>;
export type CreateStoreVariantInput = z.infer<typeof CreateStoreVariantSchema>;

// Row shapes matching the verified live schema (store_items has 3 columns —
// category_id, item_type, partner_brand — that exist on production but were
// never added to any tracked migration; see DataTree/migration audit notes).
// `store_item_variants` is nested under this key (not `variants`) to match
// what GET/POST /api/v1/admin/store/items actually return today — Supabase's
// PostgREST nested-select names the relation after the table unless aliased.
export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  partner_brand: string | null;
  icon_url: string | null;
  display_order: number;
  is_active: boolean;
}

export interface StoreItemVariant {
  id: string;
  item_id: string;
  name: string;
  price_ap: number;
  price_thb: number;
  stock: number;
  reserved_stock: number;
  is_active: boolean;
  available_until: string | null;
}

export interface StoreItem {
  id: string;
  name: string;
  type: string;
  item_type: string | null;
  description: string | null;
  max_per_player: number | null;
  is_active: boolean;
  partner_brand: string | null;
  category_id: string | null;
  created_at: string;
  store_item_variants: StoreItemVariant[];
}

export const UpdateShipmentSchema = z
  .object({
    trackingNumber: z.string().min(1).optional(),
    carrier: z.string().min(1).optional(),
    status: z.enum(['PENDING', 'SHIPPED', 'DELIVERED']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'ต้องระบุอย่างน้อย 1 ฟิลด์ที่ต้องการอัปเดต' });

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type CreateShippingAddressInput = z.infer<typeof CreateShippingAddressSchema>;
export type CreateStoreItemInput = z.infer<typeof CreateStoreItemSchema>;
export type UpdateStoreItemInput = z.infer<typeof UpdateStoreItemSchema>;
export type UpdateStoreVariantInput = z.infer<typeof UpdateStoreVariantSchema>;
export type UpdateShipmentInput = z.infer<typeof UpdateShipmentSchema>;

export interface CheckoutOrderResult {
  success: boolean;
  error?: string;
  order_id?: string;
  status?: string;
  fulfilled_items_count?: number;
  ap_deducted?: number;
  remaining_balance?: number;
}

const CARRIER_TRACKING_URL_TEMPLATES: Record<string, string> = {
  THAILAND_POST: 'https://track.thailandpost.co.th/?trackNumber=',
  KERRY: 'https://th.kerryexpress.com/en/track/?track=',
  FLASH: 'https://www.flashexpress.com/tracking/?se=',
};

export function buildTrackingUrl(carrier: string | null, trackingNumber: string | null): string | null {
  if (!carrier || !trackingNumber) return null;
  const template = CARRIER_TRACKING_URL_TEMPLATES[carrier.toUpperCase()];
  return template ? `${template}${trackingNumber}` : null;
}
