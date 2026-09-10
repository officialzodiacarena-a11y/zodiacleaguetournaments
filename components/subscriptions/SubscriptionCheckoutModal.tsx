'use client';

import { useState } from 'react';
import type { PlanCode, SubscriberType } from '@/types/subscriptions';

// UI/UX Spec status: MASTER_SPEC___Stage2_P5_UI_UX.md is "⏳ Pending Prototype" —
// พี่ศิลา ยังไม่ได้ส่ง Prototype A/B/C ให้อลิสเลือก ก่อน implement ตัวสุดท้าย
// component นี้ implement ตาม Design Tokens ที่ระบุไว้แล้วในสเปกทุกจุด (สี, ชื่อ
// component, states) แต่ยังไม่ผ่าน Visual QA sign-off — คาดว่าต้องปรับ polish
// รอบสองเมื่อ Prototype ถูกเลือกแล้ว

interface PlanOption {
  code: PlanCode;
  name: string;
  priceThb: number;
  priceApRenewal: number;
  description: string;
}

const PLANS: PlanOption[] = [
  { code: 'PRO_CLUB', name: 'PRO CLUB', priceThb: 2000, priceApRenewal: 200, description: 'Pro Analytics Dashboard เต็มรูปแบบ' },
  { code: 'VIP_CLUB', name: 'VIP CLUB', priceThb: 6000, priceApRenewal: 600, description: 'Pro Analytics + VIP Health Perks' },
  { code: 'ATHLETE_PASS', name: 'ATHLETE PASS', priceThb: 0, priceApRenewal: 50, description: 'สิทธิ์นักกีฬารายบุคคล (AP-based)' },
];

interface SubscriptionCheckoutModalProps {
  subscriberType: SubscriberType;
  subscriberId: string;
  onClose: () => void;
  onSuccess: (invoiceId: string) => void;
}

export function SubscriptionCheckoutModal({ subscriberType, subscriberId, onClose, onSuccess }: SubscriptionCheckoutModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!selectedPlan) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_code: selectedPlan,
          subscriber_type: subscriberType,
          subscriber_id: subscriberId,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        return;
      }
      onSuccess(json.invoice_id);
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#1A1C2E] p-6 shadow-2xl transition-all duration-200">
        <h2 className="mb-1 text-xl font-black text-[#F9EDD8]">สมัครสมาชิก Zodiac Club</h2>
        <p className="mb-6 text-sm text-[#94A3B8]">เลือกแผนสมาชิกที่ต้องการ — ชำระครั้งแรกด้วย THB เท่านั้น</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.code;
            return (
              <button
                key={plan.code}
                type="button"
                onClick={() => setSelectedPlan(plan.code)}
                className={`rounded-xl bg-[#12142A] p-4 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B429] ${
                  isSelected ? 'border-2 border-[#E8B429]' : 'border-2 border-transparent hover:border-[#E8B429]/40'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-[#F9EDD8]">{plan.name}</span>
                  {isSelected && <span className="text-[#E8B429]">✓</span>}
                </div>
                <p className="mb-3 text-2xl font-bold text-[#F9EDD8]">
                  {plan.priceThb > 0 ? `฿${plan.priceThb.toLocaleString()}` : `${plan.priceApRenewal} AP`}
                  <span className="text-xs font-normal text-[#94A3B8]">/เดือน</span>
                </p>
                <p className="text-xs text-[#94A3B8]">{plan.description}</p>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-[#E3322F]/10 px-4 py-2 text-sm text-[#E3322F]">{error}</div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-[#94A3B8] hover:text-[#F9EDD8]">
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={!selectedPlan || loading}
            onClick={handleSubmit}
            className="rounded-lg bg-[#E8B429] px-6 py-2 text-sm font-black text-[#0D0E1A] transition-opacity disabled:opacity-40"
          >
            {loading ? 'กำลังดำเนินการ...' : 'สมัครสมาชิก'}
          </button>
        </div>
      </div>
    </div>
  );
}
