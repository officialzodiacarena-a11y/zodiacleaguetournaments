import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Daily Quest & Affiliate V6.02 — Gap 1 fix: capture ?ref=CODE on any page hit
// into a cookie so it survives the OAuth provider round-trip (the ?ref= query
// param on the original landing page is gone by the time /auth/callback runs).
// app/auth/callback/route.ts reads this cookie to bind the referral.
const AFFILIATE_REF_COOKIE = 'zodiac_affiliate_ref';
const AFFILIATE_REF_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function middleware(request: NextRequest) {
  const refCode = request.nextUrl.searchParams.get('ref')?.trim();
  const response = NextResponse.next();

  if (refCode) {
    response.cookies.set(AFFILIATE_REF_COOKIE, refCode, {
      maxAge: AFFILIATE_REF_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api/|favicon.ico).*)'],
};
