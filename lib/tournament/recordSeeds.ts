// lib/tournament/recordSeeds.ts
// บันทึกซีดที่แอดมินใช้ตอนสร้างสาย ลง tournament_registrations.seed เพื่อให้หน้าสายแข่งแสดง "#N SEED"
// ทำแบบ best-effort: ไม่มีคอลัมน์ seed ในฐานข้อมูล หรือเขียนไม่ได้ = ข้ามเงียบ ๆ ไม่ทำให้การสร้างสายล้ม

export interface SeedAssignment {
  team_id: string;
  seed: number;
}

interface SeedQuery extends PromiseLike<{ error: { message: string } | null }> {
  eq(column: string, value: string): SeedQuery;
}

export interface SeedWriterClient {
  from(table: string): { update(values: Record<string, number | null>): SeedQuery };
}

export interface RecordSeedsResult {
  ok: boolean;
  written: number;
  failed: number;
}

export async function recordTournamentSeeds(
  client: SeedWriterClient,
  tournamentId: string,
  seeded: SeedAssignment[]
): Promise<RecordSeedsResult> {
  // เคลียร์ซีดเดิมของทัวร์ก่อน กันชนกับ unique (tournament_id, seed) ตอนสลับลำดับ
  const cleared = await client.from('tournament_registrations').update({ seed: null }).eq('tournament_id', tournamentId);
  if (cleared.error) return { ok: false, written: 0, failed: seeded.length };

  let written = 0;
  let failed = 0;
  for (const s of seeded) {
    const res = await client
      .from('tournament_registrations')
      .update({ seed: s.seed })
      .eq('tournament_id', tournamentId)
      .eq('team_id', s.team_id);
    if (res.error) failed += 1;
    else written += 1;
  }
  return { ok: failed === 0, written, failed };
}
