// app/admin/tournaments/page.tsx
// เลือกทัวร์ก่อนเข้า "จัดสายการแข่งขัน" — สิทธิ์ ADMIN / SUPER_ADMIN / REFEREE
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireBracketAdminPage } from '@/lib/admin/requireBracketAdminPage';

export const dynamic = 'force-dynamic';

interface TournamentRow {
  id: string;
  name: string;
  status: string;
  max_teams: number | null;
  registration_closes_at: string | null;
}

function formatThai(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' });
}

export default async function AdminTournamentsPage() {
  await requireBracketAdminPage();

  const supabase = await createClient();
  const { data } = (await supabase
    .from('tournaments')
    .select('id, name, status, max_teams, registration_closes_at')
    .order('created_at', { ascending: false })) as unknown as { data: TournamentRow[] | null };

  const tournaments = data ?? [];

  return (
    <div className="min-h-screen bg-[#0D0E1A] text-[#e9e9ed] font-sans p-4 sm:p-6 md:p-8">
      <div className="max-w-[900px] mx-auto">
        <Link href="/admin" className="text-xs font-bold text-[#9397ab] hover:text-white">← กลับหน้าจัดการ</Link>
        <h1 className="text-lg font-extrabold tracking-wide text-white mt-3">จัดสายการแข่งขัน</h1>
        <p className="text-xs text-[#9397ab] mt-1 mb-5">เลือกทัวร์ที่ต้องการสร้างสาย จัดทีมลงสาย และเปิดสายแข่ง</p>

        {tournaments.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#1A1C2E] p-6 text-center text-sm text-[#9397ab]">
            ยังไม่มีทัวร์นาเมนต์
          </div>
        ) : (
          <ul className="space-y-3">
            {tournaments.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/admin/tournaments/${t.id}/bracket`}
                  className="block rounded-xl border border-white/10 bg-[#1A1C2E] p-4 hover:border-[#E8B429]/50 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-extrabold text-white">{t.name}</span>
                    <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#9397ab]">
                      {t.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#9397ab]">
                    <span>ปิดรับสมัคร: <b className="text-[#cfd3e5]">{formatThai(t.registration_closes_at)}</b></span>
                    <span>รับสูงสุด: <b className="text-[#cfd3e5]">{t.max_teams ?? '-'}</b> ทีม</span>
                  </div>
                  <div className="mt-3 text-[11px] font-bold text-[#E8B429]">จัดสายการแข่งขัน →</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
