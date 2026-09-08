'use client';

import React, { useState } from 'react';

export interface SwissStanding {
    rank: number;
    teamId: string;
    name: string;
    tag: string;
    wins: number;
    losses: number;
}

export interface WeeklyBracketMatch {
    id: string;
    roundNumber: number;
    label?: string | null;
    status: string;
    teamAName: string | null;
    teamBName: string | null;
}

interface WeeklyTournamentViewProps {
    tournamentName: string;
    entryFeeAp: number;
    swissRoundLabel: string;
    standings: SwissStanding[];
    bracketLabel: string;
    bracketMatches: WeeklyBracketMatch[];
}

export function WeeklyTournamentView({
    tournamentName,
    entryFeeAp,
    swissRoundLabel,
    standings,
    bracketLabel,
    bracketMatches,
}: WeeklyTournamentViewProps) {
    const [activeTab, setActiveTab] = useState<'swiss' | 'bracket'>('bracket');

    const roundsByNumber = new Map<number, WeeklyBracketMatch[]>();
    for (const m of bracketMatches) {
        const list = roundsByNumber.get(m.roundNumber) ?? [];
        list.push(m);
        roundsByNumber.set(m.roundNumber, list);
    }
    const roundNumbers = Array.from(roundsByNumber.keys()).sort((a, b) => a - b);

    return (
        <div className="min-h-screen bg-[#090D14] text-white p-6 md:p-10 font-sans">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Banner */}
                <div className="relative overflow-hidden bg-linear-to-r from-[#161B22] via-[#0D1117] to-[#1F242C] border border-cyan-500/30 rounded-2xl p-6 md:p-8 shadow-2xl">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <span className="text-xs font-mono px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                                WEEKLY LEAGUE
                            </span>
                            <h1 className="text-3xl font-black tracking-wide text-gray-100 mt-2">
                                {tournamentName}
                            </h1>
                            <p className="text-sm text-gray-400 mt-1 font-mono">
                                {swissRoundLabel} → {bracketLabel}
                            </p>
                        </div>

                        <div className="flex items-center gap-6 bg-[#0B0E14]/80 px-6 py-4 rounded-xl border border-gray-800">
                            <div className="text-right">
                                <div className="text-xs text-gray-400 font-mono">ENTRY FEE</div>
                                <div className="text-2xl font-black text-amber-400 font-mono">{entryFeeAp} AP</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex gap-4 border-b border-gray-800 pb-3">
                    <button
                        onClick={() => setActiveTab('bracket')}
                        className={`px-5 py-2 rounded-lg font-mono text-sm font-bold transition-all cursor-pointer ${activeTab === 'bracket'
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,210,255,0.2)]'
                                : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        {bracketLabel.toUpperCase()}
                    </button>
                    <button
                        onClick={() => setActiveTab('swiss')}
                        className={`px-5 py-2 rounded-lg font-mono text-sm font-bold transition-all cursor-pointer ${activeTab === 'swiss'
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,210,255,0.2)]'
                                : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        {swissRoundLabel.toUpperCase()} STANDINGS
                    </button>
                </div>

                {/* Tab 1: Bracket */}
                {activeTab === 'bracket' && (
                    <div className="bg-[#0D1117] border border-gray-800 rounded-xl p-6 shadow-2xl overflow-x-auto">
                        <h2 className="text-sm font-mono font-bold uppercase text-gray-300 mb-6">
                            {bracketLabel}
                        </h2>

                        {roundNumbers.length === 0 ? (
                            <div className="text-center text-xs text-gray-500 py-10">ยังไม่มีผังสายแข่งของสเตจนี้</div>
                        ) : (
                            <div className="flex justify-between items-start gap-6 py-4 font-mono min-w-175">
                                {roundNumbers.map((roundNum) => (
                                    <div key={roundNum} className="flex-1 space-y-4">
                                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Round {roundNum}</div>
                                        {(roundsByNumber.get(roundNum) ?? []).map((m) => (
                                            <div key={m.id} className="bg-[#161B22] border border-gray-800 rounded-lg p-2.5 space-y-1.5">
                                                <div className={`flex justify-between text-xs px-2 py-1 rounded ${m.status === 'COMPLETED' ? 'bg-cyan-950/40 border border-cyan-500/50 text-cyan-300 font-bold' : 'text-gray-300'}`}>
                                                    <span>{m.teamAName ?? 'TBD'}</span>
                                                </div>
                                                <div className="flex justify-between text-xs px-2 py-1 rounded text-gray-500">
                                                    <span>{m.teamBName ?? 'TBD'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 2: Swiss Standings Table */}
                {activeTab === 'swiss' && (
                    <div className="bg-[#0D1117] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
                        <div className="p-5 border-b border-gray-800">
                            <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-gray-300">
                                {swissRoundLabel} Standings
                            </h2>
                        </div>
                        {standings.length === 0 ? (
                            <div className="text-center text-xs text-gray-500 py-10">ยังไม่มีแมตช์ที่จบในสเตจนี้</div>
                        ) : (
                            <table className="w-full text-left text-sm font-mono">
                                <thead className="bg-[#161B22] text-xs text-gray-400 uppercase border-b border-gray-800">
                                    <tr>
                                        <th className="py-3 px-4">Rank</th>
                                        <th className="py-3 px-4">Team</th>
                                        <th className="py-3 px-4">W - L Record</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/60">
                                    {standings.map((s) => (
                                        <tr key={s.teamId} className="hover:bg-[#161B22]/50">
                                            <td className="py-3 px-4 font-bold text-amber-400">#{s.rank}</td>
                                            <td className="py-3 px-4 font-bold text-gray-200">{s.name} <span className="text-gray-500 text-xs">[{s.tag}]</span></td>
                                            <td className="py-3 px-4 text-emerald-400">{s.wins} - {s.losses}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
