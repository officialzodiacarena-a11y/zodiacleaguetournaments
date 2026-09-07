import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const CreateMessageSchema = z.object({
  message: z.string().min(1, { message: 'ข้อความห้ามว่าง' }).max(500, { message: 'ข้อความยาวเกินกำหนด 500 ตัวอักษร' }),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await params;
  const matchId = resolvedParams.id;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนส่งข้อความ' } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } },
      { status: 400 }
    );
  }

  const parseResult = CreateMessageSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ข้อความไม่ผ่านเกณฑ์การตรวจสอบ', details: parseResult.error.format() } },
      { status: 400 }
    );
  }

  const { message } = parseResult.data;

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!player) {
    return NextResponse.json(
      { error: { code: 'PLAYER_NOT_FOUND', message: 'ไม่พบโปรไฟล์ผู้เล่นของบัญชีนี้' } },
      { status: 404 }
    );
  }

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, team_a_id, team_b_id, referee_id')
    .eq('id', matchId)
    .single();

  if (matchError || !match) {
    return NextResponse.json(
      { error: { code: 'MATCH_NOT_FOUND', message: 'ไม่พบข้อมูลแมตช์การแข่งขันที่ระบุ' } },
      { status: 404 }
    );
  }

  // ประเมินบทบาทผู้ส่ง (TEAM_A | TEAM_B | REFEREE) จากความเป็นสมาชิกจริง
  let senderRole: 'TEAM_A' | 'TEAM_B' | 'REFEREE' | null = null;

  if (match.referee_id === player.id) {
    senderRole = 'REFEREE';
  } else {
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('player_id', player.id)
      .eq('status', 'ACTIVE')
      .in('team_id', [match.team_a_id, match.team_b_id]);

    const teamIds = new Set((memberships || []).map((m) => m.team_id));
    if (teamIds.has(match.team_a_id)) senderRole = 'TEAM_A';
    else if (teamIds.has(match.team_b_id)) senderRole = 'TEAM_B';
  }

  if (!senderRole) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'คุณไม่มีสิทธิ์เข้าถึงห้องล็อบบี้แมตช์นี้' } },
      { status: 403 }
    );
  }

  // Rate limit: สูงสุด 5 ข้อความต่อ 10 วินาที ต่อผู้ใช้ในแมตช์นี้
  const tenSecondsAgo = new Date(Date.now() - 10 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from('match_lobby_messages')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', matchId)
    .eq('sender_id', player.id)
    .gt('created_at', tenSecondsAgo);

  if ((recentCount ?? 0) >= 5) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'ส่งข้อความถี่เกินไป กรุณารอสักครู่' } },
      { status: 429 }
    );
  }

  const adminSupabase = createAdminClient();
  const { data: insertedMessage, error: insertError } = await adminSupabase
    .from('match_lobby_messages')
    .insert({
      match_id: matchId,
      sender_id: player.id,
      sender_role: senderRole,
      message,
      is_system: false,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: { code: 'INSERT_FAILED', message: insertError.message } },
      { status: 500 }
    );
  }

  await adminSupabase.channel(`match-lobby-${matchId}`).send({
    type: 'broadcast',
    event: 'lobby_message',
    payload: insertedMessage,
  });

  return NextResponse.json(insertedMessage, { status: 201 });
}
