import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const isMock = process.env.RIOT_MOCK_MODE === 'true';

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  let puuid = '';

  if (isMock) {
    // ข้อมูลจำลองสำหรับเทสต์ระบบ
    puuid = 'mock-puuid-zodiac-test-12345';
  } else {
    // โหมด Production: แลก Token กับ Riot
    const tokenRes = await fetch('https://auth.riotgames.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.RIOT_CLIENT_ID}:${process.env.RIOT_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.RIOT_REDIRECT_URI || '',
      }),
    });

    const tokenData = await tokenRes.json();

    // ดึง Userinfo เพื่อเอา PUUID
    const userinfoRes = await fetch('https://auth.riotgames.com/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userinfoRes.json();
    puuid = userData.sub;
  }

  // ส่งต่อ PUUID ไปบันทึกลงฐานข้อมูล Supabase / จัดการ Session
  // ตัวอย่าง: Redirect กลับไปหน้า Dashboard
  return NextResponse.redirect(new URL(`/dashboard?riot_puuid=${puuid}`, request.url));
}
