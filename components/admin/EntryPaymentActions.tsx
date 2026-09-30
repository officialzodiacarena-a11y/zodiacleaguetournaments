'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface EntryPaymentActionsProps {
  paymentId: string;
  status: string;
  hasSlip: boolean;
}

export function EntryPaymentActions({ paymentId, status, hasSlip }: EntryPaymentActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function postReview(decision: 'APPROVE' | 'REJECT_SLIP' | 'CANCEL', reason?: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/admin/entry-payments/${paymentId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error?.message || 'ทำรายการไม่สำเร็จ');
        return;
      }
      router.refresh();
    } catch {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setBusy(false);
    }
  }

  async function handleViewSlip() {
    try {
      const res = await fetch(`/api/v1/admin/entry-payments/${paymentId}/slip-url`);
      const json = await res.json();
      if (!res.ok) {
        alert(json.error?.message || 'ดูสลิปไม่สำเร็จ');
        return;
      }
      window.open(json.url, '_blank', 'noopener');
    } catch {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  }

  function handleApprove() {
    if (!confirm('เช็คแล้วว่าเงินเข้าบัญชีบริษัทใน K BIZ จริง?')) return;
    postReview('APPROVE');
  }

  function handleRejectSlip() {
    const reason = prompt('เหตุผลที่ให้ส่งใหม่ (ผู้เล่นจะเห็น)');
    if (!reason) return;
    postReview('REJECT_SLIP', reason);
  }

  function handleCancel() {
    const reason = prompt('เหตุผลที่ยกเลิก (ผู้เล่นจะเห็น)');
    if (!reason) return;
    if (!confirm('ยืนยันยกเลิกการสมัครนี้?')) return;
    postReview('CANCEL', reason);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {hasSlip && (
        <button
          type="button"
          onClick={handleViewSlip}
          disabled={busy}
          className="rounded border border-[#9184d9]/40 bg-transparent px-2.5 py-1 text-[11px] font-bold text-[#cfd3e5] hover:border-[#9184d9]"
        >
          ดูสลิป
        </button>
      )}
      {(status === 'SLIP_UPLOADED' || status === 'AWAITING_PAYMENT') && (
        <button
          type="button"
          onClick={handleApprove}
          disabled={busy}
          className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/20"
        >
          อนุมัติ
        </button>
      )}
      {status === 'SLIP_UPLOADED' && (
        <button
          type="button"
          onClick={handleRejectSlip}
          disabled={busy}
          className="rounded border border-[#eab308]/40 bg-[#eab308]/10 px-2.5 py-1 text-[11px] font-bold text-[#fbbf24] hover:bg-[#eab308]/20"
        >
          ให้ส่งสลิปใหม่
        </button>
      )}
      {(status === 'SLIP_UPLOADED' || status === 'AWAITING_PAYMENT') && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={busy}
          className="rounded border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/20"
        >
          ยกเลิกการสมัคร
        </button>
      )}
    </div>
  );
}
