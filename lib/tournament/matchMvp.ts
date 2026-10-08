// lib/tournament/matchMvp.ts
// MVP ของแมตช์ = ผู้เล่นที่ ACS เฉลี่ยสูงสุดจากแถว match_participants (ฟังก์ชันล้วน)
// ไม่มีข้อมูล ACS = ไม่มี MVP (ไม่แสดงของปลอม)

export interface ParticipantRow {
  match_id: string;
  player_id: string;
  kills: number | null;
  deaths: number | null;
  acs: number | string | null;
}

export interface MatchMvp {
  playerId: string;
  acs: number;
  kd: number | null;
}

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function pickMatchMvp(rows: ParticipantRow[]): MatchMvp | null {
  const by = new Map<string, { acsSum: number; acsN: number; kills: number; deaths: number }>();
  for (const r of rows) {
    const acs = num(r.acs);
    if (acs === null) continue;
    const a = by.get(r.player_id) ?? { acsSum: 0, acsN: 0, kills: 0, deaths: 0 };
    a.acsSum += acs;
    a.acsN += 1;
    a.kills += r.kills ?? 0;
    a.deaths += r.deaths ?? 0;
    by.set(r.player_id, a);
  }
  let best: MatchMvp | null = null;
  for (const [playerId, a] of by) {
    const acs = a.acsSum / a.acsN;
    if (best === null || acs > best.acs) {
      best = { playerId, acs, kd: a.deaths > 0 ? a.kills / a.deaths : a.kills > 0 ? a.kills : null };
    }
  }
  return best;
}

export function groupParticipantsByMatch(rows: ParticipantRow[]): Map<string, ParticipantRow[]> {
  const m = new Map<string, ParticipantRow[]>();
  for (const r of rows) {
    const l = m.get(r.match_id) ?? [];
    l.push(r);
    m.set(r.match_id, l);
  }
  return m;
}
