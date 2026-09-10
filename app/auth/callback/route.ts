import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/profile';

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ Supabase ENV variables are missing in route.ts!');
    return NextResponse.redirect(`${origin}/?error=missing_env`);
  }

  if (code) {
    try {
      // รองรับทั้ง Next.js 14 และ Next.js 15
      const cookieStore = await Promise.resolve(cookies());

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                );
              } catch {
                // Server Component context
              }
            },
          },
        }
      );

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // TikTok (และผู้ให้บริการอื่นที่ไม่ส่ง email มาด้วย) จะสร้าง auth.users
        // แถวที่ email เป็น null — เติมอีเมลสังเคราะห์ให้ก่อนที่ requestอื่นจะพึ่งพา
        // ค่า email นี้ต่อ ใช้ admin client (service role) เพื่อ set email_confirm
        // ตรงๆ โดยไม่ยิงอีเมลยืนยันไปยังที่อยู่ปลอมนี้
        const user = data.user;
        if (user && !user.email) {
          const provider = user.app_metadata?.provider ?? 'oauth';
          const syntheticEmail = `${provider}-${user.id}@users.noreply.zodiacarena.local`;
          try {
            const admin = createAdminClient();
            const { error: backfillError } = await admin.auth.admin.updateUserById(user.id, {
              email: syntheticEmail,
              email_confirm: true,
            });
            if (backfillError) {
              console.error('❌ Failed to backfill missing OAuth email:', backfillError.message);
            }
          } catch (backfillErr) {
            console.error('❌ Unexpected error backfilling OAuth email:', backfillErr);
          }
        }
        return NextResponse.redirect(`${origin}${next}`);
      } else {
        console.error('❌ Supabase Exchange Error:', error.message);
      }
    } catch (err) {
      console.error('❌ Unexpected Callback Crash:', err);
    }
  }

  // หากเกิดข้อผิดพลาด ให้กลับไปหน้าหลักพร้อม Error
  return NextResponse.redirect(`${origin}/?error=auth_failed`);
}
