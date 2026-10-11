'use client';

// components/lv/PlayerLevelPanel.tsx
// แผงเลเวลของผู้เล่น 1 คน (ป้ายใหญ่ + หลอด EXP) · อ่านอย่างเดียว · โหลดไม่ได้ = ไม่แสดงอะไร (ไม่ทำให้หน้าโปรไฟล์พัง)
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchPlayerLevel, type PlayerLevel } from '@/lib/lv/playerLevel';
import { RankBadge } from './RankBadge';
import { ExpBar } from './ExpBar';

export function PlayerLevelPanel({ playerId }: { playerId: string | null | undefined }) {
  const supabase = useMemo(() => createClient(), []);
  const [level, setLevel] = useState<PlayerLevel | null>(null);

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    fetchPlayerLevel(supabase, playerId).then((l) => {
      if (!cancelled) setLevel(l);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, playerId]);

  if (!level) return null;

  return (
    <div data-testid="player-level-panel" className="flex flex-wrap items-center gap-4">
      <RankBadge rankCode={level.rankCode} rankOrder={level.rankOrder} size="lg" />
      <div className="min-w-[200px] flex-1">
        <ExpBar rankOrder={level.rankOrder} expInRank={level.expInRank} expBucket={level.expBucket} />
        <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-neutral-500">SEASON {level.seasonYear}</p>
      </div>
    </div>
  );
}
