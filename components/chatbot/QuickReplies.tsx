const PRESET_QUESTIONS = [
  { emoji: '💳', text: 'แต้ม AP ฉันมีเท่าไหร่?' },
  { emoji: '🛢️', text: 'สินค้า SINOPEC มีอะไรบ้าง?' },
  { emoji: '⛽', text: 'แลกน้ำมันเครื่อง SINOPEC ต้องใช้กี่แต้ม?' },
  { emoji: '🏆', text: 'ทัวร์นาเมนต์ถัดไปคือเมื่อไหร่?' },
  { emoji: '📺', text: 'Watch-to-Earn ได้วันละกี่แต้ม?' },
];

export function QuickReplies({ onSelect, disabled }: { onSelect: (text: string) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_QUESTIONS.map((q) => (
        <button
          key={q.text}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(q.text)}
          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[#F9EDD8] transition-colors hover:border-[#E8B429]/50 hover:bg-[#E8B429]/10 disabled:opacity-40"
        >
          {q.emoji} {q.text}
        </button>
      ))}
    </div>
  );
}
