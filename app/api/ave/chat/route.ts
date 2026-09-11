import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const CHAT_RATE_LIMIT = 10;
const CHAT_RATE_WINDOW_SECONDS = 60;

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const ZODIAC_ARENA_SYSTEM_PROMPT = `คุณคือ AVE — AI Assistant ประจำ Zodiac Arena แพลตฟอร์มแข่งขัน Esports อันดับ 1 ของไทย

=== กฎการตอบกลับและ Guardrails ===
1. ตอบเป็นภาษาไทยด้วยน้ำเสียงเป็นกันเอง สนุกสนาน สไตล์ Cyberpunk Esports
2. หากเป็นข้อมูลที่ไม่ทราบ ให้ปฏิเสธด้วยข้อความ: "ขอโทษนะคะ ตอบในส่วนนี้ไม่ได้ แนะนำให้ติดต่อ Support โดยตรงเลยนะคะ"
3. ห้ามเปิดเผยราคา Floor Price ของ Marketplace เด็ดขาด — และคุณไม่มีข้อมูลนี้อยู่แล้ว
4. ห้ามเปิดเผยข้อมูลประวัติธุรกรรมหรือ AP Balance ของผู้ใช้คนอื่นนอกจากผู้ถามเอง
5. ห้ามทำนายหรือคาดเดาผลการแข่งขันล่วงหน้า

=== Quick Facts ===
- อัตราแลกเปลี่ยน: 2 AP = 1 บาท (THB)
- Watch-to-Earn: สะสมสูงสุด 100 AP/วัน (รีเซ็ตเที่ยงคืนไทย UTC+7)
- Subscription Grace Period: 3 วัน`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function buildLiveContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string | null,
  message: string
): Promise<string> {
  const context: string[] = [];

  if (userId && /แต้ม|ap\b|balance/i.test(message)) {
    const { data: player } = await supabase
      .from('players')
      .select('ap_balance, display_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (player) {
      context.push(`[Live Data] ผู้เล่น ${player.display_name} มีแต้ม AP คงเหลือ = ${player.ap_balance} AP`);
    }
  }

  if (/sinopec|สินค้า|แลก|น้ำมัน|คูปอง/i.test(message)) {
    const { data: items } = await supabase
      .from('store_items')
      .select('name, store_item_variants(name, price_ap)')
      .eq('partner_brand', 'SINOPEC')
      .eq('is_active', true)
      .limit(5);

    if (items?.length) {
      const itemList = (
        items as unknown as { name: string; store_item_variants: { name: string; price_ap: number }[] }[]
      )
        .flatMap((item) =>
          (item.store_item_variants ?? []).map((v) => `${item.name} - ${v.name} (${v.price_ap} AP)`)
        )
        .join(', ');
      if (itemList) context.push(`[Live Data] สินค้า SINOPEC ที่พร้อมแลก: ${itemList}`);
    }
  }

  if (/tournament|ทัวร์|แข่ง/i.test(message)) {
    const { data: tournaments } = await supabase
      .from('tournaments')
      .select('name, start_at')
      .gt('start_at', new Date().toISOString())
      .order('start_at', { ascending: true })
      .limit(3);

    if (tournaments?.length) {
      const list = tournaments.map((t) => `${t.name} (${new Date(t.start_at).toLocaleDateString('th-TH')})`).join(', ');
      context.push(`[Live Data] ทัวร์นาเมนต์ที่กำลังจะมา: ${list}`);
    }
  }

  return context.join('\n');
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const rateLimitKey = user ? `ave_chat:${user.id}` : `ave_chat:anon:${req.headers.get('x-forwarded-for') ?? 'unknown'}`;
    const rateLimit = checkRateLimit(rateLimitKey, CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_SECONDS);
    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: 'ถามถี่เกินไปหน่อยนะคะ พักสักครู่แล้วลองใหม่ค่ะ' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    const { message, conversationHistory } = (await req.json()) as {
      message?: string;
      conversationHistory?: ChatMessage[];
    };

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'กรุณาระบุข้อความ' }, { status: 400 });
    }

    const liveContext = await buildLiveContext(supabase, user?.id ?? null, message);

    if (!process.env.GEMINI_API_KEY) {
      console.error('[ave/chat] GEMINI_API_KEY is not configured');
      return NextResponse.json({ error: 'ระบบแชทยังไม่พร้อมใช้งานในขณะนี้ กรุณาลองใหม่ภายหลัง' }, { status: 503 });
    }

    const contents = [
      ...(conversationHistory ?? []).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: liveContext ? `${ZODIAC_ARENA_SYSTEM_PROMPT}\n\n${liveContext}` : ZODIAC_ARENA_SYSTEM_PROMPT }],
        },
      }),
    });

    if (!geminiRes.ok) {
      console.error(`[ave/chat] Gemini API error: ${geminiRes.status} ${await geminiRes.text()}`);
      return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง' }, { status: 502 });
    }

    const data = await geminiRes.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return NextResponse.json({ reply: reply ?? 'ขอโทษนะคะ ตอบในส่วนนี้ไม่ได้ แนะนำให้ติดต่อ Support โดยตรงเลยนะคะ' });
  } catch (error: unknown) {
    console.error('[ave/chat] error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
