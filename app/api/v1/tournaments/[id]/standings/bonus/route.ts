import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdminRole } from '@/lib/admin/requireAdminRole';

const BonusSchema = z.object({
  teamId: z.string().uuid(),
  bonusPoints: z.number(),
  reason: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: tournamentId } = await params;
    const supabase = await createClient();
    
    // Check Authorization for Tournament Admin or Super Admin
    const gate = await requireAdminRole(supabase, ['SUPER_ADMIN', 'TOURNAMENT_ADMIN']);
    if ('error' in gate) return gate.error;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON ไม่ถูกต้อง' } }, { status: 400 });
    }

    const parsed = BonusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ถูกต้อง', details: parsed.error.format() } }, { status: 400 });
    }

    const { data: tournament, error: tourneyErr } = await supabase
      .from('tournaments')
      .select('season_id')
      .eq('id', tournamentId)
      .single();

    if (tourneyErr || !tournament) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'ไม่พบทัวร์นาเมนต์นี้' } }, { status: 404 });
    }

    const { data, error } = await supabase
      .rpc('adjust_league_points', {
        p_season_id: tournament.season_id,
        p_team_id: parsed.data.teamId,
        p_points: parsed.data.bonusPoints,
        p_reason: parsed.data.reason,
        p_key: `tourney-bonus-${tournamentId}-${Date.now()}`
      });

    if (error) {
      return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? { success: true } }, { status: 200 });

  } catch (err: unknown) {
    console.error('[admin/bonus] unexpected error:', err);
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' } }, { status: 500 });
  }
}