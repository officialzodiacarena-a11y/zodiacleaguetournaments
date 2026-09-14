import React from 'react';

export const OracleReportCard: React.FC = () => {
  return (
    <div className="bg-[#0F111E]/88 backdrop-blur-2xl border border-white/[0.08] rounded-[18px] p-5 border-t-2 border-t-[#8B5CF6] shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-orbitron font-bold text-[#8B5CF6] uppercase tracking-wider flex items-center gap-2">
          <span>🧠</span> ZODIAC ORACLE AI REPORT
        </span>
        <span className="text-[9px] bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30 px-1.5 py-0.5 rounded font-mono font-bold">
          AI V5.0
        </span>
      </div>

      <div className="space-y-2.5 text-xs text-slate-300 font-sans">
        <div className="p-2.5 bg-[#080811]/60 rounded-lg border border-white/[0.08]">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">OPPONENT ANALYSIS</span>
          <strong className="text-white font-orbitron text-xs">ARIES ESPORTS ♈</strong>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Strong utility usage, weak in clutch 1v2 situations. Recommend focus on early map aggression.
          </p>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-[#10B981]/10 border border-[#10B981]/20 rounded-lg">
          <span className="text-[11px] font-mono text-[#10B981] font-bold">PREDICTED WIN CHANCE</span>
          <span className="text-lg font-black font-rajdhani text-[#10B981]">62%</span>
        </div>
      </div>
    </div>
  );
};