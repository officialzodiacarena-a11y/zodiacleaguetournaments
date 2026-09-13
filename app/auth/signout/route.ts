import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  
  // 1. เคลียร์ Session จาก Supabase
  await supabase.auth.signOut();

  // 2. Redirect กลับหน้า Login แบบสมบูรณ์
  return NextResponse.redirect(new URL('/login', request.url), {
    status: 302,
  });
}