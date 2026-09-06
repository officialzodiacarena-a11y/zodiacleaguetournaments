// components/auto-refresh.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(intervalMs / 1000);

  useEffect(() => {
    // นับถอยหลังแสดงวินาที
    const countdownTimer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? intervalMs / 1000 : prev - 1));
    }, 1000);

    // กระตุ้นดึงข้อมูล Server Component ใหม่เมื่อครบเวลา
    const refreshTimer = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => {
      clearInterval(countdownTimer);
      clearInterval(refreshTimer);
    };
  }, [router, intervalMs]);

  return (
    <div className="flex items-center gap-1.5 text-[#75798c] tracking-wider uppercase text-[10px]">
      <span className="animate-spin text-xs">⟳</span>
      <span>AUTO-REFRESH ({secondsLeft}s)</span>
    </div>
  );
}
