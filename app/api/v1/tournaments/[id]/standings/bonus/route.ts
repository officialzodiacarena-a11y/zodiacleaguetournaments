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

    // Call RPC or update the tournament_standings table directly
    // Assuming tournament_standings has columns: tournament_id, team_id, bonus_points
    const { data, error } = await supabase
      .rpc('add_tournament_bonus_points', {
        p_tournament_id: tournamentId,
        p_team_id: parsed.data.teamId,
        p_points: parsed.data.bonusPoints,
        p_reason: parsed.data.reason
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