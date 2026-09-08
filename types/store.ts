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

export const CreateStoreItemSchema = z.object({
  name: z.string().min(2).max(150),
  type: z.enum(['DIGITAL', 'PHYSICAL']),
  description: z.string().optional(),
  maxPerPlayer: z.number().int().positive().optional(),
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
