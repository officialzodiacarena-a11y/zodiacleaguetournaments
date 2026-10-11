'use client';

// components/lv/RankLeaderboard.tsx
// มุมมอง "Rank" ของหน้าจัดอันดับ: เรียงเลเวลแล้ว EXP · มีเลขหน้า · อ่านอย่างเดียว
// ลำดับรองเมื่อคะแนนเท่ากัน = player_id (คงที่ แต่ไม่มีความหมายเชิงผลงาน) · ดู fetchLevelLeaderboard
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { fetchLevelLeaderboard, type LevelPage } from '@/lib/lv/playerLevel';
import { RankBadge } from './RankBadge';
import { ExpBar } from './ExpBar';

const PAGE_SIZE = 20;

export function RankLeaderboard() {
  const supabase = useMemo(() => createClient(), []);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<LevelPage>({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLevelLeaderboard(supabase, page, PAGE_SIZE).then((res) => {
      if (cancelled) return;
      setData(res);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, page]);

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  function goTo(next: number) {
    setLoading(true);
    setPage(next);
  }

  return (
    <div data-testid="rank-leaderboard" className="max-w-6xl mx-auto border border-[#9184D9]/30 bg-[#12121A]/80 rounded-xl p-1">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[520px]">
          <thead>
            <tr className="border-b border-[#9184D9]/30 text-[#9184D9] text-[11px] uppercase tracking-[0.2em] font-bold bg-[#9184D9]/5">
              <th className="py-4 px-4 text-center w-[70px]">#</th>
              <th className="py-4 px-4">Athlete</th>
              <th className="py-4 px-4 w-[130px]">Rank</th>
              <th className="py-4 px-4 w-[220px]">EXP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-16 text-center text-neutral-500 animate-pulse tracking-widest text-xs">
                  LOADING RANKS...
                </td>
              </tr>
            ) : data.rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center text-neutral-500 tracking-widest text-xs">
                  NO ATHLETES FOUND
                </td>
              </tr>
            ) : (
              data.rows.map((p, i) => (
                <tr key={p.playerId} className="hover:bg-[#9184D9]/5 transition-colors">
                  <td className="py-3 px-4 text-center text-sm font-bold text-neutral-400">{page * PAGE_SIZE + i + 1}</td>
                  <td className="py-3 px-4">
                    <Link href={`/profile/${p.playerId}`} className="flex items-center gap-3 text-sm font-bold text-neutral-200 hover:text-[#9184D9]">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#1A1C2E] text-[10px]">
                        {p.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          '🎮'
                        )}
                      </span>
                      <span className="truncate">{p.displayName}</span>
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <RankBadge rankCode={p.rankCode} rankOrder={p.rankOrder} size="sm" />
                  </td>
                  <td className="py-3 px-4">
                    <ExpBar rankOrder={p.rankOrder} expInRank={p.expInRank} expBucket={p.expBucket} compact />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 text-xs font-mono text-neutral-400">
        <button
          type="button"
          disabled={page === 0 || loading}
          onClick={() => goTo(Math.max(0, page - 1))}
          className="rounded border border-white/10 px-3 py-1.5 disabled:opacity-30 hover:border-[#9184D9]/50"
        >
          ← PREV
        </button>
        <span>
          PAGE {page + 1} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page + 1 >= totalPages || loading}
          onClick={() => goTo(page + 1)}
          className="rounded border border-white/10 px-3 py-1.5 disabled:opacity-30 hover:border-[#9184D9]/50"
        >
          NEXT →
        </button>
      </div>
    </div>
  );
}
