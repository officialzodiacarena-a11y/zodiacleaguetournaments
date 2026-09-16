// types/navbar.ts
import { z } from 'zod';

export const ZodiacSignEnum = z.enum([
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]);
export type ZodiacSign = z.infer<typeof ZodiacSignEnum>;

export const NavbarUserSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string().min(1),
  avatarUrl: z.string().url().nullable().optional(),
  zodiacSign: ZodiacSignEnum.nullable().default(null),
  apBalance: z.number().int().nonnegative().default(0),
  verificationStatus: z.enum(['UNVERIFIED', 'PENDING', 'VERIFIED', 'MANUAL_REVIEW', 'REJECTED']).default('UNVERIFIED')
});

export type NavbarUser = z.infer<typeof NavbarUserSchema>;
