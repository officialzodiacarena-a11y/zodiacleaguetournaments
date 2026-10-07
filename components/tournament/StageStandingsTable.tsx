// components/tournament/StageStandingsTable.tsx
// ตารางคะแนนของสายแบบเก็บคะแนน (ชนะ 3 · เสมอ 1 · แพ้ 0) — แสดงผลอย่างเดียว คำนวณจาก lib/tournament/stageStandings.ts
// พื้นหน้าเว็บมืด: กำหนดสีตัวอักษรชัดเจนทุกจุด (บทเรียนใบ 1858 ที่เคยใช้ text-black บนพื้นมืด)
import type { StageStandingRow } from '@/lib/tournament/stageStandings';

interface StageStandingsTableProps {
  rows: StageStandingRow[];
}

const HEAD_CELL = 'px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-300';
const CELL = 'px-3 py-2 text-sm text-white';

export function StageStandingsTable({ rows }: StageStandingsTableProps) {
  return (
    <section className="rounded border border-white/30 bg-[#12121A] p-4 text-white">
      <h2 className="text-lg font-bold text-white">ตารางคะแนน</h2>
      <p className="mb-3 text-xs text-gray-300">ชนะ 3 · เสมอ 1 · แพ้ 0</p>

      {rows.length === 0 ? (
        <p data-testid="standings-empty" className="text-sm text-gray-300">
          ยังไม่มีทีมในตาราง
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table data-testid="stage-standings" className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/30">
                <th className={HEAD_CELL}>อันดับ</th>
                <th className={HEAD_CELL}>ทีม</th>
                <th className={HEAD_CELL}>แข่ง</th>
                <th className={HEAD_CELL}>ชนะ</th>
                <th className={HEAD_CELL}>เสมอ</th>
                <th className={HEAD_CELL}>แพ้</th>
                <th className={HEAD_CELL}>แต้ม</th>
                <th className={HEAD_CELL}>แมพได้</th>
                <th className={HEAD_CELL}>แมพเสีย</th>
                <th className={HEAD_CELL}>ผลต่าง</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.teamId} data-testid={`standings-row-${r.teamId}`} className="border-b border-white/10">
                  <td data-testid={`standings-rank-${r.teamId}`} className={CELL}>
                    {r.rank}
                  </td>
                  <td className={CELL}>
                    <span className="font-semibold text-white">{r.name}</span>{' '}
                    <span className="text-xs text-gray-300">[{r.tag}]</span>
                  </td>
                  <td className={CELL}>{r.played}</td>
                  <td className={CELL}>{r.wins}</td>
                  <td className={CELL}>{r.draws}</td>
                  <td className={CELL}>{r.losses}</td>
                  <td data-testid={`standings-points-${r.teamId}`} className={`${CELL} font-bold`}>
                    {r.points}
                  </td>
                  <td className={CELL}>{r.mapsWon}</td>
                  <td className={CELL}>{r.mapsLost}</td>
                  <td className={CELL}>{r.mapDiff > 0 ? `+${r.mapDiff}` : r.mapDiff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
