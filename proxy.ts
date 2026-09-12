// proxy.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // 1. Server-side Session Verification (Zero-Trust Security)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 2. รายการเส้นทางที่ต้องล็อกอินก่อนเข้าใช้งาน (Protected Routes)
  const protectedRoutes = [
    '/dashboard',
    '/subscribe',
    '/admin',
    '/tournament/daily',
    '/tournament/register',
    '/profile',
  ];

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isLoginPage = pathname === '/login';

  // 3. [Case NAV-01 & NAV-03]: ผู้ใช้ล็อกอินแล้วเข้า /login -> ดีดไป /dashboard หรือ return path
  if (isLoginPage && user) {
    const redirectUrl = request.nextUrl.clone();
    const returnPath = request.nextUrl.searchParams.get('redirect');

    // ป้องกัน Open Redirect Attack: ต้องขึ้นต้นด้วย / และไม่ใช่ // (Protocol-relative URL)
    if (returnPath && returnPath.startsWith('/') && !returnPath.startsWith('//')) {
      redirectUrl.pathname = returnPath;
      redirectUrl.search = '';
    } else {
      redirectUrl.pathname = '/dashboard';
      redirectUrl.search = '';
    }

    return NextResponse.redirect(redirectUrl);
  }

  // 4. [Case NAV-02]: Guest พยายามเข้า Protected Routes -> ดีดไป /login พร้อมแนบ redirect param
  if (isProtectedRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);

    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * กรองไฟล์ Static, รูปภาพ, API Routes ที่ไม่ต้องการให้ Edge Guard ขัดขวาง
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
