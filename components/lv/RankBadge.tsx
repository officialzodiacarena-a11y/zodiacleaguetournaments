// components/lv/RankBadge.tsx
// ป้าย Rank (ตัวอักษร F-L) + "LV n" · ใช้สีม่วงของธีมเว็บ (#9184D9 = Rank indicator ตาม CI palette) ไม่แยกสีต่อเลเวล
export function RankBadge({
  rankCode,
  rankOrder,
  size = 'sm',
}: {
  rankCode: string;
  rankOrder: number;
  size?: 'sm' | 'lg';
}) {
  if (size === 'lg') {
    return (
      <div
        data-testid="rank-badge-lg"
        className="inline-flex items-center gap-3 rounded-xl border border-[#9184D9]/40 bg-[#9184D9]/10 px-4 py-2"
      >
        <span className="text-4xl font-black leading-none text-[#9184D9]">{rankCode}</span>
        <span className="text-xs font-bold uppercase tracking-widest text-neutral-300">
          RANK
          <br />
          LV {rankOrder}
        </span>
      </div>
    );
  }
  return (
    <span
      data-testid="rank-badge-sm"
      className="inline-flex items-center gap-1 rounded border border-[#9184D9]/40 bg-[#9184D9]/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#9184D9]"
    >
      {rankCode} · LV {rankOrder}
    </span>
  );
}
