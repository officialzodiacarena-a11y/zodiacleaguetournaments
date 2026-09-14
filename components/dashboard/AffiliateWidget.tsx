// components/dashboard/AffiliateWidget.tsx
'use client';

import React, { useState, useEffect } from 'react';

export default function AffiliateWidget() {
  const [affCode, setAffCode] = useState('');
  const [referralUrl, setReferralUrl] = useState('');
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalApEarned, setTotalApEarned] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAffiliateStats() {
      try {
        const res = await fetch('/api/v1/affiliate/stats');
        const json = await res.json();
        if (json.success) {
          setAffCode(json.data.affiliate_code);
          setReferralUrl(json.data.referral_url);
          setTotalReferrals(json.data.total_referrals);
          setTotalApEarned(json.data.total_ap_earned);
          setErrorMsg(null);
        } else {
          setErrorMsg(json.error || 'โหลดข้อมูล Affiliate ไม่สำเร็จ');
        }
      } catch (err) {
        console.error('Failed to fetch affiliate stats:', err);
        setErrorMsg('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่');
      } finally {
        setLoading(false);
      }
    }
    fetchAffiliateStats();
  }, []);

  const handleCopy = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-[#12121A]/80 border border-purple-500/20 rounded-xl animate-pulse">
        <div className="h-5 w-56 bg-white/10 rounded mb-4" />
        <div className="h-8 w-full bg-white/5 rounded" />
      </div>
    );
  }

  return (
    <div className="p-4 bg-[#12121A] border border-purple-500/20 rounded-xl">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider">
          🤝 2-Tier Referral Network
        </h3>
        <p className="text-[10px] text-gray-400">
          ชวนเพื่อน: +50 AP เมื่อผ่าน KYC + 5% Cashback Tier 1 / 2% Tier 2
        </p>
      </div>

      {errorMsg && (
        <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-[11px] text-red-300">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-black/40 border border-white/10 rounded-lg text-center">
          <div className="text-[10px] text-gray-400">ผู้เล่นที่แนะนำ</div>
          <div className="text-lg font-bold text-[#E8B429] font-mono">{totalReferrals}</div>
        </div>
        <div className="p-3 bg-black/40 border border-white/10 rounded-lg text-center">
          <div className="text-[10px] text-gray-400">AP สะสมทั้งหมด</div>
          <div className="text-lg font-bold text-[#00D4FF] font-mono">+{totalApEarned}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={referralUrl || 'กำลังโหลดลิงก์แนะนำ...'}
          className="flex-1 min-w-0 bg-black/60 border border-white/10 rounded-md px-3 py-2 text-[11px] text-gray-300 font-mono focus:outline-none"
        />
        <button
          onClick={handleCopy}
          disabled={!referralUrl}
          className="shrink-0 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded-md transition-all disabled:opacity-50"
        >
          {copied ? '✓ COPIED!' : '🔗 COPY'}
        </button>
      </div>
      {affCode && (
        <div className="mt-2 text-[10px] text-gray-500 font-mono">CODE: {affCode}</div>
      )}
    </div>
  );
}
