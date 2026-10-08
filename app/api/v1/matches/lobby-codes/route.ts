import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireBroadcastRole } from '@/lib/auth/require-broadcast-role';
import { parseMatchIds, readLobbyCodes } from '@/lib/match/lobby-secret';

// GET /api/v1/matches/lobby-codes?ids=<uuid>,<uuid>
// คืนรหัสห้องเกมให้ผู้คุมการถ่ายทอด (REFEREE / ADMIN / SUPER_ADMIN) — หน้า Stream Hub ใช้
// รหัสเก็บใน match_lobby_secrets ซึ่ง anon อ่านไม่ได้ (เดิมอยู่ใน matches.format_config ที่สาธารณะอ่านได้)
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireBroadcastRole(supabase);
    if (!auth.ok) return auth.response;

    const ids = parseMatchIds(new URL(req.url).searchParams.get('ids'));
    const codes = await readLobbyCodes(createAdminClient(), ids);
    return NextResponse.json({ codes }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
