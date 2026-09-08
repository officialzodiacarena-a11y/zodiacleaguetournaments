'use client';

import React, { useMemo, useState } from 'react';

export interface PersonalMatchRecord {
  matchId: string;
  gameNumber: number;
  mapName: string;
  agentPlayed: string;
  kda: string;
  result: 'WIN' | 'LOSS' | 'PENDING';
  status: string;
  date: string | null;
}

interface MatchesMatrixViewProps {
  records: PersonalMatchRecord[];
}

export function MatchesMatrixView({ records }: MatchesMatrixViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [agentFilter, setAgentFilter] = useState('ALL');
  const [resultFilter, setResultFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  const agents = useMemo(() => Array.from(new Set(records.map((r) => r.agentPlayed))).sort(), [records]);

  const filtered = records.filter((r) => {
    const matchSearch =
      r.matchId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.mapName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.agentPlayed.toLowerCase().includes(searchTerm.toLowerCase());
    const matchAgent = agentFilter === 'ALL' || r.agentPlayed === agentFilter;
    const matchResult = resultFilter === 'ALL' || r.result === resultFilter;
    return matchSearch && matchAgent && matchResult;
  });

  return (
    <div className="min-h-screen bg-[#07090E] text-white pt-24 pb-12 px-4 md:px-8 flex flex-col items-center font-mono selection:bg-[#00D4FF] selection:text-black">
      <div className="absolute inset-0 bg-[radial-gradient(#00D4FF_1px,transparent_1px)] bg-size-[28px_28px] opacity-10 pointer-events-none" />

      <header className="w-full max-w-6xl border-b border-[#00D4FF]/20 pb-4 mb-6 z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse" />
            <span className="text-[#00D4FF] text-xs tracking-widest uppercase font-bold">PERSONAL MATCH LOG</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-wider text-white mt-1">QUICK DRAFT MATRIX</h1>
        </div>

        <div className="flex items-center gap-2 bg-[#12121A] p-1.5 rounded-xl border border-[#00D4FF]/30">
          <button
            onClick={() => setViewMode('card')}
            className={`cursor-pointer px-3 py-1.5 text-xs rounded-lg font-bold transition-all ${
              viewMode === 'card' ? 'bg-[#00D4FF] text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Tactical Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`cursor-pointer px-3 py-1.5 text-xs rounded-lg font-bold transition-all ${
              viewMode === 'table' ? 'bg-[#00D4FF] text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Data Matrix (Table)
          </button>
        </div>
      </header>

      <div className="w-full max-w-6xl bg-[#12121A] border border-[#00D4FF]/30 p-4 rounded-xl mb-6 z-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-65">
          <input
            type="text"
            placeholder="Search Match ID, Map, or Agent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#07090E] border border-gray-800 focus:border-[#00D4FF] px-4 py-2 rounded-lg text-xs text-white placeholder-gray-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="bg-[#07090E] border border-gray-800 px-3 py-2 rounded-lg text-xs text-gray-300 outline-none focus:border-[#00D4FF]"
          >
            <option value="ALL">All Agents</option>
            {agents.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="bg-[#07090E] border border-gray-800 px-3 py-2 rounded-lg text-xs text-gray-300 outline-none focus:border-[#00D4FF]"
          >
            <option value="ALL">All Results</option>
            <option value="WIN">Victory Only</option>
            <option value="LOSS">Defeat Only</option>
            <option value="PENDING">Pending Only</option>
          </select>
        </div>
      </div>

      <div className="w-full max-w-6xl z-10">
        {filtered.length === 0 ? (
          <div className="text-center text-xs text-gray-500 py-16">ยังไม่มีประวัติการแข่งขันที่ตรงกับตัวกรอง</div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((m, idx) => (
              <div
                key={`${m.matchId}-${m.gameNumber}-${idx}`}
                className={`p-4 bg-[#12121A] rounded-xl border transition-all ${
                  m.result === 'WIN'
                    ? 'border-green-500/30 hover:border-green-500'
                    : m.result === 'LOSS'
                    ? 'border-red-500/30 hover:border-red-500'
                    : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="flex justify-between items-center border-b border-gray-800 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-bold">MAP {m.gameNumber} · {m.mapName}</span>
                  </div>
                  <span
                    className={`text-xs font-black ${
                      m.result === 'WIN' ? 'text-green-400' : m.result === 'LOSS' ? 'text-red-400' : 'text-gray-400'
                    }`}
                  >
                    {m.result}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-bold text-white">{m.agentPlayed}</div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      {m.date ? new Date(m.date).toLocaleDateString('th-TH') : m.status}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">K/D/A</div>
                    <div className="text-sm font-black text-white">{m.kda}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#12121A] border border-[#00D4FF]/30 rounded-xl overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800 bg-[#07090E]/80">
                  <th className="p-3.5">MAP</th>
                  <th className="p-3.5">AGENT</th>
                  <th className="p-3.5">RESULT</th>
                  <th className="p-3.5">K/D/A</th>
                  <th className="p-3.5 text-right">DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map((m, idx) => (
                  <tr key={`${m.matchId}-${m.gameNumber}-${idx}`} className="hover:bg-white/2">
                    <td className="p-3.5 text-gray-400 font-bold">MAP {m.gameNumber} · {m.mapName}</td>
                    <td className="p-3.5 text-white font-bold">{m.agentPlayed}</td>
                    <td
                      className={`p-3.5 font-black ${
                        m.result === 'WIN' ? 'text-green-400' : m.result === 'LOSS' ? 'text-red-400' : 'text-gray-400'
                      }`}
                    >
                      {m.result}
                    </td>
                    <td className="p-3.5 text-white font-mono">{m.kda}</td>
                    <td className="p-3.5 text-right text-gray-400">
                      {m.date ? new Date(m.date).toLocaleDateString('th-TH') : m.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
