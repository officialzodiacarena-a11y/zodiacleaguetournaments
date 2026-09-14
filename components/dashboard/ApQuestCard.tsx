// components/dashboard/ApQuestCard.tsx
'use client';

import React, { useState, useEffect } from 'react';

interface QuestItem {
  id: string;
  title: string;
  description: string;
  reward_ap: number;
  current_count: number;
  target_count: number;
  is_completed: boolean;
  is_claimed: boolean;
}

export default function ApQuestCard() {
  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [earnedToday, setEarnedToday] = useState(0);
  const [maxCap, setMaxCap] = useState(100);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchQuests() {
      try {
        const res = await fetch('/api/v1/quests/daily');
        const json = await res.json();
        if (cancelled) return;
        if (json.success) {
          setQuests(json.data.quests);
          setEarnedToday(json.data.daily_ap_progress.earned_today);
          setMaxCap(json.data.daily_ap_progress.max_cap);
          setErrorMsg(null);
        } else {
          setErrorMsg(json.error || 'โหลดข้อมูลเควสต์ไม่สำเร็จ');
        }
      } catch (err) {
        console.error('Failed to fetch quests:', err);
        if (!cancelled) setErrorMsg('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchQuests();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleClaim = async (questId: string, idempotencyKey: string) => {
    setClaimingId(questId);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/quests/daily/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ questId }),
      });
      const json = await res.json();
      if (json.success) {
        setRefreshKey((k) => k + 1);
      } else {
        setErrorMsg(json.error || 'กดรับรางวัลไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Claim error:', err);
      setErrorMsg('เครือข่ายขัดข้อง กรุณาลองกดรับรางวัลอีกครั้ง');
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-[#12121A]/80 border border-[#00D4FF]/30 rounded-xl animate-pulse">
        <div className="h-5 w-48 bg-white/10 rounded mb-4" />
        <div className="h-3 w-full bg-white/5 rounded" />
      </div>
    );
  }

  const progressPct = Math.min(100, Math.round((earnedToday / maxCap) * 100));

  return (
    <div className="p-4 bg-[#12121A] border border-[#00D4FF]/30 rounded-xl">
      <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-[#E8B429] uppercase tracking-wider">
            🎯 Daily Quests & AP Cap
          </h3>
          <p className="text-[10px] text-gray-400">
            สะสม AP จากเควสต์รวมกับเพดานรายวัน (รีเซ็ต 00:00 UTC+7)
          </p>
        </div>
        <span className="text-lg font-extrabold text-[#00D4FF] font-mono">
          {earnedToday} / {maxCap} AP
        </span>
      </div>

      {errorMsg && (
        <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-[11px] text-red-300 flex items-center justify-between gap-2">
          <span>{errorMsg}</span>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="shrink-0 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded text-[10px] font-bold uppercase"
          >
            ลองใหม่
          </button>
        </div>
      )}

      {/* Progress Bar */}
      <div className="w-full bg-black/50 h-2.5 rounded-full overflow-hidden border border-white/10 mb-4">
        <div
          className="bg-gradient-to-r from-[#E8B429] to-[#00D4FF] h-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Quests List */}
      <div className="space-y-2">
        {quests.map((q) => (
          <div
            key={q.id}
            className="flex items-center justify-between gap-3 p-3 bg-[#07090E] border border-gray-800 rounded-lg hover:border-[#E8B429]/30 transition-all"
          >
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-white truncate">{q.title}</h4>
              <p className="text-[10px] text-gray-400 truncate">{q.description}</p>
              <div className="text-[10px] text-[#E8B429] mt-1">+{q.reward_ap} AP</div>
            </div>

            <div className="shrink-0">
              {q.is_claimed ? (
                <span className="px-3 py-1 bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/30 text-[10px] rounded-md font-mono">
                  ✓ CLAIMED
                </span>
              ) : q.is_completed ? (
                <button
                  onClick={() => handleClaim(q.id, `claim_${q.id}_${Date.now()}`)}
                  disabled={claimingId === q.id}
                  className="px-3 py-1.5 bg-[#E8B429] hover:bg-[#f5c84c] text-black text-[10px] font-bold rounded-md transition-all disabled:opacity-50"
                >
                  {claimingId === q.id ? 'CLAIMING...' : 'CLAIM'}
                </button>
              ) : (
                <span className="px-3 py-1 bg-white/10 text-gray-400 text-[10px] rounded-md font-mono">
                  {q.current_count} / {q.target_count}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
