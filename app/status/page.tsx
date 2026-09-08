'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type CheckState = 'checking' | 'ok' | 'degraded' | 'down';

interface ServiceCheck {
  name: string;
  state: CheckState;
  detail: string;
  latencyMs?: number;
}

const stateStyles: Record<CheckState, { dot: string; text: string; label: string }> = {
  checking: { dot: 'bg-gray-500 animate-pulse', text: 'text-gray-400', label: 'CHECKING...' },
  ok: { dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]', text: 'text-emerald-400', label: 'OPERATIONAL' },
  degraded: { dot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]', text: 'text-amber-400', label: 'DEGRADED' },
  down: { dot: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]', text: 'text-rose-400', label: 'DOWN' },
};

// เช็คสถานะระบบจริง 3 จุด (ไม่ mock):
// 1. Database — round-trip เวลาจริงของ query เบาๆ ผ่าน Supabase REST
// 2. Realtime WebSocket — เวลาจริงที่ subscribe channel สำเร็จ
// 3. Static Assets — เวลาจริงที่ดึง favicon จาก origin เดียวกัน (ตัวแทน CDN/edge delivery)
// ไม่มี "Services" แยกเพราะไม่มี endpoint เฉพาะให้เช็คจริง จึงไม่ใส่การ์ดหลอกเพิ่ม
export default function StatusPage() {
  const [checks, setChecks] = useState<Record<string, ServiceCheck>>({
    database: { name: 'Database (Supabase Postgres)', state: 'checking', detail: 'กำลังทดสอบการเชื่อมต่อ...' },
    realtime: { name: 'Realtime WebSocket', state: 'checking', detail: 'กำลังทดสอบการเชื่อมต่อ...' },
    assets: { name: 'Static Assets Delivery', state: 'checking', detail: 'กำลังทดสอบการเชื่อมต่อ...' },
  });
  const [lastChecked, setLastChecked] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function runChecks() {
      // 1. Database round-trip
      const dbStart = performance.now();
      try {
        const { error } = await supabase.from('games').select('id').limit(1);
        const latency = Math.round(performance.now() - dbStart);
        if (!isMounted) return;
        setChecks((prev) => ({
          ...prev,
          database: error
            ? { name: prev.database.name, state: 'down', detail: error.message, latencyMs: latency }
            : {
                name: prev.database.name,
                state: latency > 800 ? 'degraded' : 'ok',
                detail: `Query round-trip ${latency}ms`,
                latencyMs: latency,
              },
        }));
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Connection failed';
        setChecks((prev) => ({ ...prev, database: { name: prev.database.name, state: 'down', detail: msg } }));
      }

      // 2. Realtime WebSocket
      const rtStart = performance.now();
      const channel = supabase.channel(`status-check-${Date.now()}`);
      const timeout = setTimeout(() => {
        if (!isMounted) return;
        setChecks((prev) => ({
          ...prev,
          realtime: { name: prev.realtime.name, state: 'down', detail: 'Subscribe timeout (>5000ms)' },
        }));
        supabase.removeChannel(channel);
      }, 5000);

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          const latency = Math.round(performance.now() - rtStart);
          if (!isMounted) return;
          setChecks((prev) => ({
            ...prev,
            realtime: {
              name: prev.realtime.name,
              state: latency > 2000 ? 'degraded' : 'ok',
              detail: `Subscribed ใน ${latency}ms`,
              latencyMs: latency,
            },
          }));
          supabase.removeChannel(channel);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          if (!isMounted) return;
          setChecks((prev) => ({
            ...prev,
            realtime: { name: prev.realtime.name, state: 'down', detail: `Channel status: ${status}` },
          }));
        }
      });

      // 3. Static asset delivery
      const assetStart = performance.now();
      try {
        await fetch('/favicon.ico', { cache: 'no-store' });
        const latency = Math.round(performance.now() - assetStart);
        if (!isMounted) return;
        setChecks((prev) => ({
          ...prev,
          assets: {
            name: prev.assets.name,
            state: latency > 1500 ? 'degraded' : 'ok',
            detail: `Fetch round-trip ${latency}ms`,
            latencyMs: latency,
          },
        }));
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Fetch failed';
        setChecks((prev) => ({ ...prev, assets: { name: prev.assets.name, state: 'down', detail: msg } }));
      }

      if (isMounted) setLastChecked(new Date().toLocaleTimeString('th-TH'));
    }

    runChecks();
    const interval = setInterval(runChecks, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const allChecks = Object.values(checks);
  const overall: CheckState = allChecks.some((c) => c.state === 'down')
    ? 'down'
    : allChecks.some((c) => c.state === 'degraded')
    ? 'degraded'
    : allChecks.every((c) => c.state === 'ok')
    ? 'ok'
    : 'checking';

  return (
    <div className="min-h-screen bg-[#07090E] text-white pt-24 pb-12 px-4 md:px-8 flex flex-col items-center font-mono selection:bg-[#00D4FF] selection:text-black">
      <div className="w-full max-w-3xl z-10">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className={`w-2.5 h-2.5 rounded-full ${stateStyles[overall].dot}`} />
            <span className={`text-xs font-black tracking-widest uppercase ${stateStyles[overall].text}`}>
              {stateStyles[overall].label}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-wider text-white">SYSTEM STATUS</h1>
          <p className="text-[11px] text-gray-500 mt-1">ตรวจสอบล่าสุด: {lastChecked || '...'} · รีเฟรชอัตโนมัติทุก 30 วินาที</p>
        </header>

        <div className="space-y-3">
          {Object.entries(checks).map(([key, check]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border border-gray-800 bg-[#12121A] p-4"
            >
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${stateStyles[check.state].dot}`} />
                <div>
                  <div className="text-sm font-bold text-white">{check.name}</div>
                  <div className="text-[11px] text-gray-500">{check.detail}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-[10px] font-black tracking-wider uppercase ${stateStyles[check.state].text}`}>
                  {stateStyles[check.state].label}
                </div>
                {check.latencyMs !== undefined && (
                  <div className="text-[10px] text-gray-600 font-mono">{check.latencyMs}ms</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
