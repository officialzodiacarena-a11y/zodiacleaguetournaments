'use client';

import { useState } from 'react';

export function CopyAccountButton({ digits }: { digits: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(digits);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-lg border border-[#E8B429]/40 bg-[#E8B429]/10 px-3 py-1.5 text-xs font-bold tracking-wider text-[#E8B429] hover:bg-[#E8B429]/20 transition-colors"
    >
      {copied ? 'คัดลอกแล้ว' : 'คัดลอกเลขบัญชี'}
    </button>
  );
}
