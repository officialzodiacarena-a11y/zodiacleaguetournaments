import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id: sessionId } = await params;
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

    const { data: session, error: sessionError } = await supabase
      .from('watch_sessions')
      .select('id, status, started_at')
      .eq('id', sessionId)
      .eq('player_id', player.id)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json({ error: { code: 'SESSION_NOT_FOUND', message: 'ไม่พบ session นี้' } }, { status: 404 });
    }

    if (session.status !== 'ACTIVE') {
      return NextResponse.json({ error: { code: 'STREAM_ENDED', message: 'Session นี้จบไปแล้ว' } }, { status: 422 });
    }

    const { error: updateError } = await supabase
      .from('watch_sessions')
      .update({ status: 'CLAIMED', updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (updateError) {
      return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: updateError.message } }, { status: 500 });
    }

    const watchedMinutes = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 60000);

    return NextResponse.json({ session_id: sessionId, status: 'ENDED', watched_minutes: watchedMinutes });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
