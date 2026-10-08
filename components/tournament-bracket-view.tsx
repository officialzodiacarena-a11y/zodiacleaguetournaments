'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { groupBracketRounds, bracketHasLive } from '@/lib/tournament/bracketRounds';
import type { BracketMatchNode, TournamentBracketPageData } from '@/types/bracket';

export type BracketRoundTab = 'all' | 'upper' | 'lower' | 'gf';

interface TournamentBracketViewProps {
  data: TournamentBracketPageData;
}

export function TournamentBracketView({ data }: TournamentBracketViewProps) {
  const [activeTab, setActiveTab] = useState<BracketRoundTab>('all');
  const [selectedMatchNum, setSelectedMatchNum] = useState<number>(1);
  const [showPanel, setShowPanel] = useState<boolean>(true);

  // ดึงรายการ Matches ทั้งหมดจาก Data Source
  const allMatches: BracketMatchNode[] = data.matches || [];

  // ค้นหา Match ที่ถูกเลือก
  const selectedMatch: BracketMatchNode | undefined =
    allMatches.find((m) => m.matchNumber === selectedMatchNum) || allMatches[0];

  // กรองตาม Tab
  const filteredMatches = allMatches.filter((m) => {
    if (activeTab === 'upper') return m.bracketType === 'UPPER';
    if (activeTab === 'lower') return m.bracketType === 'LOWER';
    if (activeTab === 'gf') return m.bracketType === 'GRAND_FINAL';
    return true;
  });

  const rounds = groupBracketRounds(filteredMatches);

  return (
    <div className="min-h-screen bg-[#0D0E1A] text-[#e9e9ed] font-sans pb-16 select-none">
      {/* 2. TOURNAMENT HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8B429]/35 bg-gradient-to-r from-[#161030] via-[#1A1C2E] to-[#0D1420] px-6 md:px-8 py-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-wider text-white leading-none font-mono">
              {data.tournamentName || 'ZODIAC TOURNAMENT BRACKET'}
            </h1>
            <p className="text-xs text-[#9397ab] mt-1.5 font-medium">
              {data.subMetaText || 'Double Elimination 12 Teams — Circuit 2026'}
            </p>
          </div>
          {bracketHasLive(allMatches) && (
            <div className="flex items-center gap-2 rounded-full border border-[#ff3b3b]/35 bg-[#ff3b3b]/15 px-3 py-1 text-xs font-bold text-[#ff3b3b]">
              <span className="h-2 w-2 rounded-full bg-[#ff3b3b] animate-ping" />
              <span>LIVE</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-[#E8B429]">Prize Pool</div>
          <div className="text-base md:text-lg font-extrabold text-white">
            {data.prizeZpText || '—'}
          </div>
        </div>
      </div>

      {/* 3. ROUND TABS */}
      <div className="flex border-b border-white/10 bg-[#0D0E1A] px-6 md:px-8">
        {(
          [
            { id: 'all', label: 'ALL BRACKET' },
            { id: 'upper', label: 'UPPER BRACKET' },
            { id: 'lower', label: 'LOWER BRACKET' },
            { id: 'gf', label: 'GRAND FINAL' },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3.5 px-6 text-xs md:text-sm font-bold tracking-wider transition-all ${
                isActive ? 'border-b-2 border-[#E8B429] text-[#E8B429]' : 'text-[#75798c] hover:text-[#b2b6ca]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 4. MAIN CONTENT (BRACKET CARDS + SIDE PANEL) */}
      <div className="flex flex-col lg:flex-row items-stretch">
        <div className="flex-1 p-6 md:p-8 overflow-x-auto">
          <div className="flex min-w-max items-stretch gap-10" data-testid="bracket-rounds">
            {rounds.map((col) => (
              <div key={col.key} className="flex flex-col" data-round={col.key}>
                <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#75798c]">{col.label}</div>
                <div className="flex flex-1 flex-col justify-around gap-6">
            {col.nodes.map((m) => {
                    const isSelected = selectedMatchNum === m.matchNumber;
                    const isLive = m.status === 'LIVE';
                    const isCompleted = m.status === 'COMPLETED';
                    const isWinnerA = m.winnerTeamId && m.teamA && m.winnerTeamId === m.teamA.id;
                    const isWinnerB = m.winnerTeamId && m.teamB && m.winnerTeamId === m.teamB.id;

                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedMatchNum(m.matchNumber);
                          setShowPanel(true);
                        }}
                        className={`w-[280px] cursor-pointer overflow-hidden rounded-xl border bg-[#1A1C2E] transition-all hover:scale-[1.01] ${!isLive && !isCompleted ? 'opacity-70 hover:opacity-100' : ''} ${
                          isSelected
                            ? 'border-[#E8B429] shadow-[0_0_20px_rgba(232,180,41,0.2)]'
                            : isLive
                            ? 'border-[#ff3b3b]/50 shadow-[0_0_16px_rgba(255,59,59,0.2)]'
                            : 'border-white/10 hover:border-[#E8B429]/40'
                        }`}
                      >
                        {/* Match Header */}
                        <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-3 py-1.5 text-[10px]">
                          <span className="font-semibold text-[#75798c]">
                            MATCH {m.matchNumber}
                          </span>
                          {isCompleted && (
                            <span className="rounded bg-[#4ade80]/15 border border-[#4ade80]/30 px-2 py-0.5 font-bold text-[#4ade80]">
                              COMPLETED
                            </span>
                          )}
                          {isLive && (
                            <span className="flex items-center gap-1 rounded bg-[#ff3b3b]/20 border border-[#ff3b3b]/40 px-2 py-0.5 font-bold text-[#ff3b3b]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#ff3b3b] animate-pulse" />
                              LIVE
                            </span>
                          )}
                          {!isCompleted && !isLive && (
                            <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 font-bold text-[#75798c]">
                              {m.status}
                            </span>
                          )}
                        </div>

                        {/* Team A */}
                        <div className={`flex items-center gap-2.5 p-2.5 border-b border-white/5 ${isWinnerA ? 'bg-[#E8B429]/10' : ''}`}>
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-[#E8B429] to-[#b8891f] text-xs font-black text-[#0D0E1A]">
                            {m.teamA?.tag || 'TBD'}
                          </div>
                          <div className="flex-1 min-w-0">
                            {m.teamA?.seed ? <div className="text-[9px] font-bold text-[#E8B429]">#{m.teamA.seed} SEED</div> : null}
                            <div className="text-xs font-bold text-white truncate">{m.teamA?.name || 'To Be Determined'}</div>
                          </div>
                          <div className="text-lg font-black text-[#E8B429] min-w-5 text-right">{isCompleted || isLive ? (m.scoreA ?? 0) : '—'}</div>
                        </div>

                        {/* Team B */}
                        <div className={`flex items-center gap-2.5 p-2.5 ${isWinnerB ? 'bg-[#E8B429]/10' : 'bg-black/20'}`}>
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-white/10 text-xs font-bold text-[#9397ab]">
                            {m.teamB?.tag || 'TBD'}
                          </div>
                          <div className="flex-1 min-w-0">
                            {m.teamB?.seed ? <div className="text-[9px] font-semibold text-[#75798c]">#{m.teamB.seed} SEED</div> : null}
                            <div className="text-xs font-bold text-[#cfd3e5] truncate">{m.teamB?.name || 'To Be Determined'}</div>
                          </div>
                          <div className="text-lg font-black text-[#75798c] min-w-5 text-right">{isCompleted || isLive ? (m.scoreB ?? 0) : '—'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {filteredMatches.length === 0 && (
            <div className="text-center py-20 text-xs font-mono text-[#75798c]">
              NO MATCHES FOUND FOR THIS STAGE
            </div>
          )}
        </div>

        {/* 5. RIGHT MATCH DETAIL SIDE PANEL */}
        {showPanel && selectedMatch && (
          <div className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-[#E8B429]/30 bg-[#1A1C2E] p-5 flex flex-col justify-between flex-shrink-0">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div>
                  <div className="text-[10px] font-bold tracking-wider text-[#E8B429] uppercase">
                    MATCH #{selectedMatch.matchNumber} DETAIL
                  </div>
                  <h3 className="text-sm font-extrabold text-white mt-0.5">
                    {selectedMatch.teamA?.name || 'TBD'} vs {selectedMatch.teamB?.name || 'TBD'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowPanel(false)}
                  className="flex h-7 w-7 items-center justify-center rounded bg-white/5 text-xs text-[#9397ab] hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              {/* Map Results */}
              {selectedMatch.games && selectedMatch.games.length > 0 && (
                <div className="mb-5" data-testid="map-results">
                  <div className="text-[10px] font-bold tracking-widest text-[#75798c] uppercase mb-2.5">
                    MAP RESULTS · BEST OF {selectedMatch.bestOf || 1}
                  </div>
                  <div className="flex flex-col gap-2">
                    {selectedMatch.games.map((g) => {
                      const done = g.status === 'COMPLETED';
                      const aWon = done && g.scoreA > g.scoreB;
                      const bWon = done && g.scoreB > g.scoreA;
                      return (
                        <div
                          key={g.gameNumber}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                            aWon ? 'border-[#4ade80]/15 bg-[#4ade80]/[0.06]' : bWon ? 'border-[#ff6464]/15 bg-[#ff6464]/[0.06]' : 'border-white/10 bg-white/[0.03]'
                          }`}
                        >
                          <div>
                            <div className="text-[11px] font-bold text-white">{g.mapName || 'TBD'}</div>
                            <div className="text-[10px] text-[#75798c]">
                              Map {g.gameNumber}
                              {g.status === 'LIVE' ? ' · LIVE' : ''}
                            </div>
                          </div>
                          <div className={`text-sm font-extrabold tracking-wide ${aWon ? 'text-[#4ade80]' : bWon ? 'text-[#ff6b6b]' : 'text-[#cfd3e5]'}`}>
                            {g.scoreA} <span className="text-[#75798c]">–</span> {g.scoreB}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Series Result */}
              <div className="mb-5 rounded-lg border border-white/5 bg-gradient-to-br from-[#E8B429]/5 to-transparent p-3">
                <div className="text-[10px] font-bold tracking-widest text-[#75798c] uppercase mb-2.5">
                  SERIES RESULT (BO{selectedMatch.bestOf || 1})
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-center">
                    <div className="mb-1 truncate text-[11px] font-bold text-[#E8B429]">{selectedMatch.teamA?.name || 'TBD'}</div>
                    <div className="text-3xl font-black leading-none text-[#E8B429]">{selectedMatch.scoreA ?? 0}</div>
                  </div>
                  <div className="text-base font-bold text-[#75798c]">:</div>
                  <div className="flex-1 text-center">
                    <div className="mb-1 truncate text-[11px] font-bold text-[#9397ab]">{selectedMatch.teamB?.name || 'TBD'}</div>
                    <div className="text-3xl font-black leading-none text-[#9397ab]">{selectedMatch.scoreB ?? 0}</div>
                  </div>
                </div>
              </div>
            </div>

            {selectedMatch.matchId ? (
              <Link
                href={`/match-result/${selectedMatch.matchId}`}
                className="mt-4 block w-full rounded-lg border border-[#E8B429] bg-transparent py-2.5 text-center text-xs font-bold tracking-wider text-[#E8B429] transition-all hover:bg-[#E8B429]/10"
              >
                ดูสถิติเต็ม / VIEW FULL STATS
              </Link>
            ) : null}
          </div>
        )}
      </div>

      {/* 6. ZP BOTTOM STRIP */}
      <div className="flex flex-wrap items-center gap-6 border-t border-[#E8B429]/20 bg-gradient-to-r from-[#E8B429]/10 via-[#9184d9]/10 to-[#E8B429]/10 px-6 md:px-8 py-3 mt-auto">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#E8B429] shadow-[0_0_8px_#E8B429]" />
          <span className="text-xs font-bold text-[#E8B429]">ZP ที่จะได้รับ</span>
        </div>
        {data.prizeZp ? (
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-[#9397ab]">แชมป์ → </span>
              <span className="font-extrabold text-[#E8B429]">+{data.prizeZp.toLocaleString('en-US')} ZP 🏆</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
