'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Clock, Shield, Sparkles, TrendingUp, User } from 'lucide-react';

interface PlayerStats {
  avg_acs?: number;
  avg_kd?: number;
  avg_adr?: number;
  headshot_pct?: number;
  win_rate?: number;
}

interface AuctionListingCardProps {
  listingId: string;
  itemTitle: string;
  athleteId?: string | null;
  avatarUrl?: string | null;
  teamTag?: string | null;
  teamName?: string | null;
  contractNote?: string | null;
  stats?: PlayerStats | null;
  currentHighestBid: number | null;
  buyoutPrice: number | null;
  auctionEndsAt: string | null;
  status: string;
  myPlayerId?: string;
  myBidderId?: string | null;
}

type ToastState = { kind: 'success' | 'info' | 'error'; message: string } | null;

export function AuctionListingCard({
  listingId,
  itemTitle,
  athleteId,
  avatarUrl,
  teamTag,
  teamName,
  contractNote,
  stats,
  currentHighestBid,
  buyoutPrice,
  auctionEndsAt,
  status,
  myPlayerId,
  myBidderId,
}: AuctionListingCardProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [localStatus, setLocalStatus] = useState(status);
  const [localHighest, setLocalHighest] = useState(currentHighestBid);

  useEffect(() => {
    if (!auctionEndsAt) return;
    const tick = () => {
      const diff = new Date(auctionEndsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('หมดเวลา');
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      if (d > 0) {
        setTimeLeft(`${d} วัน ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      } else {
        setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [auctionEndsAt]);

  async function handleBid() {
    const amount = Number(bidAmount);
    if (!amount || amount <= 0) return;
    setSubmitting(true);
    setToast(null);
    try {
      const res = await fetch(`/api/v1/athlete-market/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, bid_amount: amount, idempotency_key: crypto.randomUUID() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setToast({ kind: 'error', message: json.error?.message || (json.error?.code === 'BID_TOO_LOW' ? 'ราคาต้องสูงกว่าราคาปัจจุบัน' : 'ไม่สามารถเสนอราคาได้') });
        return;
      }
      if (json.matched) {
        setLocalStatus('SOLD');
        setToast({ kind: 'success', message: 'ซื้อสำเร็จ!' });
      } else {
        setLocalHighest(amount);
        setToast({ kind: 'success', message: 'เสนอราคาสำเร็จ!' });
      }
      setBidAmount('');
    } catch {
      setToast({ kind: 'error', message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ' });
    } finally {
      setSubmitting(false);
    }
  }

  const isSold = localStatus === 'SOLD';
  const iAmLeading = Boolean(myPlayerId && myBidderId && myPlayerId === myBidderId);

  return (
    <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-[#16182B] via-[#101222] to-[#0D0E1A] p-5 shadow-2xl transition-all duration-300 hover:border-[#E8B429]/50 hover:shadow-[0_0_25px_rgba(232,180,41,0.15)] flex flex-col justify-between overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8B429]/5 rounded-full blur-2xl pointer-events-none" />

      {isSold && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/80 backdrop-blur-sm">
          <span className="rounded-full border border-zinc-600 bg-zinc-800 px-5 py-1.5 text-sm font-black text-zinc-300 uppercase tracking-widest">
            🔒 ปิดประมูลแล้ว (SOLD)
          </span>
        </div>
      )}

      <div>
        {/* HEADER: ATHLETE INFO & BADGES */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-[#E8B429]/20 to-[#00D4FF]/20 border border-white/15 flex items-center justify-center shrink-0">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={itemTitle} fill className="object-cover" sizes="48px" unoptimized />
              ) : (
                <User className="w-6 h-6 text-[#E8B429]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-[#F9EDD8] font-mono leading-tight">{itemTitle}</h3>
                {teamTag && (
                  <span className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/30">
                    [{teamTag}]
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono text-zinc-400">{athleteId || 'ATHLETE'}</span>
                {teamName && <span className="text-[10px] text-zinc-500">• {teamName}</span>}
              </div>
            </div>
          </div>

          {iAmLeading && (
            <span className="rounded-full bg-[#00D4FF]/20 border border-[#00D4FF]/40 px-2.5 py-0.5 text-[10px] font-black text-[#00D4FF] uppercase tracking-wider animate-pulse shrink-0">
              👑 คุณนำอยู่
            </span>
          )}
        </div>

        {/* STATS MATRIX */}
        {stats && (
          <div className="grid grid-cols-4 gap-1.5 bg-black/40 border border-white/5 rounded-xl p-2.5 mb-3 font-mono text-center">
            <div>
              <div className="text-[9px] text-zinc-400 uppercase tracking-wider">ACS</div>
              <div className="text-xs font-black text-[#00D4FF] mt-0.5">{stats.avg_acs ?? '--'}</div>
            </div>
            <div>
              <div className="text-[9px] text-zinc-400 uppercase tracking-wider">K/D</div>
              <div className="text-xs font-black text-emerald-400 mt-0.5">{stats.avg_kd ?? '--'}</div>
            </div>
            <div>
              <div className="text-[9px] text-zinc-400 uppercase tracking-wider">HS%</div>
              <div className="text-xs font-black text-amber-400 mt-0.5">{stats.headshot_pct ? `${stats.headshot_pct}%` : '--'}</div>
            </div>
            <div>
              <div className="text-[9px] text-zinc-400 uppercase tracking-wider">WIN%</div>
              <div className="text-xs font-black text-purple-400 mt-0.5">{stats.win_rate ? `${stats.win_rate}%` : '--'}</div>
            </div>
          </div>
        )}

        {/* CONTRACT NOTE */}
        {contractNote && (
          <p className="text-[11px] text-zinc-300 line-clamp-2 mb-3 bg-[#121424] border border-white/5 rounded-lg p-2 leading-relaxed">
            {contractNote}
          </p>
        )}
      </div>

      {/* FOOTER: PRICING & BID ACTION */}
      <div className="pt-3 border-t border-white/10 space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase block tracking-wider">ราคาประมูลสูงสุด</span>
            <span className="text-lg font-black text-[#E8B429] font-mono tabular-nums">
              {localHighest != null ? `${localHighest.toLocaleString()} AP` : 'ยังไม่มีผู้เสนอ'}
            </span>
          </div>

          <div className="text-right">
            {buyoutPrice != null && (
              <div className="text-[11px] font-mono text-zinc-300">
                ฉีกสัญญา: <span className="text-[#00D4FF] font-black">{buyoutPrice.toLocaleString()} AP</span>
              </div>
            )}
            {timeLeft && (
              <div className="flex items-center gap-1 justify-end text-[10px] font-mono text-rose-400 mt-0.5">
                <Clock className="w-3 h-3" />
                <span>{timeLeft}</span>
              </div>
            )}
          </div>
        </div>

        {!isSold && (
          <div className="flex gap-2">
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="ใส่ราคา AP..."
              className="flex-1 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-600 focus:border-[#E8B429] focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={handleBid}
              disabled={submitting || !bidAmount}
              className="rounded-lg bg-[#E8B429] hover:bg-[#ffc935] px-4 py-2 text-xs font-black text-black uppercase tracking-wider font-mono transition-all disabled:opacity-40 cursor-pointer shadow-md"
            >
              {submitting ? '...' : 'เสนอราคา'}
            </button>
          </div>
        )}

        {toast && (
          <div
            className={`rounded-lg px-3 py-2 text-xs font-mono text-center ${
              toast.kind === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : toast.kind === 'error'
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                : 'bg-zinc-500/15 border border-zinc-500/30 text-zinc-300'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
