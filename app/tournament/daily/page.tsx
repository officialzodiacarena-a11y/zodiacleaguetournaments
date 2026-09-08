import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Daily Setup & Role Queue — /tournament/daily
//
// สถานะจริง (2026-09-09): หน้านี้ยังต่อ backend จริงไม่ได้ เพราะไม่มีตาราง
// สำหรับคิวแข่งรายวัน/การเลือกตำแหน่ง Pos 1-5 อยู่จริงในระบบเลย (ตรวจแล้วทั้ง
// migrations และโค้ด API ทั้งหมด — scrim_lobbies ที่ระบุใน ZA_Master_Brief.md
// มีแค่ในเอกสารแผนงาน ไม่มีโค้ด/ตารางใช้งานจริงที่ไหนเลย) และ Master Blue Print
// ก็มีแค่คำอธิบายบรรทัดเดียวโดยไม่มี Sprint Spec ระบุ business logic ละเอียด
// (queue matching algorithm, role slot rules, timeout handling ฯลฯ)
//
// ตามข้อกำหนดของทีม: ห้าม Claude สร้างตารางใหม่เอง ต้องให้พี่หยัดเพิ่มเองผ่าน
// Supabase dashboard เท่านั้น จึงยังไม่ implement การ query/insert จริง — คงไว้
// เป็นหน้า placeholder ที่บอกสถานะตรงไปตรงมา แทนที่จะปลอมข้อมูล mock ขึ้นมา
export default async function DailySetupPage() {
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
        <h1 className="text-2xl md:text-3xl font-black tracking-wider text-white mb-4">DAILY SETUP & ROLE QUEUE</h1>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-left text-sm text-gray-300 space-y-3">
          <p>
            ระบบจับคู่คิวแข่งรายวัน (เลือกตำแหน่งความถนัด Pos 1-5 → เข้าคิวรอ → เข้าห้องดราฟต์) ยังไม่เปิดใช้งาน
          </p>
          <p className="text-xs text-gray-500">
            เหตุผล: ยังไม่มีตารางฐานข้อมูลรองรับระบบนี้ในระบบจริง และยังไม่มี Sprint Spec
            ที่ระบุ business logic (กติกาจับคู่, การจัดการ timeout, เงื่อนไข role slot) ไว้
            ต้องรอทีมออกแบบสเปกเพิ่มเติม และให้ผู้ดูแลระบบเพิ่มตารางที่จำเป็นผ่าน Supabase ก่อน
          </p>
        </div>
      </div>
    </div>
  );
}
