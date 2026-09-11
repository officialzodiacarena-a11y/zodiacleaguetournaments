'use client';

import { useEffect, useState } from 'react';

export function StoreHeader() {
  const [apBalance, setApBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/players/me/ap')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json && typeof json.balance === 'number') setApBalance(json.balance);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex items-center justify-between rounded-xl bg-[#1A1C2E] p-4">
      <h1 className="text-lg font-black text-[#F9EDD8]">Partner Store</h1>
      {apBalance !== null && (
        <div className="flex items-center gap-2 rounded-lg bg-[#12142A] px-3 py-1.5">
          <span className="text-sm font-black text-[#E8B429]">{apBalance.toLocaleString()} AP</span>
          <span className="text-xs text-[#94A3B8]">≈ ฿{(apBalance / 2).toFixed(0)}</span>
        </div>
      )}
    </div>
  );
}
