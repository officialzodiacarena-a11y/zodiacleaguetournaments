// app/api/riot/verify/route.ts
import { NextResponse } from 'next/server';
import { isRiotLoginEnabled, RIOT_LOGIN_DISABLED_MESSAGE } from '@/lib/auth/riotSlotGuard';

export async function POST(request: Request) {
  if (!isRiotLoginEnabled()) {
    return NextResponse.json({ error: RIOT_LOGIN_DISABLED_MESSAGE }, { status: 403 });
  }

  try {
    const { riotId, tagline, region } = await request.json();

    if (!riotId || !tagline) {
      return NextResponse.json({ error: 'Missing riotId or tagline' }, { status: 400 });
    }

    // จุดวางโค้ดยิงหา Riot API แบบปลอดภัยที่ฝั่ง Server
    const riotResponse = await fetch(
      `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(riotId)}/${encodeURIComponent(tagline)}`,
      {
        headers: {
          'X-Riot-Token': process.env.RIOT_PRODUCTION_KEY || '',
        },
      }
    );

    if (!riotResponse.ok) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลผู้เล่นในระบบ Riot Games' },
        { status: riotResponse.status }
      );
    }

    const data = await riotResponse.json();
    // data จะส่งคืน puuid, gameName, tagLine กลับมา
    return NextResponse.json({ success: true, athlete: data });
  // หรือแบบที่ 2: ดัก log ไว้ดูตอน debug
} catch (err) {
  console.error('Riot Auth Error:', err);
  return NextResponse.json({ error: 'Server Error' }, { status: 500 });
}
}
