// components/tournament-bracket-view.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TournamentBracketPageData, BracketRoundTab, BracketMatchNode } from '@/types/bracket';

export function TournamentBracketView({ data }: { data: TournamentBracketPageData }) {
  const [activeTab, setActiveTab] = useState<BracketRoundTab>('ro8');
  const [selectedMatchNum, setSelectedMatchNum] = useState<number>(1);
  const [showPanel, setShowPanel] = useState<boolean>(true);

  // นำ Type BracketMatchNode มาใช้งานจริงในการระบุชนิดข้อมูลตัวแปร
  const selectedMatch: BracketMatchNode =
    data.qfMatches.find((m: BracketMatchNode) => m.matchNumber === selectedMatchNum) || data.qfMatches[0];

  return (
    <div className="min-h-screen bg-[#0D0E1A] text-[#e9e9ed] font-sans pb-16">
      {/* 1. TOP NAVBAR */}
      <nav className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[#E8B429]/20 bg-[#0D0E1A]/95 px-6 md:px-8 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#E8B429] font-black text-sm text-[#0D0E1A]">
            ZA
          </div>
          <span className="font-extrabold text-sm tracking-wider text-white">
            ZODIAC<span className="text-[#E8B429]">ARENA</span>
          </span>
        </div>
        <div className="flex gap-7 text-[13px] font-medium text-[#9397ab]">
          <Link href="#" className="hover:text-white transition-colors">นักกีฬา</Link>
          <Link href="/teams/team_za_01" className="hover:text-white transition-colors">ทีม</Link>
          <Link href="/tournaments" className="hover:text-white transition-colors">ลีก</Link>
          <Link href="/schedule" className="text-[#E8B429]">Rankings</Link>
        </div>
      </nav>

      {/* 2. TOURNAMENT HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8B429]/35 bg-gradient-to-r from-[#161030] via-[#1A1C2E] to-[#0D1420] px-6 md:px-8 py-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-wider text-white leading-none">{data.tournamentName}</h1>
            <p className="text-xs text-[#9397ab] mt-1.5 font-medium">{data.subMetaText}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#ff3b3b]/35 bg-[#ff3b3b]/15 px-3 py-1 text-xs font-bold text-[#ff3b3b]">
            <span className="h-2 w-2 rounded-full bg-[#ff3b3b] animate-ping" />
            <span>LIVE</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-[#E8B429]">Prize Pool</div>
          <div className="text-base md:text-lg font-extrabold text-white">{data.prizePoolText}</div>
        </div>
      </div>

      {/* 3. ROUND TABS */}
      <div className="flex border-b border-white/10 bg-[#0D0E1A] px-6 md:px-8">
        {(['ro8', 'semi', 'final'] as BracketRoundTab[]).map((tab) => {
          const label = tab === 'ro8' ? 'ROUND OF 8' : tab === 'semi' ? 'SEMI-FINALS' : 'GRAND FINAL';
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3.5 px-6 text-xs md:text-sm font-bold tracking-wider transition-all ${
                isActive ? 'border-b-2 border-[#E8B429] text-[#E8B429]' : 'text-[#75798c] hover:text-[#b2b6ca]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 4. MAIN CONTENT (BRACKET TREE + SIDE PANEL) */}
      <div className="flex flex-col lg:flex-row items-stretch">
        {/* Left: Bracket Tree Area */}
        <div className="flex-1 p-6 md:p-8 overflow-x-auto">
          <div className="flex items-center min-w-[700px] gap-0 relative">
            {/* QF Column */}
            <div className="w-[300px] flex-shrink-0">
              <div className="text-[10px] font-bold tracking-widest text-[#75798c] uppercase mb-4">Quarter-Finals</div>
              <div className="flex flex-col gap-6">
                {data.qfMatches.map((m: BracketMatchNode) => {
                  const isSelected = selectedMatchNum === m.matchNumber;
                  const isLive = m.status === 'LIVE';
                  const isCompleted = m.status === 'COMPLETED';

                  return (
                    <div
                      key={m.matchNumber}
                      onClick={() => {
                        setSelectedMatchNum(m.matchNumber);
                        setShowPanel(true);
                      }}
                      className={`cursor-pointer overflow-hidden rounded-xl border bg-[#1A1C2E] transition-all hover:scale-[1.01] ${
                        isSelected
                          ? 'border-[#E8B429] shadow-[0_0_20px_rgba(232,180,41,0.2)]'
                          : isLive
                          ? 'border-[#ff3b3b]/50 shadow-[0_0_16px_rgba(255,59,59,0.2)]'
                          : 'border-white/10 hover:border-[#E8B429]/40'
                      }`}
                    >
                      {/* Match Header */}
                      <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-3 py-1.5 text-[10px]">
                        <span className="font-semibold text-[#75798c]">MATCH {m.matchNumber}</span>
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
                            UPCOMING
                          </span>
                        )}
                      </div>

                      {/* Team A */}
                      <div className={`flex items-center gap-2.5 p-2.5 border-b border-white/5 ${m.teamA.isWinner ? 'bg-[#E8B429]/10' : ''}`}>
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-[#E8B429] to-[#b8891f] text-xs font-black text-[#0D0E1A]">
                          {m.teamA.tag}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[9px] font-bold text-[#E8B429]">{m.teamA.seedText}</div>
                          <div className="text-xs font-bold text-white truncate">{m.teamA.name}</div>
                        </div>
                        <div className="text-lg font-black text-[#E8B429] min-w-5 text-right">{m.teamA.score ?? '—'}</div>
                      </div>

                      {/* Team B */}
                      <div className="flex items-center gap-2.5 p-2.5 bg-black/20">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-white/10 text-xs font-bold text-[#9397ab]">
                          {m.teamB.tag}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[9px] font-semibold text-[#75798c]">{m.teamB.seedText}</div>
                          <div className="text-xs font-bold text-[#cfd3e5] truncate">{m.teamB.name}</div>
                        </div>
                        <div className="text-lg font-black text-[#75798c] min-w-5 text-right">{m.teamB.score ?? '—'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connecting SVG */}
            <svg width="60" height="520" className="flex-shrink-0 overflow-visible mt-6">
              <path d="M 0 58 H 20 V 154 H 40" stroke="rgba(255,255,255,0.15)" fill="none" strokeWidth="1.5" />
              <path d="M 0 250 H 20 V 154 H 40" stroke="rgba(255,255,255,0.15)" fill="none" strokeWidth="1.5" />
              <circle cx="40" cy="154" r="3" fill="#E8B429" />
              <path d="M 0 346 H 20 V 442 H 40" stroke="rgba(255,255,255,0.1)" fill="none" strokeWidth="1.5" />
              <path d="M 0 442 H 20" stroke="rgba(255,255,255,0.1)" fill="none" strokeWidth="1.5" />
            </svg>

            {/* Semi-Finals Nodes */}
            <div className="w-[220px] flex-shrink-0 flex flex-col gap-24 mt-6">
              <div className="text-[10px] font-bold tracking-widest text-[#75798c] uppercase -mb-18">Semi-Finals</div>
              {/* SF 1 */}
              <div className="rounded-xl border border-dashed border-white/20 bg-[#1A1C2E]/60 p-3">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-[#E8B429] text-[10px] font-black text-[#0D0E1A]">ZA</span>
                  <span className="text-xs font-bold text-white">ZODIAC APEX</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#75798c]">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-white/5 text-[10px]">TBD</span>
                  <span>TBD</span>
                </div>
              </div>

              {/* SF 2 */}
              <div className="rounded-xl border border-dashed border-white/10 bg-[#1A1C2E]/40 p-3 opacity-60">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2 text-xs font-semibold text-[#75798c]">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-white/5 text-[10px]">TBD</span>
                  <span>TBD</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#75798c]">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-white/5 text-[10px]">TBD</span>
                  <span>TBD</span>
                </div>
              </div>
            </div>

            {/* Connecting SVG */}
            <svg width="40" height="420" className="flex-shrink-0 overflow-visible mt-6">
              <path d="M 0 100 H 15 V 210 H 30" stroke="rgba(255,255,255,0.15)" fill="none" strokeWidth="1.5" />
            </svg>

            {/* Grand Final Node */}
            <div className="w-[220px] flex-shrink-0 mt-32">
              <div className="text-[10px] font-bold tracking-widest text-[#75798c] uppercase mb-4">Grand Final</div>
              <div className="rounded-xl border border-dashed border-[#E8B429]/40 bg-[#1A1C2E]/60 p-3 shadow-[0_0_20px_rgba(232,180,41,0.1)]">
                <div className="text-[10px] font-bold text-[#E8B429] mb-2">🏆 GRAND FINAL</div>
                <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2 text-xs font-semibold text-[#E8B429]/50">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-[#E8B429]/10 text-[10px]">TBD</span>
                  <span>TBD</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#E8B429]/50">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-[#E8B429]/10 text-[10px]">TBD</span>
                  <span>TBD</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Side Match Detail Panel */}
        {showPanel && (
          <div className="w-full lg:w-[320px] border-t lg:border-t-0 lg:border-l border-[#E8B429]/30 bg-[#1A1C2E] p-5 flex flex-col justify-between flex-shrink-0">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div>
                  <div className="text-[10px] font-bold tracking-wider text-[#E8B429] uppercase">
                    MATCH {selectedMatch.matchNumber} DETAIL
                  </div>
                  <h3 className="text-sm font-extrabold text-white mt-0.5">
                    {selectedMatch.teamA.name} vs {selectedMatch.teamB.name}
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
              {selectedMatch.mapResults && (
                <div className="mb-5">
                  <div className="text-[10px] font-bold tracking-widest text-[#75798c] uppercase mb-2.5">
                    MAP RESULTS · BEST OF 3
                  </div>
                  <div className="flex flex-col gap-2">
                    {selectedMatch.mapResults.map((mapItem, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between rounded-lg border p-2.5 text-xs ${
                          mapItem.isWinA
                            ? 'border-[#4ade80]/20 bg-[#4ade80]/5'
                            : 'border-[#ff6b6b]/20 bg-[#ff6b6b]/5'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-white">{mapItem.mapName}</div>
                          <div className="text-[10px] text-[#75798c]">{mapItem.mapNumberLabel}</div>
                        </div>
                        <div className={`font-black text-sm ${mapItem.isWinA ? 'text-[#4ade80]' : 'text-[#ff6b6b]'}`}>
                          {mapItem.scoreA} <span className="text-[#75798c] text-xs">–</span> {mapItem.scoreB}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Series Result */}
              {selectedMatch.seriesScoreText && (
                <div className="mb-5 rounded-lg border border-white/5 bg-gradient-to-br from-[#E8B429]/5 to-transparent p-3 text-center">
                  <div className="text-[10px] font-bold tracking-widest text-[#75798c] uppercase mb-1">SERIES RESULT</div>
                  <div className="text-2xl font-black text-[#E8B429]">{selectedMatch.seriesScoreText}</div>
                </div>
              )}

              {/* MVP */}
              {selectedMatch.mvp && (
                <div className="mb-5">
                  <div className="text-[10px] font-bold tracking-widest text-[#75798c] uppercase mb-2">MVP OF THE MATCH</div>
                  <div className="flex items-center gap-3 rounded-xl border border-[#E8B429]/30 bg-gradient-to-r from-[#E8B429]/15 to-transparent p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#E8B429] to-[#9184d9] font-black text-xs text-[#0D0E1A]">
                      {selectedMatch.mvp.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-extrabold text-[#E8B429]">{selectedMatch.mvp.handle}</div>
                      <div className="flex items-center gap-3 text-[11px] text-[#9397ab] mt-0.5">
                        <span><strong className="text-white">{selectedMatch.mvp.acs}</strong> ACS</span>
                        <span>K/D <strong className="text-white">{selectedMatch.mvp.kd}</strong></span>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#E8B429]/20 border border-[#E8B429]/40 px-2 py-0.5 text-[9px] font-bold text-[#E8B429]">
                      MVP
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button className="w-full rounded-lg border border-[#E8B429] bg-transparent py-2.5 text-xs font-bold tracking-wider text-[#E8B429] hover:bg-[#E8B429]/10 transition-all mt-4">
              ดูสถิติเต็ม / VIEW FULL STATS
            </button>
          </div>
        )}
      </div>

      {/* 5. ZP BOTTOM STRIP */}
      <div className="flex flex-wrap items-center gap-6 border-t border-[#E8B429]/20 bg-gradient-to-r from-[#E8B429]/10 via-[#9184d9]/10 to-[#E8B429]/10 px-6 md:px-8 py-3 mt-auto">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#E8B429] shadow-[0_0_8px_#E8B429]" />
          <span className="text-xs font-bold text-[#E8B429]">ZP ที่จะได้รับ</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-[#9397ab]">ชนะรอบนี้ → </span>
            <span className="font-extrabold text-white">+300 ZP</span>
          </div>
          <div className="h-3 w-[1px] bg-white/20" />
          <div>
            <span className="text-[#9397ab]">แชมป์ → </span>
            <span className="font-extrabold text-[#E8B429]">+1,000 ZP 🏆</span>
          </div>
        </div>
      </div>
    </div>
  );
}
