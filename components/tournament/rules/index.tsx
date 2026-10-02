import React from 'react';
import { SingleEliminationRule } from './SingleEliminationRule';
import { DoubleEliminationRule } from './DoubleEliminationRule';
import { SwissRule } from './SwissRule';
import { RoundRobinRule } from './RoundRobinRule';
import { GroupStageRule } from './GroupStageRule';
import { ZodiacArenaSystemRule } from './ZodiacArenaSystemRule';

// Export all individual components just in case
export {
  SingleEliminationRule,
  DoubleEliminationRule,
  SwissRule,
  RoundRobinRule,
  GroupStageRule,
  ZodiacArenaSystemRule,
};

// Map of formats to their components
const RULE_COMPONENTS: Record<string, React.ElementType<{ bestOfText?: string }>> = {
  SINGLE_ELIMINATION: SingleEliminationRule,
  DOUBLE_ELIMINATION: DoubleEliminationRule,
  SWISS: SwissRule,
  ROUND_ROBIN: RoundRobinRule,
  GROUP_STAGE: GroupStageRule,
  ZODIAC_ARENA_SYSTEM: ZodiacArenaSystemRule,
};

export interface SelectedRuleFormat {
  formatValue: string; // e.g. 'SINGLE_ELIMINATION'
  bestOfPresetValue?: string; // e.g. 'BO3_ALL', or custom text
}

interface TournamentRulesRendererProps {
  selectedFormats: SelectedRuleFormat[];
}

function getBestOfText(presetValue?: string) {
  switch (presetValue) {
    case 'BO1_ALL': return 'Bo1 ทุกรอบ';
    case 'BO2_ALL': return 'Bo2 ทุกรอบ';
    case 'BO3_ALL': return 'Bo3 ทุกรอบ';
    case 'BO1_FINALS_BO3': return 'Bo1 (รอบปกติ) / Bo3 (รอบรองฯ และ ชิงชนะเลิศ)';
    default: return presetValue || 'ตามประกาศแต่ละรอบ';
  }
}

/**
 * Component สำหรับเรนเดอร์กฎกติกาแบบต่อกันยาวลงมา 
 * (ตามที่แอดมินเลือกหลายรูปแบบผสมกันได้ใน 1 ทัวร์นาเมนต์)
 */
export function TournamentRulesRenderer({ selectedFormats }: TournamentRulesRendererProps) {
  if (!selectedFormats || selectedFormats.length === 0) {
    return (
      <div className="text-center p-12 bg-[#0a0a0a] border border-amber-500/20 rounded-xl text-zinc-500">
        ยังไม่ได้ระบุกฎกติการูปแบบการแข่งขัน
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 w-full">
      {selectedFormats.map((rule, idx) => {
        const Component = RULE_COMPONENTS[rule.formatValue];
        if (!Component) return null;
        
        return (
          <div key={`${rule.formatValue}-${idx}`} className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both" style={{ animationDelay: `${idx * 150}ms` }}>
            <Component bestOfText={getBestOfText(rule.bestOfPresetValue)} />
          </div>
        );
      })}
    </div>
  );
}
