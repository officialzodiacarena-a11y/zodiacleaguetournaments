import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ lobbyId: string }>;
}

// Matchmaking Waiting Room — /waiting-room/[lobbyId]
//
// สถานะจริง (2026-09-09): เช่นเดียวกับ /tournament/daily — ไม่มีตารางคิว/ห้องรอ
// อยู่จริงในระบบ (ไม่มี lobby_queue, ไม่มี waiting_room, scrim_lobbies มีแค่ใน
// เอกสารแผนงานไม่มีโค้ดใช้งานจริง) และไม่มี Sprint Spec ระบุ logic การคำนวณเวลา
// รอคอย/การจับคู่ ตามข้อกำหนดของทีมห้าม Claude สร้างตารางใหม่เอง จึงยังไม่ผูก
// backend จริง คงไว้เป็นหน้า placeholder ที่บอกสถานะตรงไปตรงมา
export default async function WaitingRoomPage({ params }: PageProps) {
  const { lobbyId } = await params;
  if (!lobbyId) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-[#07090E] text-white pt-24 pb-12 px-4 md:px-8 flex flex-col items-center font-mono">
      <div className="w-full max-w-2xl text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-black tracking-widest uppercase text-amber-400">COMING SOON</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black tracking-wider text-white mb-4">MATCHMAKING WAITING ROOM</h1>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-left text-sm text-gray-300 space-y-3">
          <p>ห้องรอประมวลผลจับคู่คิวแข่งรายวัน (Lobby ID: {lobbyId.slice(0, 8)}) ยังไม่เปิดใช้งาน</p>
          <p className="text-xs text-gray-500">
            เหตุผล: ยังไม่มีตารางฐานข้อมูลรองรับระบบคิว/ห้องรอในระบบจริง ต้องรอทีมออกแบบสเปกเพิ่มเติม
            และให้ผู้ดูแลระบบเพิ่มตารางที่จำเป็นผ่าน Supabase ก่อน (ดูรายละเอียดที่ /tournament/daily)
          </p>
        </div>
      </div>
    </div>
  );
}
