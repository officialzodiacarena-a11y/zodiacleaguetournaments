// lib/team/gameRole.ts
// ตำแหน่งในเกมที่ผู้เล่นลงเล่นบ่อยที่สุด จาก match_participants.role_played (ฟังก์ชันล้วน)

export type GameRole = 'DUELIST' | 'INITIATOR' | 'CONTROLLER' | 'SENTINEL' | 'FLEX';
const ROLES: readonly GameRole[] = ['DUELIST', 'INITIATOR', 'CONTROLLER', 'SENTINEL', 'FLEX'];

export function normalizeGameRole(raw: string | null | undefined): GameRole | null {
  const v = (raw ?? '').trim().toUpperCase();
  return (ROLES as readonly string[]).includes(v) ? (v as GameRole) : null;
}

export function mostPlayedRole(rows: { player_id: string; role_played: string | null }[], playerId: string): GameRole | null {
  const count = new Map<GameRole, number>();
  for (const r of rows) {
    if (r.player_id !== playerId) continue;
    const role = normalizeGameRole(r.role_played);
    if (role) count.set(role, (count.get(role) ?? 0) + 1);
  }
  let best: GameRole | null = null;
  let bestN = 0;
  for (const role of ROLES) {
    const n = count.get(role) ?? 0;
    if (n > bestN) {
      best = role;
      bestN = n;
    }
  }
  return best;
}

export const GAME_ROLE_STYLE: Record<GameRole, { stripe: string; badge: string }> = {
  DUELIST: { stripe: 'bg-gradient-to-r from-[#E35A5A] to-[#ff8080]', badge: 'bg-[#E35A5A]/15 text-[#E35A5A] border-[#E35A5A]/30' },
  INITIATOR: { stripe: 'bg-gradient-to-r from-[#E8B429] to-[#ffd77a]', badge: 'bg-[#E8B429]/12 text-[#E8B429] border-[#E8B429]/30' },
  CONTROLLER: { stripe: 'bg-gradient-to-r from-[#9184d9] to-[#b5afe8]', badge: 'bg-[#9184d9]/15 text-[#9184d9] border-[#9184d9]/30' },
  SENTINEL: { stripe: 'bg-gradient-to-r from-[#4A9EE3] to-[#7ec8ff]', badge: 'bg-[#4A9EE3]/15 text-[#4A9EE3] border-[#4A9EE3]/30' },
  FLEX: { stripe: 'bg-gradient-to-r from-[#4AE38F] to-[#a0ffcf]', badge: 'bg-[#4AE38F]/12 text-[#4AE38F] border-[#4AE38F]/30' },
};
