import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminRole } from '@/lib/admin/requireAdminRole';

// Stub per Sila's decision (item 3, Sun 2026-09-27): Season Standings / ZP
// Recalculation has no spec yet. This route used to be a copy-paste of
// marketplace/listings/route.ts left here by mistake — it never called any
// season RPC. Replaced with an admin-gated 501 so a real spec can implement
// POST here later without a stray listings endpoint hiding under this URL.
export async function POST(_req: Request, _context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const supabase = await createClient();

    const guard = await requireAdminRole(supabase, ['ADMIN', 'SUPER_ADMIN']);
    if ('error' in guard) return guard.error;

    return NextResponse.json(
      { error: { code: 'NOT_IMPLEMENTED', message: 'รอสเปกคำนวณคะแนนและอันดับประจำซีซั่น (Season Standings / ZP Recalculation)' } },
      { status: 501 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
