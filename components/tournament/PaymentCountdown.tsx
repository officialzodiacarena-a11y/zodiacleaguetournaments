'use client';

import { useEffect, useState } from 'react';

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'เลยเวลาชำระ';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function PaymentCountdown({ expiresAt }: { expiresAt: string }) {
  const target = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState(() => target - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(target - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <div className="text-xs font-bold tracking-wider text-[#cfd3e5]">
      {remaining <= 0 ? (
        <span className="text-[#fbbf24]">เลยเวลาชำระ อัปโหลดได้ ระบบจะส่งให้แอดมินตรวจ</span>
      ) : (
        <span>
          เหลือเวลา <span className="text-[#E8B429]">{formatRemaining(remaining)}</span>
        </span>
      )}
    </div>
  );
}
