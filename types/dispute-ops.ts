// types/dispute-ops.ts

import { z } from 'zod';

export const CreateDisputeSchema = z.object({
  category: z.enum([
    'WRONG_SCORE', 'CHEATING', 'SMURFING', 'INELIGIBLE_PLAYER',
    'NO_SHOW', 'TOXICITY', 'TECHNICAL_ISSUE', 'RULE_VIOLATION', 'OTHER'
  ]),
  title: z.string().min(10).max(200),
  description: z.string().min(20),
  evidenceUrls: z.array(z.string().url()).min(1),
});

export const ResolveDisputeSchema = z.object({
  disputeId: z.string().uuid(),
  winnerTeamId: z.string().uuid(),
  scoreA: z.number().int().nonnegative(),
  scoreB: z.number().int().nonnegative(),
  roundsWonA: z.number().int().nonnegative(),
  roundsWonB: z.number().int().nonnegative(),
  resolutionNotes: z.string().min(10),
  penalty: z.object({
    penalizedPlayerId: z.string().uuid().optional(),
    penalizedTeamId: z.string().uuid().optional(),
    penaltyType: z.enum(['AP_FINE', 'ZP_DEDUCTION', 'ATHLETE_SUSPENSION', 'ATHLETE_BAN']).optional(),
    apFineAmount: z.number().int().nonnegative().optional(),
    zpDeductionAmount: z.number().int().nonnegative().optional(),
    suspensionDays: z.number().int().positive().optional(),
    notes: z.string().optional(),
  }).optional(),
});

export type CreateDisputeInput = z.infer<typeof CreateDisputeSchema>;
export type ResolveDisputeInput = z.infer<typeof ResolveDisputeSchema>;
