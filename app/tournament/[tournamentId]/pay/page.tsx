// app/tournament/[tournamentId]/pay/page.tsx
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { readEntryFeeEnv } from '@/lib/payments/slipok';
import { CopyAccountButton } from '@/components/tournament/CopyAccountButton';
import { PaymentCountdown } from '@/components/tournament/PaymentCountdown';
import { EntrySlipUploader } from '@/components/tournament/EntrySlipUploader';

interface PageProps {
  params: Promise<{ tournamentId: string }>;
}

interface TournamentRow {
  id: string;
  name: string;
  entry_fee_thb: number | null;
  season_id: string | null;
}

interface PaymentRow {
  id: string;
  amount_thb: number;
  status: string;
  expires_at: string;
  last_check_code: string | null;
  last_check_message: string | null;
  reject_reason: string | null;
}

function formatAccountNo(digits: string): string {
  if (digits.length !== 10) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 4)}-${digits.slice(4, 9)}-${digits.slice(9)}`;
}

export default async function TournamentPayPage({ params }: PageProps) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: actor } = await supabase.from('players').select('id').eq('user_id', user.id).single();
  if (!actor) notFound();

  const { data: tournament } = (await supabase
    .from('tournaments')
    .select('id, name, entry_fee_thb, season_id')
    .eq('id', tournamentId)
    .maybeSingle()) as unknown as { data: TournamentRow | null };
  if (!tournament) notFound();

  const { data: season } = tournament.season_id
    ? await supabase.from('seasons').select('circuit_id').eq('id', tournament.season_id).maybeSingle()
    : { data: null };
  const { data: circuit } = season?.circuit_id
    ? await supabase.from('circuits').select('game_id').eq('id', season.circuit_id).maybeSingle()
    : { data: null };
  const gameId = circuit?.game_id ?? null;

  const { data: team } = gameId
    ? await supabase
        .from('teams')
        .select('id, name')
        .eq('captain_id', actor.id)
        .eq('game_id', gameId)
        .is('deleted_at', null)
        .maybeSingle()
    : { data: null };

  if (!team) {
    return (
      <div className="min-h-screen bg-[#0D0E1A] text-[#e9e9ed] font-sans pb-20">
        <main className="max-w-[640px] mx-auto px-6 pt-9">
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-center text-sm text-rose-300">
            เฉพาะกัปตันทีมเท่านั้นที่ชำระค่าสมัครได้
          </div>
        </main>
      </div>
    );
  }

  const { data: registration } = await supabase
    .from('tournament_registrations')
    .select('id, status')
    .eq('tournament_id', tournamentId)
    .eq('team_id', team.id)
    .maybeSingle();

  if (!registration) {
    redirect(`/tournament/${tournamentId}/register`);
  }

  const { data: payment } = (await supabase
    .from('tournament_entry_payments')
    .select('id, amount_thb, status, expires_at, last_check_code, last_check_message, reject_reason')
    .eq('registration_id', registration.id)
    .maybeSingle()) as unknown as { data: PaymentRow | null };

  if (!payment) {
    redirect(`/tournament/${tournamentId}/register`);
  }

  const { bank } = readEntryFeeEnv();

  return (
    <div className="min-h-screen bg-[#0D0E1A] text-[#e9e9ed] font-sans pb-20 select-none">
      <main className="max-w-[640px] mx-auto px-6 pt-9">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E8B429]/25 bg-gradient-to-r from-[#E8B429]/10 to-[#9184d9]/10 px-5 py-3 mb-7">
          <span className="text-xs font-extrabold tracking-widest text-[#E8B429] uppercase">{tournament.name}</span>
          <span className="text-[#E8B429]/30">·</span>
          <span className="text-xs text-[#cfd3e5]">ชำระค่าสมัคร</span>
          <span className="text-[#E8B429]/30">·</span>
          <span className="text-xs font-semibold tracking-wider text-[#cfd3e5]">ทีม: {team.name}</span>
        </div>

        <div className="rounded-xl border border-[#E8B429]/25 bg-[#1A1C2E] p-6 mb-6 text-center">
          <div className="text-[11px] font-bold tracking-widest text-[#75798c] uppercase mb-2">ยอดที่ต้องโอน</div>
          <div className="text-4xl font-black text-[#E8B429]">{Number(payment.amount_thb).toFixed(2)} บาท</div>
          <div className="text-xs text-[#fbbf24] mt-2">โอนยอดนี้ให้ตรงทุกสตางค์</div>
        </div>

        {bank ? (
          <div className="rounded-xl border border-[#9184d9]/25 bg-[#1A1C2E] p-4 mb-6">
            <div className="text-[11px] font-bold tracking-widest text-[#75798c] uppercase mb-2">บัญชีรับโอน</div>
            <div className="text-sm text-[#cfd3e5] mb-1">ธนาคาร {bank.name}</div>
            <div className="text-sm text-[#cfd3e5] mb-1">ชื่อบัญชี {bank.accountName}</div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-lg font-black tracking-wider text-white">
                {formatAccountNo(bank.accountNo)}
              </span>
              <CopyAccountButton digits={bank.accountNo} />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[#eab308]/30 bg-[#eab308]/5 p-4 mb-6 text-sm text-[#fbbf24] text-center">
            ยังไม่เปิดรับชำระออนไลน์ กรุณาติดต่อแอดมิน
          </div>
        )}

        {payment.status === 'AWAITING_PAYMENT' && (
          <div className="flex flex-col gap-3">
            <PaymentCountdown expiresAt={payment.expires_at} />
            {payment.reject_reason && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-300">
                แอดมินขอให้ส่งสลิปใหม่: {payment.reject_reason}
              </div>
            )}
            {payment.last_check_message && (
              <div className="text-xs text-[#75798c]">ผลตรวจครั้งล่าสุด: {payment.last_check_message}</div>
            )}
            {bank && <EntrySlipUploader paymentId={payment.id} />}
          </div>
        )}

        {payment.status === 'SLIP_UPLOADED' && (
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-6 text-center text-sm text-sky-300">
            ได้รับสลิปแล้ว · รอแอดมินตรวจ
          </div>
        )}

        {payment.status === 'APPROVED' && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center text-sm text-emerald-300">
            <div className="mb-3">ชำระแล้ว · สมัครสำเร็จ ✅</div>
            <Link
              href={`/tournament/${tournamentId}/register`}
              className="inline-block rounded-lg border border-emerald-500/40 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/10"
            >
              กลับหน้าสมัคร
            </Link>
          </div>
        )}

        {payment.status === 'REJECTED' && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-center text-sm text-rose-300">
            การสมัครถูกยกเลิก: {payment.reject_reason ?? ''}
          </div>
        )}
      </main>
    </div>
  );
}
