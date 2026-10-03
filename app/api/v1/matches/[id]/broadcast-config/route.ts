import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireBroadcastRole } from '@/lib/auth/require-broadcast-role';
import { asUpdate } from '@/types/supabase-helpers';

// ตั้งค่าการถ่ายทอดของแมตช์ใน matches.format_config (merge — ไม่ทับคีย์อื่นเช่น overlay_scene / observer_token_hash)
//   live_source : แหล่งภาพของ Stream Hub (OFF / A / B / C) — ดู lib/stream-hub/live-source.ts
//   lobby_code  : รหัสห้องในเกม
// เดิมหน้าเว็บเขียน format_config ตรงจากเบราว์เซอร์ ซึ่ง RLS บล็อกเงียบๆ (ไม่ error แต่ไม่บันทึก) — ย้ายมาทำฝั่งเซิร์ฟเวอร์ที่ตรวจสิทธิ์
const PlaylistItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().max(128).optional(),
  url: z.string().trim().max(2048),
});

const BodySchema = z
  .object({
    live_source: z
      .object({
        mode: z.enum(['OFF', 'A', 'B', 'C']),
        url: z.string().trim().max(2048),
        playlist: z.array(PlaylistItemSchema).optional(),
        active_index: z.number().int().min(0).optional(),
        video_visible: z.boolean().optional(),
        volume: z.number().min(0).max(100).optional(),
        muted: z.boolean().optional(),
      })
      .refine(
        (v) => v.mode === 'OFF' || v.url === '' || /^https?:\/\//i.test(v.url) || /^[a-zA-Z0-9_-]{11}$/.test(v.url),
        { message: 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https:// หรือ YouTube Video ID' }
      )
      .optional(),
    lobby_code: z.string().trim().min(1).max(32).optional(),
  })
  .refine((b) => b.live_source !== undefined || b.lobby_code !== undefined, { message: 'ต้องส่ง live_source หรือ lobby_code' });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: matchId } = await params;
    const supabase = await createClient();

    const auth = await requireBroadcastRole(supabase);
    if (!auth.ok) return auth.response;

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ขาเข้าไม่ถูกต้อง' } }, { status: 400 });
    }

    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง' } },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: match, error: findError } = await admin.from('matches').select('id, format_config').eq('id', matchId).maybeSingle();
    if (findError) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: findError.message } }, { status: 500 });
    }
    if (!match) {
      return NextResponse.json({ error: { code: 'MATCH_NOT_FOUND', message: 'ไม่พบข้อมูลแมตช์' } }, { status: 404 });
    }

    const current = (match.format_config as Record<string, unknown> | null) ?? {};
    const next: Record<string, unknown> = { ...current };
    if (parsed.data.live_source) {
      const { mode, url, playlist, active_index, video_visible, volume, muted } = parsed.data.live_source;
      const curLive = (current.live_source as Record<string, unknown> | undefined) ?? {};
      next.live_source =
        mode === 'OFF'
          ? { mode: 'OFF', url: '', playlist: [], active_index: 0, video_visible: true, volume: 100, muted: false }
          : {
              mode,
              url,
              playlist: playlist ?? curLive.playlist ?? [],
              active_index: typeof active_index === 'number' ? active_index : (curLive.active_index ?? 0),
              video_visible: typeof video_visible === 'boolean' ? video_visible : (curLive.video_visible ?? true),
              volume: typeof volume === 'number' ? volume : (curLive.volume ?? 100),
              muted: typeof muted === 'boolean' ? muted : (curLive.muted ?? false),
            };
    }
    if (parsed.data.lobby_code) next.lobby_code = parsed.data.lobby_code.toUpperCase();

    const { error } = await admin
      .from('matches')
      .update(asUpdate<'matches'>({ format_config: next, updated_at: new Date().toISOString() }))
      .eq('id', matchId);
    if (error) {
      return NextResponse.json({ error: { code: 'TRANSACTION_FAILED', message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ live_source: next.live_source ?? null, lobby_code: next.lobby_code ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
