// app/api/health/speed/route.ts
// ใช้วัด ping + ความเร็ว (kbps) จากเครื่องคนคุม Stream Hub ถึงเซิร์ฟเวอร์เรา
// kb=0 → วัด ping (ตอบกลับเปล่าๆ), kb=1..256 → ส่ง payload ขนาดนั้นกลับไปให้จับเวลาดาวน์โหลด
export const dynamic = 'force-dynamic';

const MAX_KB = 256;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kb = Math.max(0, Math.min(MAX_KB, parseInt(searchParams.get('kb') || '0', 10) || 0));

  return new Response(new Uint8Array(kb * 1024), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
