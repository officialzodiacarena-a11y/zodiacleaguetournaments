// components/lv/ExpBar.tsx
// หลอด EXP: exp_in_rank / exp_bucket + "x / y EXP" · เลเวล 8 เต็มถังแสดง "MAX"
import { expPercent, isMaxed } from '@/lib/lv/playerLevel';

export function ExpBar({
  rankOrder,
  expInRank,
  expBucket,
  compact = false,
}: {
  rankOrder: number;
  expInRank: number;
  expBucket: number;
  compact?: boolean;
}) {
  const maxed = isMaxed({ rankOrder, expInRank, expBucket });
  const pct = maxed ? 100 : expPercent(expInRank, expBucket);
  return (
    <div data-testid="exp-bar" className={compact ? 'w-full min-w-[120px]' : 'w-full max-w-md'}>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={expBucket}
        aria-valuenow={Math.min(expInRank, expBucket)}
        aria-label="EXP"
      >
        <div className="h-full rounded-full bg-gradient-to-r from-[#9184D9] to-[#E8B429]" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[10px] font-mono tracking-wider text-neutral-400">
        {maxed ? (
          <span className="font-black text-[#E8B429]">MAX</span>
        ) : (
          <>
            {expInRank.toLocaleString()} / {expBucket.toLocaleString()} EXP
          </>
        )}
      </p>
    </div>
  );
}
