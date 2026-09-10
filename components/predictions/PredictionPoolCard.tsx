'use client';

import { useState } from 'react';
import type { PredictionPoolStatus, PredictionTicketTier } from '@/types/predictions';

// UI/UX Spec status: MASTER_SPEC___Stage2_P7_UI_UX.md is "⏳ Pending Prototype"
// (พี่ศิลา ยังไม่ได้ส่ง Prototype A/B/C ให้อลิสเลือก) — implement ตาม Design
// Tokens ที่ให้มาครบ แต่คาดว่าต้องมีรอบ polish อีกครั้งหลัง sign-off

const STATUS_BADGE: Record<PredictionPoolStatus, { label: string; className: string }> = {
  OPEN: { label: 'OPEN', className: 'bg-[#4CAF50]/20 text-[#4CAF50]' },
  LOCKED: { label: 'LOCKED', className: 'bg-[#F59E0B]/20 text-[#F59E0B]' },
  SETTLED: { label: 'SETTLED', className: 'bg-[#6B7280]/20 text-[#6B7280]' },
  SETTLEMENT_ERROR: { label: 'ERROR', className: 'bg-[#E3322F]/20 text-[#E3322F]' },
  VOIDED: { label: 'VOIDED', className: 'bg-[#E3322F]/20 text-[#E3322F]' },
  JACKPOT_CARRIED: { label: 'JACKPOT CARRIED', className: 'bg-[#C5BE93]/20 text-[#C5BE93]' },
};

interface PredictionPoolCardProps {
  poolId: string;
  teamAName: string;
  teamBName: string;
  totalApPoolA: number;
  totalApPoolB: number;
  bonusPoolAp: number;
  houseFeePercent: number;
  status: PredictionPoolStatus;
  isGrandFinal?: boolean;
  onBuyTicket?: (teamId: 'A' | 'B') => void;
}

export function PredictionPoolCard({
  totalApPoolA,
  totalApPoolB,
  bonusPoolAp,
  houseFeePercent,
  status,
  teamAName,
  teamBName,
  isGrandFinal,
  onBuyTicket,
}: PredictionPoolCardProps) {
  const total = totalApPoolA + totalApPoolB;
  const pctA = total > 0 ? (totalApPoolA / total) * 100 : 50;
  const badge = STATUS_BADGE[status];

  return (
    <div className={`rounded-xl bg-[#1A1C2E] p-4 ${status === 'SETTLED' ? 'opacity-70' : ''}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${badge.className}`}>{badge.label}</span>
        <span className="text-xs text-[#94A3B8]">House {houseFeePercent}%</span>
      </div>

      {isGrandFinal && bonusPoolAp > 0 && (
        <div className="mb-3 flex items-center gap-1 text-sm font-bold text-[#C5BE93]">🌟 Jackpot +{bonusPoolAp.toLocaleString()} AP</div>
      )}

      <p className="mb-2 text-lg font-bold text-[#F9EDD8]">รวม {total.toLocaleString()} AP</p>

      <div className="mb-1 flex justify-between text-xs text-[#94A3B8]">
        <span>{teamAName}</span>
        <span>{teamBName}</span>
      </div>
      <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full">
        <div className="h-full bg-[#E8B429]" style={{ width: `${pctA}%` }} />
        <div className="h-full bg-[#9184D9]" style={{ width: `${100 - pctA}%` }} />
      </div>

      {status === 'OPEN' && onBuyTicket && (
        <div className="flex gap-2">
          <button type="button" onClick={() => onBuyTicket('A')} className="flex-1 rounded-lg bg-[#E8B429] px-3 py-2 text-xs font-black text-[#0D0E1A]">
            ทาย {teamAName}
          </button>
          <button type="button" onClick={() => onBuyTicket('B')} className="flex-1 rounded-lg bg-[#9184D9] px-3 py-2 text-xs font-black text-[#0D0E1A]">
            ทาย {teamBName}
          </button>
        </div>
      )}

      {status === 'LOCKED' && <p className="text-center text-xs text-[#F59E0B]">รอผล...</p>}
      {status === 'VOIDED' && <p className="text-center text-xs text-[#E3322F]">Pool ถูก void — AP คืนแล้ว</p>}
      {status === 'JACKPOT_CARRIED' && <p className="text-center text-xs text-[#C5BE93]">Jackpot ยกยอดไป Grand Final</p>}
    </div>
  );
}

interface TicketPurchaseModalProps {
  poolId: string;
  predictedTeamId: string;
  teamName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_AMOUNTS = [100, 500, 1000];

export function TicketPurchaseModal({ poolId, predictedTeamId, teamName, onClose, onSuccess }: TicketPurchaseModalProps) {
  const [amount, setAmount] = useState(100);
  const [tier, setTier] = useState<PredictionTicketTier>('BRONZE');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleConfirm() {
    setState('loading');
    try {
      const res = await fetch('/api/v1/predictions/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pool_id: poolId,
          predicted_team_id: predictedTeamId,
          tier,
          ap_amount: amount,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.code === 'ALREADY_TICKETED' ? 'ซื้อตั๋วแล้ว pool นี้' : json.error?.message ?? 'ไม่สำเร็จ');
        setState('error');
        return;
      }
      setState('success');
      setTimeout(onSuccess, 1200);
    } catch {
      setErrorMsg('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
      setState('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#1A1C2E] p-6">
        {state === 'success' ? (
          <p className="text-center text-lg font-bold text-[#4CAF50]">🎉 ซื้อตั๋วสำเร็จ!</p>
        ) : (
          <>
            <p className="mb-3 text-sm font-bold text-[#F9EDD8]">ทายผล: {teamName}</p>

            <div className="mb-3 flex gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold ${amount === preset ? 'bg-[#E8B429] text-[#0D0E1A]' : 'bg-[#12142A] text-[#94A3B8]'}`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={10}
              max={5000}
              step={10}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mb-3 w-full"
            />
            <p className="mb-3 text-center text-xl font-bold text-[#F9EDD8]">{amount} AP</p>

            <div className="mb-4 flex gap-2">
              {(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={`flex-1 rounded-full border px-2 py-1 text-[10px] font-bold ${tier === t ? 'border-[#E8B429] text-[#E8B429]' : 'border-[#334B5C] text-[#94A3B8]'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {state === 'error' && <p className="mb-3 text-xs text-[#E3322F]">{errorMsg}</p>}

            <button
              type="button"
              disabled={state === 'loading'}
              onClick={handleConfirm}
              className="w-full rounded-lg bg-[#E8B429] px-6 py-2.5 text-sm font-black text-[#0D0E1A] disabled:opacity-40"
            >
              {state === 'loading' ? 'กำลังดำเนินการ...' : 'ยืนยันซื้อตั๋ว'}
            </button>
            <button type="button" onClick={onClose} className="mt-2 w-full text-center text-xs text-[#94A3B8]">
              ยกเลิก
            </button>
          </>
        )}
      </div>
    </div>
  );
}
