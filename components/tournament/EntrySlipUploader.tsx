'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type FeedbackKind = 'success' | 'info' | 'error';

export function EntrySlipUploader({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: FeedbackKind; message: string } | null>(null);

  async function handleSubmit() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append('slip', file);

      const res = await fetch(`/api/v1/entry-payments/${paymentId}/slip`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (res.ok) {
        if (json.outcome === 'APPROVED') {
          setFeedback({ kind: 'success', message: 'ชำระสำเร็จ สมัครเรียบร้อย' });
        } else if (json.outcome === 'SLIP_UPLOADED') {
          setFeedback({ kind: 'info', message: json.message || 'ส่งให้แอดมินตรวจแล้ว' });
        } else if (json.outcome === 'REJECTED') {
          setFeedback({ kind: 'error', message: json.message || 'สลิปไม่ผ่านการตรวจ' });
        }
      } else {
        setFeedback({ kind: 'error', message: json.error?.message || 'อัปโหลดไม่สำเร็จ' });
      }
    } catch {
      setFeedback({ kind: 'error', message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
    } finally {
      setSubmitting(false);
      router.refresh();
    }
  }

  const feedbackColor =
    feedback?.kind === 'success'
      ? 'text-emerald-300'
      : feedback?.kind === 'info'
      ? 'text-sky-300'
      : 'text-rose-300';

  return (
    <div className="rounded-xl border border-[#9184d9]/25 bg-[#1A1C2E] p-4">
      <div className="flex flex-col gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="text-xs text-[#cfd3e5] file:mr-3 file:rounded-lg file:border-0 file:bg-[#E8B429]/15 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[#E8B429]"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-lg bg-gradient-to-r from-[#E8B429] to-[#d97706] px-5 py-2.5 text-xs font-black tracking-wider text-[#0D0E1A] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'กำลังตรวจสลิป…' : 'ส่งสลิป'}
        </button>
        {feedback && <div className={`text-xs font-medium ${feedbackColor}`}>{feedback.message}</div>}
        <p className="text-[11px] text-[#75798c]">
          ใช้รูปสลิปจากแอปธนาคารแบบเต็มใบ ไม่ครอป ให้เห็น QR มุมสลิป
        </p>
      </div>
    </div>
  );
}
