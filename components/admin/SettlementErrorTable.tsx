'use client';

import { useState } from 'react';

// UI/UX Spec status: Pending Prototype — see PredictionPoolCard.tsx note.

interface ErrorPoolRow {
  pool_id: string;
  match_id: string;
  status: string;
  stuck_minutes: number;
}

interface SettlementErrorTableProps {
  initialPools: ErrorPoolRow[];
}

export function SettlementErrorTable({ initialPools }: SettlementErrorTableProps) {
  const [pools, setPools] = useState(initialPools);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [winningTeamInputs, setWinningTeamInputs] = useState<Record<string, string>>({});

  async function handleRetry(poolId: string) {
    const winningTeamId = winningTeamInputs[poolId];
    if (!winningTeamId) {
      window.alert('กรุณาระบุ winning_team_id ก่อน retry');
      return;
    }
    setBusyId(poolId);
    try {
      const res = await fetch(`/api/v1/admin/predictions/pools/${poolId}/retry-settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ winning_team_id: winningTeamId }),
      });
      const json = await res.json();
      if (!res.ok) {
        window.alert(`Retry ไม่สำเร็จ: ${json.error?.message ?? 'unknown error'}`);
        return;
      }
      setPools((prev) => prev.filter((p) => p.pool_id !== poolId));
    } finally {
      setBusyId(null);
    }
  }

  if (pools.length === 0) {
    return <p className="text-sm text-[#94A3B8]">ไม่มี Pool ที่ติดสถานะ SETTLEMENT_ERROR</p>;
  }

  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="text-[#94A3B8]">
          <th className="pb-2">Pool ID</th>
          <th className="pb-2">Match ID</th>
          <th className="pb-2">ค้างมา (นาที)</th>
          <th className="pb-2">Winning Team ID</th>
          <th className="pb-2" />
        </tr>
      </thead>
      <tbody>
        {pools.map((p) => (
          <tr key={p.pool_id} className="border-t border-[#F59E0B]/20 bg-[#F59E0B]/5">
            <td className="py-2 font-mono text-[#F9EDD8]">{p.pool_id.slice(0, 8)}</td>
            <td className="py-2 font-mono text-[#F9EDD8]">{p.match_id.slice(0, 8)}</td>
            <td className="py-2 text-[#F59E0B]">{p.stuck_minutes} นาที</td>
            <td className="py-2">
              <input
                value={winningTeamInputs[p.pool_id] ?? ''}
                onChange={(e) => setWinningTeamInputs((prev) => ({ ...prev, [p.pool_id]: e.target.value }))}
                placeholder="UUID"
                className="w-40 rounded bg-[#12142A] px-2 py-1 text-[#F9EDD8]"
              />
            </td>
            <td className="py-2">
              <button
                type="button"
                disabled={busyId === p.pool_id}
                onClick={() => handleRetry(p.pool_id)}
                className="rounded bg-[#E8B429] px-3 py-1 font-bold text-[#0D0E1A] disabled:opacity-40"
              >
                Retry
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
