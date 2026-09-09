'use client';

import { useEffect, useState } from 'react';

// UI/UX Spec status: Pending Prototype sign-off — see SubscriptionCheckoutModal.tsx note.
// Data note: heatmap / round_economy / first_blood_pct come back null from the API
// until mv_team_analytics has a confirmed real source for them (see the migration
// header in 20260910000000_t51_phase5_billing_engine.sql) — rendered as "ไม่มีข้อมูล"
// rather than fabricated placeholders.

interface TeamAnalyticsResponse {
  team_id: string;
  games_played?: number;
  avg_kills?: number | null;
  avg_deaths?: number | null;
  avg_assists?: number | null;
  avg_acs?: number | null;
  adr?: number | null;
  avg_headshot_pct?: number | null;
  heatmap?: unknown;
  round_economy?: unknown;
  first_blood_pct?: number | null;
  data_as_of?: string | null;
  read_only?: boolean;
}

interface ProAnalyticsDashboardProps {
  teamId: string;
}

type GateState = 'loading' | 'paywall' | 'active' | 'error';

export function ProAnalyticsDashboard({ teamId }: ProAnalyticsDashboardProps) {
  const [state, setState] = useState<GateState>('loading');
  const [data, setData] = useState<TeamAnalyticsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Deferred to a microtask so this isn't a synchronous setState-in-effect
    // (the initial mount already renders 'loading' from the useState default).
    Promise.resolve().then(() => !cancelled && setState('loading'));

    fetch(`/api/v1/analytics/team/${teamId}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 403) {
          setState('paywall');
          return;
        }
        if (!res.ok) {
          setState('error');
          return;
        }
        const json = (await res.json()) as TeamAnalyticsResponse;
        setData(json);
        setState('active');
      })
      .catch(() => !cancelled && setState('error'));

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (state === 'loading') {
    return (
      <div className="min-h-[300px] bg-[#0D0E1A] p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-[#1A1C2E]" />
          ))}
        </div>
      </div>
    );
  }

  if (state === 'paywall') {
    return (
      <div className="relative min-h-[300px] bg-[#0D0E1A] p-6">
        <div className="pointer-events-none grid grid-cols-2 gap-4 opacity-30 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-[#1A1C2E]" />
          ))}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0D0E1A]/80">
          <p className="text-sm text-[#94A3B8]">ฟีเจอร์นี้สำหรับสมาชิก Pro เท่านั้น</p>
          <button className="rounded-lg bg-[#E8B429] px-6 py-2 text-sm font-black text-[#0D0E1A]">อัพเกรดเป็น Pro</button>
        </div>
      </div>
    );
  }

  if (state === 'error' || !data) {
    return <div className="min-h-[300px] bg-[#0D0E1A] p-6 text-center text-sm text-[#94A3B8]">โหลดข้อมูลไม่สำเร็จ</div>;
  }

  const stats: Array<{ label: string; value: string }> = [
    { label: 'ADR', value: data.adr != null ? data.adr.toFixed(1) : '—' },
    { label: 'AVG ACS', value: data.avg_acs != null ? data.avg_acs.toFixed(1) : '—' },
    { label: 'FIRST BLOOD %', value: data.first_blood_pct != null ? `${data.first_blood_pct}%` : 'ไม่มีข้อมูล' },
    { label: 'HEADSHOT %', value: data.avg_headshot_pct != null ? `${data.avg_headshot_pct}%` : '—' },
  ];

  return (
    <div className="min-h-[300px] bg-[#0D0E1A] p-6">
      {data.read_only && (
        <div className="mb-4 inline-block rounded-full bg-[#F59E0B]/15 px-3 py-1 text-xs font-bold text-[#F59E0B]">
          Read-Only Mode — กรุณาต่ออายุ
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-[#1A1C2E] p-4">
            <p className="text-3xl font-bold text-[#E8B429]">{s.value}</p>
            <p className="mt-1 text-xs text-[#94A3B8]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-[#1A1C2E] p-4">
        <p className="text-xs text-[#94A3B8]">HEATMAP / ECONOMY BREAKDOWN</p>
        <p className="mt-2 text-sm text-[#94A3B8]">
          {data.heatmap || data.round_economy ? 'มีข้อมูล' : 'ยังไม่มีแหล่งข้อมูลดิบสำหรับสถิตินี้ในระบบ (รอทีมยืนยันคอลัมน์จริง)'}
        </p>
      </div>

      {data.data_as_of && (
        <p className="mt-4 text-right text-[10px] text-[#94A3B8]">
          ข้อมูล ณ {new Date(data.data_as_of).toLocaleString('th-TH')}
        </p>
      )}
    </div>
  );
}
