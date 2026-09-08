import { z } from 'zod';

export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

export const CircuitLockSchema = z.object({
  circuit_id: z.string().uuid(),
});

export const ZodiacDrawRequestSchema = z.object({
  salt: z.string().trim().min(1).max(100).optional(),
});

export const SeasonArchiveSchema = z.object({
  tournament_id: z.string().uuid(),
  year: z.number().int().min(2026).optional(),
});

export const SeasonResetSchema = z.object({
  circuit_id: z.string().uuid(),
  new_season: z.object({
    name: z.string().trim().min(1).max(100),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
  }),
});

export interface ZodiacDrawEntry {
  team_id: string;
  team_name: string;
  finals_seed: number;
}

export interface ZodiacDrawResult {
  algorithm: 'MD5_SEEDED_V1';
  salt: string;
  locked_at: string;
  locked_by: string;
  results: Record<ZodiacSign, ZodiacDrawEntry>;
}
