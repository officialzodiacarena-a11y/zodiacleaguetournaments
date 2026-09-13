import React from 'react';

export const ZodiacBuffCard: React.FC = () => {
  return (
    <div className="bg-[#0F111E]/88 backdrop-blur-2xl border border-white/[0.08] rounded-[18px] p-5 border-t-2 border-t-[#F59E0B] shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-orbitron font-bold text-[#F59E0B] uppercase tracking-wider flex items-center gap-2">
          <span>☀️</span> ACTIVE ZODIAC BUFF
        </span>
        <span className="text-[10px] text-[#10B981] font-mono font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span> ACTIVE
        </span>
      </div>

      <div className="p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/25 rounded-xl my-2">
        <span className="text-xs font-black font-orbitron text-[#F59E0B] block">
          +5% ACS BONUS IN SPLIT 2
        </span>
        <span className="text-[11px] font-mono text-slate-300 block mt-0.5">
          LEO CONSTELLATION ALIGNMENT
        </span>
        <p className="text-[10px] text-slate-400 mt-1">
          Active title applied: <strong className="text-white">Solar Vanguard</strong>
        </p>
      </div>
    </div>
  );
};