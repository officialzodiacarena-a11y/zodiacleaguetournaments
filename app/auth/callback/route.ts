import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
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
