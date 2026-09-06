'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Provider } from '@supabase/supabase-js';

const PROVIDERS: { id: Provider; label: string; className: string }[] = [
  {
    id: 'google',
    label: 'LOGIN WITH GOOGLE',
    className: 'bg-[#E8B429]/[0.06] border-[#E8B429]/30 hover:bg-[#E8B429]/[0.12] hover:border-[#E8B429]/50',
  },
  {
    id: 'discord',
    label: 'LOGIN WITH DISCORD',
    className: 'bg-[#5865F2]/10 border-[#5865F2]/35 hover:bg-[#5865F2]/[0.18] hover:border-[#5865F2]/55',
  },
  {
    id: 'facebook',
    label: 'LOGIN WITH FACEBOOK',
    className: 'bg-[#1877F2]/[0.08] border-[#1877F2]/30 hover:bg-[#1877F2]/[0.15] hover:border-[#1877F2]/50',
  },
];

export function JoinCircuitButtons() {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleOAuthLogin(provider: Provider) {
    setLoading(provider);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[9px] font-semibold tracking-[0.22em] text-[#94A3B8]">JOIN THE CIRCUIT</div>
      {error && (
        <div className="rounded p-1.5 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 text-center">
          {error}
        </div>
      )}
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => handleOAuthLogin(p.id)}
          disabled={loading !== null}
          className={`flex items-center justify-center gap-2.5 rounded-lg border px-4 py-2.5 text-[11px] font-semibold tracking-wider text-[#F9EDD8] transition-colors disabled:opacity-50 cursor-pointer ${p.className}`}
        >
          {loading === p.id ? 'CONNECTING...' : p.label}
        </button>
      ))}
    </div>
  );
}
