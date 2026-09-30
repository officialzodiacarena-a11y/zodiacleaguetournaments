import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdminRole } from '@/lib/admin/requireAdminRole';
import { LEAGUE_ADMIN_ROLES } from '@/lib/admin/requireLeagueAdminPage';
import { mapLeagueRpcError } from '@/lib/league/rpcErrors';

const uuidSchema = z.string().uuid();

const AwardSchema = z.object({
  tournamentId: uuidSchema,
  fixStale: z.boolean().optional(),
});

const RecalculateSchema = z.object({
  circuitId: uuidSchema,
});

const ReverseSchema = z.object({
  txId: uuidSchema,
  reason: z.string().min(1).max(200),
});

const PlacementsSchema = z.object({
  seasonId: uuidSchema,
  tier: z.enum(['PRO', 'CHALLENGER', 'OPEN']),
  placements: z
    .array(
      z.object({
        teamId: uuidSchema,
        placement: z.number().int().min(1).max(64),
      })
    )
    .min(1),
});

const AdjustSchema = z.object({
  seasonId: uuidSchema,
  teamId: uuidSchema,
  points: z.number().int().min(-1000).max(1000).refine((v) => v !== 0, 'points ต้องไม่เท่ากับ 0'),
  reason: z.string().min(1).max(200),
  key: z.string().min(1).max(100),
});

const ProposeSchema = z.object({
  seasonId: uuidSchema,
  nextSeasonId: uuidSchema,
});

const DecideSchema = z.object({
  moveId: uuidSchema,
  decision: z.enum(['CONFIRM', 'REJECT']),
  reason: z.string().optional(),
});

const RolloverSchema = z.object({
  seasonId: uuidSchema,
  nextSeasonId: uuidSchema,
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> | { action: string } }
) {
  try {
    const { action } = await params;

    const supabase = await createClient();
    const gate = await requireAdminRole(supabase, LEAGUE_ADMIN_ROLES);
    if ('error' in gate) return gate.error;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON ไม่ถูกต้อง' } }, { status: 400 });
    }

    let rpcName: string;
    let rpcArgs: Record<string, unknown>;

    switch (action) {
      case 'award': {
        const parsed = AwardSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ถูกต้อง', details: parsed.error.format() } }, { status: 400 });
        }
        rpcName = 'award_league_tournament_points';
        rpcArgs = { p_tournament_id: parsed.data.tournamentId, p_fix_stale: parsed.data.fixStale ?? false };
        break;
      }
      case 'recalculate': {
        const parsed = RecalculateSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ถูกต้อง', details: parsed.error.format() } }, { status: 400 });
        }
        rpcName = 'recalculate_league_standings';
        rpcArgs = { p_circuit_id: parsed.data.circuitId };
        break;
      }
      case 'reverse': {
        const parsed = ReverseSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ถูกต้อง', details: parsed.error.format() } }, { status: 400 });
        }
        rpcName = 'reverse_league_point_transaction';
        rpcArgs = { p_tx_id: parsed.data.txId, p_reason: parsed.data.reason };
        break;
      }
      case 'placements': {
        const parsed = PlacementsSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ถูกต้อง', details: parsed.error.format() } }, { status: 400 });
        }
        rpcName = 'set_league_placements';
        rpcArgs = {
          p_season_id: parsed.data.seasonId,
          p_division_tier: parsed.data.tier,
          p_placements: parsed.data.placements.map((p) => ({ team_id: p.teamId, placement: p.placement })),
        };
        break;
      }
      case 'adjust': {
        const parsed = AdjustSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ถูกต้อง', details: parsed.error.format() } }, { status: 400 });
        }
        rpcName = 'adjust_league_points';
        rpcArgs = {
          p_season_id: parsed.data.seasonId,
          p_team_id: parsed.data.teamId,
          p_points: parsed.data.points,
          p_reason: parsed.data.reason,
          p_key: parsed.data.key,
        };
        break;
      }
      case 'propose': {
        const parsed = ProposeSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ถูกต้อง', details: parsed.error.format() } }, { status: 400 });
        }
        rpcName = 'propose_league_tier_moves';
        rpcArgs = { p_season_id: parsed.data.seasonId, p_next_season_id: parsed.data.nextSeasonId };
        break;
      }
      case 'decide': {
        const parsed = DecideSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ถูกต้อง', details: parsed.error.format() } }, { status: 400 });
        }
        rpcName = 'decide_league_tier_move';
        rpcArgs = { p_move_id: parsed.data.moveId, p_decision: parsed.data.decision, p_reason: parsed.data.reason ?? null };
        break;
      }
      case 'rollover': {
        const parsed = RolloverSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ถูกต้อง', details: parsed.error.format() } }, { status: 400 });
        }
        rpcName = 'rollover_league_season';
        rpcArgs = { p_season_id: parsed.data.seasonId, p_next_season_id: parsed.data.nextSeasonId };
        break;
      }
      default:
        return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'ไม่พบ action นี้' } }, { status: 404 });
    }

    const { data, error } = await supabase.rpc(rpcName as never, rpcArgs as never);

    if (error) {
      const mapped = mapLeagueRpcError(error.message);
      return NextResponse.json({ error: { code: mapped.code, message: mapped.message } }, { status: mapped.status });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
