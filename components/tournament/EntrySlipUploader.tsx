'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type FeedbackKind = 'success' | 'info' | 'error';

export function EntrySlipUploader({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const accountNameRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: FeedbackKind; message: string } | null>(null);

  async function handleSubmit() {
    const file = fileInputRef.current?.files?.[0];
    const accountName = accountNameRef.current?.value?.trim();
    
    if (!file) {
      setFeedback({ kind: 'error', message: 'กรุณาเลือกไฟล์สลิปก่อนส่ง' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append('slip', file);
      if (accountName) {
        formData.append('account_name', accountName);
      }

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
    <div className="rounded-xl border border-white/10 bg-[#1A1C2E] p-6 mb-6 mt-4">
      <h3 className="text-sm font-bold text-white mb-4">แจ้งหลักฐานการโอนเงิน</h3>
      
      <div className="mb-5">
        <label className="block text-xs font-semibold text-[#75798c] mb-2 uppercase tracking-wider">ชื่อบัญชีผู้โอน (ที่แสดงบนสลิป)</label>
        <input 
          ref={accountNameRef}
          type="text" 
          placeholder="เช่น นายสมชาย ใจดี" 
          className="w-full bg-[#0D0E1A] border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E8B429]/50 focus:ring-1 focus:ring-[#E8B429]/50 transition-all placeholder:text-[#75798c]/50"
          disabled={submitting}
        />
        <p className="text-[11px] text-[#75798c] mt-1.5">* กรุณากรอกให้ตรงกับสลิป เพื่อความรวดเร็วในการตรวจสอบ</p>
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold text-[#75798c] mb-2 uppercase tracking-wider">อัปโหลดสลิป</label>
        <div className="flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-xs text-[#cfd3e5] file:mr-3 file:rounded-lg file:border-0 file:bg-[#E8B429]/15 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[#E8B429] file:cursor-pointer w-full bg-[#0D0E1A] border border-white/10 rounded-lg p-2"
            disabled={submitting}
          />
          <p className="text-[11px] text-[#75798c]">
            ใช้รูปสลิปจากแอปธนาคารแบบเต็มใบ ไม่ครอป ให้เห็น QR มุมสลิป
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-[#E8B429] text-[#08090F] font-black text-sm py-3.5 rounded-xl hover:bg-[#f5c84c] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'กำลังตรวจสลิป…' : 'ส่งข้อมูลเพื่อตรวจสอบ'}
      </button>

      {feedback && <div className={`text-xs font-medium ${feedbackColor} mt-4 text-center`}>{feedback.message}</div>}
    </div>
  );
}
