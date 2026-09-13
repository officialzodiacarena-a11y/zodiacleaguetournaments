import React from 'react';

export const ApQuestCard: React.FC = () => {
  return (
    <div className="bg-[#0F111E]/88 backdrop-blur-2xl border border-white/[0.08] rounded-[18px] p-5 border-t-2 border-t-[#06B6D4] shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-orbitron font-bold text-[#06B6D4] uppercase tracking-wider flex items-center gap-2">
          <span>🏆</span> DAILY AP QUEST PROGRESS
        </span>
        <span className="text-[11px] font-mono text-[#06B6D4] font-bold">50 AP</span>
      </div>

      <p className="text-xs text-slate-300 font-medium">
        Quest: Get 3 First Kills in a single tournament match.
      </p>

      <div className="mt-3">
        <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
          <span>PROGRESS</span>
          <span className="text-white font-bold">1 / 3 COMPLETED</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#15182A] border border-white/[0.08] overflow-hidden p-[1px]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6]" style={{ width: '33.3%' }}></div>
        </div>
      </div>
    </div>
  );
};