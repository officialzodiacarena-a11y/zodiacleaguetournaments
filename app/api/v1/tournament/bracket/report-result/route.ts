// app/api/v1/tournament/bracket/report-result/route.ts
// ปิดการใช้งานถาวร (410 Gone): route เดิมใช้ admin client เขียน bracket_nodes / matches โดยไม่ตรวจสิทธิ์เลย
// ผลแมตช์ให้ใช้ POST /api/v1/matches/[id]/result (ตรวจ role REFEREE / ADMIN / SUPER_ADMIN) แทน
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: { code: 'GONE', message: 'ใช้ /api/v1/matches/[id]/result แทน' } },
    { status: 410 }
  );
}
