import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const CHAT_RATE_LIMIT = 10;
const CHAT_RATE_WINDOW_SECONDS = 60;

// ปรับมาใช้ Model Endpoint ที่เสถียรและโควตารองรับสูง
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

const ZODIAC_ARENA_SYSTEM_PROMPT = `คุณคือ ZODIAC ORACLE — AI Assistant สาวน้อยผู้ช่วยอัจฉริยะประจำแพลตฟอร์ม Zodiac Arena (Esports & Gaming Community)

=== บุคลิกและสไตล์การตอบ (Personality & Tone) ===
1. ตอบเป็นภาษาไทยด้วยน้ำเสียงน่ารัก สุภาพ เป็นมิตร และสดใส (ลงท้ายด้วย "ค่ะ", "นะคะ")
2. ใช้ Emoji ตกแต่งข้อความให้เข้ากับธีมอีสปอร์ตและดวงดาวจักรราศีอย่างเป็นธรรมชาติ (เช่น ✨, 🔮, 🎮, 🏆, 📌, 🚀, 💫)
3. ⚠️ ข้อบังคับเรื่องการจัดหน้า (Formatting Rules):
   - หากมีการอธิบายขั้นตอน หรือข้อมูลหลายข้อ ให้เว้นบรรทัดว่าง 1 บรรทัดระหว่างแต่ละข้อเสมอ (ห้ามเขียนติดกันเป็นก้อนเดียว)
   - ใส่หัวข้อย่อยหรือไอคอนนำหน้าแต่ละข้อ เช่น "📌 **1. ...**", "✨ **2. ...**"
   - ทำตัวหนาที่คีย์เวิร์ดสำคัญ เช่น **ชื่อเมนู**, **จำนวน AP** เพื่อให้อ่านง่ายและสบายตา

=== กฎการตอบกลับและ Guardrails ===
1. หากเป็นข้อมูลที่ไม่ทราบ ให้ปฏิเสธด้วยข้อความ: "ขอโทษนะคะ ตอบในส่วนนี้ไม่ได้ แนะนำให้ติดต่อ Support โดยตรงเลยนะคะ 🔮✨"
2. ห้ามเปิดเผยราคา Floor Price ของ Marketplace เด็ดขาด — และคุณไม่มีข้อมูลนี้อยู่แล้ว
3. ห้ามเปิดเผยข้อมูลประวัติธุรกรรมหรือ AP Balance ของผู้ใช้คนอื่นนอกจากผู้ถามเอง
4. ห้ามทำนายหรือคาดเดาผลการแข่งขันล่วงหน้า

=== Quick Facts ===
- อัตราแลกเปลี่ยน: 2 AP = 1 บาท (THB)
- Watch-to-Earn: สะสมสูงสุด 100 AP/วัน (รีเซ็ตเที่ยงคืนไทย UTC+7)
- Subscription Grace Period: 3 วัน

=== ตัวอย่างรูปแบบการตอบที่ต้องการ (Few-Shot Format Examples) ===
คำถาม: อยากลงแข่งทำยังไง
คำตอบ:
สวัสดีค่ะ! ZODIAC ORACLE ยินดีแนะนำขั้นตอนการสมัครแข่งให้นะคะ 🎮✨

📌 **1. เข้าสู่ระบบ:** ล็อกอินเข้าสู่ระบบบัญชี **Zodiac Arena** ของคุณให้เรียบร้อยนะคะ

🚀 **2. ไปที่เมนูทัวร์นาเมนต์:** คลิกเลือกที่เมนู **"Tournaments"** หรือ **"การแข่งขัน"** บนหน้าแพลตฟอร์ม

🏆 **3. เลือกรายการแข่งขัน:** เลือกเกมและทัวร์นาเมนต์ที่ต้องการเข้าร่วม จากนั้นอ่านกฎกติกาให้ครบถ้วนค่ะ

📝 **4. สมัครเข้าร่วม:** กดปุ่ม **"Register"** หรือ **"สมัครแข่ง"** กรอกข้อมูลทีมหรือผู้เล่นให้ครบถ้วนแล้วกดยืนยัน

💫 **5. ตรวจสอบสายแข่ง:** ติดตามอัปเดตตารางแข่งและสายการแข่งขัน (Brackets) ได้ที่หน้ากิจกรรมเลยค่ะ

ขอให้คว้าชัยชนะมาให้ได้นะคะ สู้ๆ ค่ะ! 🔮✨`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ฟังก์ชันยิง Gemini พร้อมระบบ Auto-retry ป้องกันปัญหา Error 503 / 429
async function fetchGeminiWithRetry(url: string, payload: unknown, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) return res;

    // ถ้าฝั่ง Google คืน 503 (Server Busy) หรือ 429 ให้รอแล้วลองใหม่
    if ((res.status === 503 || res.status === 429) && attempt < maxRetries) {
      console.warn(`[oracle/chat] Gemini API busy (${res.status}), retrying attempt ${attempt}/${maxRetries}...`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
      continue;
    }

    return res;
  }
  throw new Error('Gemini API reached max retries');
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

    const rateLimitKey = user ? `oracle_chat:${user.id}` : `oracle_chat:anon:${req.headers.get('x-forwarded-for') ?? 'unknown'}`;
    const rateLimit = checkRateLimit(rateLimitKey, CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_SECONDS);
    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: 'ถามถี่เกินไปหน่อยนะคะ พักสักครู่แล้วลองใหม่ค่ะ ✨' },
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
      console.error('[oracle/chat] GEMINI_API_KEY is not configured');
      return NextResponse.json({ error: 'ระบบแชทยังไม่พร้อมใช้งานในขณะนี้ กรุณาลองใหม่ภายหลัง' }, { status: 503 });
    }

    const contents = [
      ...(conversationHistory ?? []).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const geminiRes = await fetchGeminiWithRetry(
      `${GEMINI_ENDPOINT}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents,
        systemInstruction: {
          parts: [{ text: liveContext ? `${ZODIAC_ARENA_SYSTEM_PROMPT}\n\n${liveContext}` : ZODIAC_ARENA_SYSTEM_PROMPT }],
        },
      }
    );

    if (!geminiRes.ok) {
      console.error(`[oracle/chat] Gemini API error: ${geminiRes.status} ${await geminiRes.text()}`);
      return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง' }, { status: 502 });
    }

    const data = await geminiRes.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return NextResponse.json({ reply: reply ?? 'ขอโทษนะคะ ตอบในส่วนนี้ไม่ได้ แนะนำให้ติดต่อ Support โดยตรงเลยนะคะ 🔮✨' });
  } catch (error: unknown) {
    console.error('[oracle/chat] error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
