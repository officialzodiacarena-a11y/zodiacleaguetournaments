import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CreateGameAccountSchema } from '@/types/verification';

async function requirePlayer(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } },
      { status: 401 }
    ) };
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (playerError || !player) {
    return { error: NextResponse.json(
      { error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } },
      { status: 404 }
    ) };
  }

  return { player };
}

// Sprint 4.0 รองรับเฉพาะ VALORANT (สอดคล้องกับ GameAccountModal.tsx เดิมที่ hardcode code = 'VAL')
async function getValorantGameId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: game } = await supabase.from('games').select('id').eq('code', 'VAL').single();
  return game?.id ?? null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const guard = await requirePlayer(supabase);
    if (guard.error) return guard.error;

    const gameId = await getValorantGameId(supabase);
    if (!gameId) {
      return NextResponse.json(
        { error: { code: 'GAME_NOT_FOUND', message: 'ไม่พบข้อมูลเกม VALORANT ในระบบ' } },
        { status: 404 }
      );
    }

    const { data: gameAccount } = await supabase
      .from('game_accounts')
      .select('id, game_name, tag_line, region, verification_status, evidence_url, rejection_reason, verified_at, last_synced_at')
      .eq('player_id', guard.player.id)
      .eq('game_id', gameId)
      .is('deleted_at', null)
      .maybeSingle();

    return NextResponse.json({ player_id: guard.player.id, game_account: gameAccount ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const guard = await requirePlayer(supabase);
    if (guard.error) return guard.error;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } },
        { status: 400 }
      );
    }

    const parseResult = CreateGameAccountSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }
    const { game_name, tag_line, region } = parseResult.data;

    const gameId = await getValorantGameId(supabase);
    if (!gameId) {
      return NextResponse.json(
        { error: { code: 'GAME_NOT_FOUND', message: 'ไม่พบข้อมูลเกม VALORANT ในระบบ' } },
        { status: 404 }
      );
    }

    const { data: existing } = await supabase
      .from('game_accounts')
      .select('id, verification_status')
      .eq('player_id', guard.player.id)
      .eq('game_id', gameId)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing?.verification_status === 'VERIFIED') {
      return NextResponse.json(
        { error: { code: 'ACCOUNT_LOCKED_AFTER_VERIFICATION', message: 'บัญชีนี้ยืนยันตัวตนสำเร็จแล้ว ไม่สามารถแก้ไขเองได้ กรุณาติดต่อแอดมิน' } },
        { status: 403 }
      );
    }
    if (existing?.verification_status === 'PENDING') {
      return NextResponse.json(
        { error: { code: 'VERIFICATION_ALREADY_PENDING', message: 'คำขอก่อนหน้ายังอยู่ระหว่างรอแอดมินตรวจสอบ' } },
        { status: 409 }
      );
    }

    const adminSupabase = createAdminClient();
    const tagLineNormalized = tag_line.startsWith('#') ? tag_line : `#${tag_line}`;
    const externalId = `${game_name.toLowerCase()}#${tag_line.replace(/^#/, '').toLowerCase()}`;

    const payload = {
      player_id: guard.player.id,
      game_id: gameId,
      external_id: externalId,
      game_name,
      tag_line: tagLineNormalized,
      region,
      verification_status: 'UNVERIFIED' as const,
      evidence_url: null,
      rejection_reason: null,
      reviewed_at: null,
      is_primary: true,
    };

    const { data: gameAccount, error: writeError } = existing
      ? await adminSupabase
          .from('game_accounts')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single()
      : await adminSupabase
          .from('game_accounts')
          .insert(payload)
          .select()
          .single();

    if (writeError) {
      if (writeError.code === '23505') {
        return NextResponse.json(
          { error: { code: 'RIOT_ACCOUNT_ALREADY_LINKED', message: 'Riot ID นี้ถูกเชื่อมโยงกับผู้เล่นอื่นในภูมิภาคนี้แล้ว' } },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: { code: 'WRITE_FAILED', message: writeError.message } }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'เพิ่มข้อมูล Riot ID สำเร็จ กรุณาดำเนินการอัปโหลดหลักฐานเพื่อขออนุมัติ',
        data: gameAccount,
      },
      { status: existing ? 200 : 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
