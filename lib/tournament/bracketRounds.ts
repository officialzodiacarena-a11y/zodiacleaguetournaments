// lib/tournament/bracketRounds.ts
// จัดแมตช์ในสายเป็นคอลัมน์ตามรอบ + ตั้งชื่อรอบ (ฟังก์ชันล้วน ไม่แตะฐานข้อมูล)

export interface RoundableNode {
  bracketType: string;
  roundNumber: number;
  positionInRound: number;
}

export interface BracketRoundColumn<T extends RoundableNode> {
  key: string;
  label: string;
  nodes: T[];
}

const TYPE_ORDER: Record<string, number> = { UPPER: 0, MAIN: 0, LOWER: 1, GRAND_FINAL: 2 };

function typeRank(t: string): number {
  return TYPE_ORDER[t] ?? 1;
}

function roundLabel(type: string, round: number, maxRound: number): string {
  if (type === 'GRAND_FINAL') return 'GRAND FINAL';
  if (type === 'LOWER') return `LOWER ROUND ${round}`;
  const fromEnd = maxRound - round;
  if (fromEnd === 0) return type === 'UPPER' ? 'UPPER FINAL' : 'FINAL';
  if (fromEnd === 1) return 'SEMI-FINALS';
  if (fromEnd === 2) return 'QUARTER-FINALS';
  return `ROUND ${round}`;
}

export function groupBracketRounds<T extends RoundableNode>(nodes: T[]): BracketRoundColumn<T>[] {
  const maxByType = new Map<string, number>();
  for (const n of nodes) maxByType.set(n.bracketType, Math.max(maxByType.get(n.bracketType) ?? 0, n.roundNumber));

  const cols = new Map<string, BracketRoundColumn<T> & { type: string; round: number }>();
  for (const n of nodes) {
    const key = `${n.bracketType}:${n.roundNumber}`;
    let c = cols.get(key);
    if (!c) {
      c = { key, type: n.bracketType, round: n.roundNumber, label: roundLabel(n.bracketType, n.roundNumber, maxByType.get(n.bracketType) ?? n.roundNumber), nodes: [] };
      cols.set(key, c);
    }
    c.nodes.push(n);
  }
  return Array.from(cols.values())
    .sort((a, b) => typeRank(a.type) - typeRank(b.type) || a.round - b.round)
    .map(({ key, label, nodes: ns }) => ({ key, label, nodes: ns.sort((x, y) => x.positionInRound - y.positionInRound) }));
}

export function bracketHasLive(nodes: { status: string }[]): boolean {
  return nodes.some((n) => n.status === 'LIVE');
}
