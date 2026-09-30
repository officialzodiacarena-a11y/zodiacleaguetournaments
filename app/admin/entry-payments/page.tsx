// app/admin/entry-payments/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireEntryFeeReviewerPage } from '@/lib/admin/requireEntryFeeReviewerPage';
import { EntryPaymentActions } from '@/components/admin/EntryPaymentActions';

interface PageProps {
  searchParams: Promise<{ tournament?: string }>;
}

interface TournamentOption {
  id: string;
  name: string;
  max_teams: number;
  status: string;
}

interface PaymentRow {
  id: string;
  team_id: string;
  amount_thb: number;
  status: string;
  expires_at: string;
  slip_path: string | null;
  slip_trans_ref: string | null;
  slip_trans_at: string | null;
  slip_amount_thb: number | null;
  verify_method: string | null;
  last_check_code: string | null;
  last_check_message: string | null;
  reject_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  teams?: { name: string; tag: string } | { name: string; tag: string }[] | null;
}

const STATUS_ORDER: Record<string, number> = {
  SLIP_UPLOADED: 0,
  AWAITING_PAYMENT: 1,
  APPROVED: 2,
  REJECTED: 3,
};

function teamOf(row: PaymentRow): { name: string; tag: string } | null {
  if (Array.isArray(row.teams)) return row.teams[0] ?? null;
  return row.teams ?? null;
}

export default async function AdminEntryPaymentsPage({ searchParams }: PageProps) {
  await requireEntryFeeReviewerPage();

  const supabase = await createClient();
  const { tournament: tournamentIdParam } = await searchParams;

  const { data: tournaments } = (await supabase
    .from('tournaments')
    .select('id, name, max_teams, status')
    .gt('entry_fee_thb', 0)
    .order('created_at', { ascending: false })) as unknown as { data: TournamentOption[] | null };

  const tournamentList = tournaments ?? [];

  if (tournamentList.length === 0) {
    return (
      <div className="min-h-screen bg-[#0D0E1A] text-[#e9e9ed] font-sans p-8">
        <div className="rounded-xl border border-white/10 bg-[#1A1C2E] p-6 text-center text-sm text-[#9397ab]">
          ยังไม่มีทัวร์ที่เก็บค่าสมัคร
        </div>
      </div>
    );
  }

  const selectedTournament = tournamentList.find((t) => t.id === tournamentIdParam) ?? tournamentList[0];

  const { data: payments } = (await supabase
    .from('tournament_entry_payments')
    .select(
      'id, team_id, amount_thb, status, expires_at, slip_path, slip_trans_ref, slip_trans_at, slip_amount_thb, verify_method, last_check_code, last_check_message, reject_reason, created_at, reviewed_at, teams(name, tag)'
    )
    .eq('tournament_id', selectedTournament.id)) as unknown as { data: PaymentRow[] | null };

  const rows = (payments ?? []).slice().sort((a, b) => {
    const orderDiff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (orderDiff !== 0) return orderDiff;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const statusCounts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  const { count: seatCount } = await supabase
    .from('tournament_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', selectedTournament.id)
    .neq('status', 'REJECTED');

  return (
    <div className="min-h-screen bg-[#0D0E1A] text-[#e9e9ed] font-sans p-6 md:p-8">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="text-lg font-extrabold tracking-wide text-white mb-4">ตรวจค่าสมัครทัวร์</h1>

        <div className="flex flex-wrap gap-2 mb-4">
          {tournamentList.map((t) => (
            <Link
              key={t.id}
              href={`/admin/entry-payments?tournament=${t.id}`}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                t.id === selectedTournament.id
                  ? 'border-[#E8B429]/50 bg-[#E8B429]/15 text-[#E8B429]'
                  : 'border-white/10 bg-[#1A1C2E] text-[#9397ab] hover:border-white/30'
              }`}
            >
              {t.name}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-[#1A1C2E] p-4 mb-3 text-xs text-[#cfd3e5]">
          <span>รอชำระ: <b className="text-white">{statusCounts.AWAITING_PAYMENT ?? 0}</b></span>
          <span>รอตรวจ: <b className="text-white">{statusCounts.SLIP_UPLOADED ?? 0}</b></span>
          <span>อนุมัติแล้ว: <b className="text-white">{statusCounts.APPROVED ?? 0}</b></span>
          <span>ยกเลิก: <b className="text-white">{statusCounts.REJECTED ?? 0}</b></span>
          <span className="ml-auto">
            ที่นั่ง: <b className="text-white">{seatCount ?? 0}</b> / {selectedTournament.max_teams}
          </span>
        </div>

        <div className="rounded-xl border border-[#eab308]/30 bg-[#eab308]/10 p-3 mb-4 text-xs font-bold text-[#fbbf24]">
          ⚠️ ก่อนกดอนุมัติ ต้องเช็คว่าเงินเข้าบัญชีบริษัทจริงในแอป K BIZ ทุกครั้ง · ดูแค่รูปสลิปไม่พอ
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-xs text-left">
            <thead className="bg-white/5 text-[#75798c] uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2">ทีม</th>
                <th className="px-3 py-2">ยอด</th>
                <th className="px-3 py-2">สถานะ</th>
                <th className="px-3 py-2">วิธีตรวจ</th>
                <th className="px-3 py-2">ผลตรวจล่าสุด</th>
                <th className="px-3 py-2">เลขที่รายการ</th>
                <th className="px-3 py-2">เวลาโอน</th>
                <th className="px-3 py-2">เหตุผลแอดมิน</th>
                <th className="px-3 py-2">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row) => {
                const team = teamOf(row);
                return (
                  <tr key={row.id}>
                    <td className="px-3 py-2 font-bold text-white">{team ? `${team.name} [${team.tag}]` : row.team_id}</td>
                    <td className="px-3 py-2">{Number(row.amount_thb).toFixed(2)} บาท</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.verify_method ?? '-'}</td>
                    <td className="px-3 py-2">
                      {row.last_check_code ? `${row.last_check_code} · ${row.last_check_message ?? ''}` : '-'}
                    </td>
                    <td className="px-3 py-2">{row.slip_trans_ref ?? '-'}</td>
                    <td className="px-3 py-2">{row.slip_trans_at ? new Date(row.slip_trans_at).toLocaleString('th-TH') : '-'}</td>
                    <td className="px-3 py-2">{row.reject_reason ?? '-'}</td>
                    <td className="px-3 py-2">
                      <EntryPaymentActions paymentId={row.id} status={row.status} hasSlip={!!row.slip_path} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
