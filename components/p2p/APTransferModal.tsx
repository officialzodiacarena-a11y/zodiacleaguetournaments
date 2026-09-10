'use client';

import { useState } from 'react';

// UI/UX Spec status: Pending Prototype — see StorefrontManager.tsx note.

interface APTransferModalProps {
  onClose: () => void;
  onSuccess: (escrowId: string) => void;
}

type Step = 1 | 2 | 3;

export function APTransferModal({ onClose, onSuccess }: APTransferModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [receiverId, setReceiverId] = useState('');
  const [amount, setAmount] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [transferToken, setTransferToken] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestOtpAndAdvance() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/ap/transfer/request-otp', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? 'ไม่สามารถขอรหัส OTP ได้');
        return;
      }
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOtpSubmit() {
    const code = otp.join('');
    if (code.length !== 6) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/ap/transfer/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp_code: code }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error?.code === 'ACCOUNT_LOCKED') {
          setLockedUntil(json.error.locked_until);
        } else {
          setAttempts(json.error?.attempts ?? attempts + 1);
          setShake(true);
          setTimeout(() => setShake(false), 400);
        }
        setOtp(['', '', '', '', '', '']);
        return;
      }
      setTransferToken(json.transfer_token);
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!transferToken) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/ap/transfer/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_id: receiverId,
          amount_ap: Number(amount),
          transfer_token: transferToken,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? 'โอนไม่สำเร็จ');
        return;
      }
      onSuccess(json.escrow_id);
    } finally {
      setSubmitting(false);
    }
  }

  if (lockedUntil) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <div className="w-full max-w-md rounded-2xl bg-[#1A1C2E] p-6 text-center">
          <p className="text-sm text-[#94A3B8]">บัญชีถูกล็อก กรุณารอ</p>
          <p className="mt-2 text-lg font-bold text-[#F9EDD8]">{new Date(lockedUntil).toLocaleTimeString('th-TH')}</p>
          <button type="button" onClick={onClose} className="mt-4 rounded-lg bg-[#12142A] px-4 py-2 text-sm text-[#94A3B8]">
            ปิด
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#1A1C2E] p-6">
        <div className="mb-4 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-[#E8B429]' : 'bg-[#12142A]'}`} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <p className="mb-3 text-sm font-bold text-[#F9EDD8]">จำนวน AP ที่โอน</p>
            <input
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              placeholder="Receiver Player ID"
              className="mb-2 w-full rounded-lg bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8]"
            />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="จำนวน AP"
              className="w-full rounded-lg border border-[#E8B429]/30 bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8]"
            />
            <button
              type="button"
              disabled={!receiverId || !amount || submitting}
              onClick={requestOtpAndAdvance}
              className="mt-4 w-full rounded-lg bg-[#E8B429] px-6 py-2 text-sm font-black text-[#0D0E1A] disabled:opacity-40"
            >
              ถัดไป
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-3 text-sm font-bold text-[#F9EDD8]">กรอกรหัส OTP (ส่งไปที่การแจ้งเตือนในระบบ)</p>
            <div className={`flex gap-2 ${shake ? 'animate-pulse' : ''}`}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  value={digit}
                  maxLength={1}
                  inputMode="numeric"
                  onChange={(e) => {
                    const next = [...otp];
                    next[i] = e.target.value.replace(/\D/g, '');
                    setOtp(next);
                  }}
                  className="h-12 w-12 rounded-lg bg-[#12142A] text-center text-lg text-[#F9EDD8]"
                />
              ))}
            </div>
            {attempts > 0 && <p className="mt-2 text-xs text-[#E3322F]">รหัสไม่ถูกต้อง ({attempts}/5)</p>}
            <button
              type="button"
              disabled={submitting || otp.join('').length !== 6}
              onClick={handleOtpSubmit}
              className="mt-4 w-full rounded-lg bg-[#E8B429] px-6 py-2 text-sm font-black text-[#0D0E1A] disabled:opacity-40"
            >
              ยืนยันรหัส
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="mb-3 text-sm font-bold text-[#F9EDD8]">ยืนยันการโอน</p>
            <div className="rounded-lg bg-[#12142A] p-4 text-sm text-[#94A3B8]">
              <p>ผู้รับ: {receiverId}</p>
              <p>จำนวน: {amount} AP</p>
            </div>
            {error && <p className="mt-2 text-xs text-[#E3322F]">{error}</p>}
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirm}
              className="mt-4 w-full rounded-lg bg-[#E8B429] px-6 py-2 text-sm font-black text-[#0D0E1A] disabled:opacity-40"
            >
              ยืนยันโอน
            </button>
          </div>
        )}

        <button type="button" onClick={onClose} className="mt-3 w-full text-center text-xs text-[#94A3B8]">
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
