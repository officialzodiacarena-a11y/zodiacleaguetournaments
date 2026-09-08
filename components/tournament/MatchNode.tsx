'use client';

import React from 'react';
import type { BracketMatchNode } from '@/types/bracket';

interface MatchNodeProps {
  node: BracketMatchNode;
  isAdminMode?: boolean;
  onMatchClick?: (nodeId: string) => void;
}

export const MatchNode: React.FC<MatchNodeProps> = ({
  node,
  isAdminMode = false,
  onMatchClick,
}) => {
  const isLive = node.status === 'LIVE';
  const isCompleted = node.status === 'COMPLETED';
  const isReady = node.status === 'READY';
  const isClickable = isAdminMode || isLive || isCompleted || isReady;

  const getCardStyles = () => {
    if (isLive) {
      return 'border-[#dc3232]/60 bg-gradient-to-r from-[#b41e1e]/20 via-[#1A1C2E] to-[#1A1C2E] shadow-[0_0_15px_rgba(220,50,50,0.25)]';
    }
    if (isCompleted) {
      return 'border-white/10 bg-[#1A1C2E] hover:border-[#E8B429]/40';
    }
    if (isReady) {
      return 'border-[#E8B429]/50 bg-[#1A1C2E] shadow-[0_0_12px_rgba(232,180,41,0.15)]';
    }
    return 'border-white/5 bg-[#121422]/70 opacity-60';
  };

  const isTeamAWinner = isCompleted && Boolean(node.winnerTeamId) && node.winnerTeamId === node.teamA?.id;
  const isTeamBWinner = isCompleted && Boolean(node.winnerTeamId) && node.winnerTeamId === node.teamB?.id;

  return (
    <div
      onClick={() => isClickable && onMatchClick?.(node.id)}
      className={`relative w-64 rounded-xl border p-3 transition-all duration-200 ${getCardStyles()} ${
        isClickable ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'
      }`}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between text-[9px] font-bold tracking-wider mb-2">
        <span className="text-[#75798c] uppercase">
          {node.label || `M${node.positionInRound}`}
        </span>
        <div className="flex items-center gap-1.5">
          {isLive && (
            <span className="flex items-center gap-1 text-[#ff4444] animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff4444]" />
              LIVE
            </span>
          )}
          {node.bestOf && (
            <span className="text-[#9397ab] bg-white/5 px-1.5 py-0.5 rounded">
              BO{node.bestOf}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {/* Team A Row */}
        <div
          className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
            isTeamAWinner
              ? 'bg-[#E8B429]/15 text-[#E8B429] font-bold'
              : 'text-[#e9e9ed] bg-black/20'
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="truncate">
              {node.teamA?.name ?? (node.teamA ? 'Loading...' : 'TBD')}
            </span>
          </div>
          {node.scoreA !== undefined && node.scoreA !== null && (
            <span
              className={`font-mono text-xs font-black ${
                isTeamAWinner ? 'text-[#E8B429]' : 'text-[#75798c]'
              }`}
            >
              {node.scoreA}
            </span>
          )}
        </div>

        {/* Team B Row */}
        <div
          className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
            isTeamBWinner
              ? 'bg-[#E8B429]/15 text-[#E8B429] font-bold'
              : 'text-[#e9e9ed] bg-black/20'
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="truncate">
              {node.teamB?.name ?? (node.teamB ? 'Loading...' : 'TBD')}
            </span>
          </div>
          {node.scoreB !== undefined && node.scoreB !== null && (
            <span
              className={`font-mono text-xs font-black ${
                isTeamBWinner ? 'text-[#E8B429]' : 'text-[#75798c]'
              }`}
            >
              {node.scoreB}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
