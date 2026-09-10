import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StartWatchSessionSchema } from '@/types/watch-v2';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนดูสตรีม' } }, { status: 401 });
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ขาเข้าไม่ถูกต้อง' } }, { status: 400 });
    }

    const parsed = StartWatchSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ต้องระบุ stream_id' } }, { status: 400 });
    }

    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select('id, is_earn_eligible, status')
      .eq('id', parsed.data.stream_id)
      .single();

    if (streamError || !stream) {
      return NextResponse.json({ error: { code: 'STREAM_NOT_FOUND', message: 'ไม่พบสตรีมนี้' } }, { status: 404 });
    }

    if (!stream.is_earn_eligible) {
      return NextResponse.json({ error: { code: 'STREAM_NOT_ELIGIBLE', message: 'สตรีมนี้ไม่ร่วมรายการรับ AP' } }, { status: 422 });
    }

    const { data: session, error: insertError } = await supabase
      .from('watch_sessions')
      .insert({ stream_id: parsed.data.stream_id, player_id: player.id })
      .select('id, started_at')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: { code: 'ALREADY_WATCHING', message: 'คุณมี Session ดูสตรีมที่กำลังทำงานอยู่แล้ว' } }, { status: 409 });
      }
      return NextResponse.json({ error: { code: 'INSERT_FAILED', message: insertError.message } }, { status: 500 });
    }

    return NextResponse.json({ session_id: session.id, started_at: session.started_at }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
