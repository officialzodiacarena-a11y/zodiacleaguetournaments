// lib/spectra/translate.ts
// แปลงข้อมูล scoreboard จาก Spectra-Server (อ่านผ่าน Overwolf GEP บนเครื่อง Observer) ให้เป็นรูปแบบ
// TelemetryPlayerFrame ของเราเอง (lib/overlay/telemetry-schema.ts) — ไม่ใช้ OCR เลยสำหรับส่วนนี้
// จับคู่คนด้วย Riot ID (name#tagline) ตรง ๆ กับ game_accounts ในระบบเรา แม่นกว่าอ่านชื่อบนจอมาก และ
// ทำงานได้ทุกวินาทีไม่ต้องรอกด Tab (GEP อ่านจากสถานะเกม ไม่ใช่จากภาพหน้าจอ) — ดู scripts/spectra-adapter.ts
// สำหรับตัวเชื่อมสาย WebSocket จริง (ยังไม่มีของจริงให้ทดสอบคืนนี้ ทดสอบกับ Spectra-Server จริงก่อนใช้งาน)
//
// ⚠️ initialArmor และ scoreboardWeaponInternal/agentInternal เป็นค่าดิบจากภายในเกม รูปแบบที่แน่นอนยัง
// ไม่เคยเห็นข้อมูลจริง (เอกสาร Spectra ไม่ได้ระบุ range/format ชัดเจน) ค่า threshold ด้านล่างเป็นการ
// ประมาณตามสัดส่วนเกราะจริงของ VALORANT (25 = Light, 50 = Heavy) — ต้องเทียบกับข้อมูลจริงก่อนใช้งานจริง
import type { TelemetryPlayerFrame } from '@/lib/overlay/telemetry-schema';

export type WinCondition = 'elimination' | 'spike_detonate' | 'spike_defuse' | 'time_expire';

export interface RoundOutcome {
  winnerTeamId: string;
  winCondition: WinCondition;
}

/**
 * State machine ติดตาม spike events ระหว่างรอบ แล้ว resolve win condition ตอน round_phase === "end"
 * ตาม Overwolf GEP spec: spike_detonated/spike_defused เป็น push events ที่ยิงก่อน round_phase เปลี่ยนเป็น "end"
 */
export class RoundTracker {
  private spikeDetonated = false;
  private spikeDefused = false;
  private _currentRound = 0;

  get currentRound() { return this._currentRound; }

  onSpikeDetonated() { this.spikeDetonated = true; }
  onSpikeDefused() { this.spikeDefused = true; }

  advanceRound(roundNumber: number) {
    if (roundNumber > this._currentRound) {
      this._currentRound = roundNumber;
      this.resetFlags();
    }
  }

  resolveRoundEnd(
    scoreboard: SpectraScoreboardEntry[],
    rosterByRiotId: Map<string, RiotIdRosterEntry>,
    scoreUpdate?: { won: number; lost: number },
  ): RoundOutcome | null {
    let winCondition: WinCondition;

    if (this.spikeDetonated) {
      winCondition = 'spike_detonate';
    } else if (this.spikeDefused) {
      winCondition = 'spike_defuse';
    } else {
      const eliminated = getEliminatedTeam(scoreboard, rosterByRiotId);
      winCondition = eliminated ? 'elimination' : 'time_expire';
    }

    const winnerTeamId = resolveWinnerTeam(winCondition, scoreboard, rosterByRiotId, scoreUpdate);
    this.resetFlags();

    if (!winnerTeamId) return null;
    return { winnerTeamId, winCondition };
  }

  private resetFlags() {
    this.spikeDetonated = false;
    this.spikeDefused = false;
  }
}

function getEliminatedTeam(
  scoreboard: SpectraScoreboardEntry[],
  rosterByRiotId: Map<string, RiotIdRosterEntry>,
): string | null {
  const teamAlive = new Map<string, { alive: number; total: number }>();
  for (const entry of scoreboard) {
    const roster = rosterByRiotId.get(riotIdKey(entry.name, entry.tagline));
    if (!roster?.teamId) continue;
    const stats = teamAlive.get(roster.teamId) ?? { alive: 0, total: 0 };
    stats.total += 1;
    if (entry.isAlive) stats.alive += 1;
    teamAlive.set(roster.teamId, stats);
  }
  const teams = [...teamAlive.entries()];
  if (teams.length !== 2) return null;
  const [teamA, teamB] = teams;
  if (teamA[1].alive === 0 && teamB[1].alive > 0) return teamA[0];
  if (teamB[1].alive === 0 && teamA[1].alive > 0) return teamB[0];
  return null;
}

function resolveWinnerTeam(
  winCondition: WinCondition,
  scoreboard: SpectraScoreboardEntry[],
  rosterByRiotId: Map<string, RiotIdRosterEntry>,
  scoreUpdate?: { won: number; lost: number },
): string | null {
  const eliminated = getEliminatedTeam(scoreboard, rosterByRiotId);

  if (winCondition === 'elimination' && eliminated) {
    // eliminated = ทีมที่ตายหมด ดังนั้นอีกฝั่งชนะ
    const teamIds = [...new Set(
      scoreboard
        .map(e => rosterByRiotId.get(riotIdKey(e.name, e.tagline))?.teamId)
        .filter((id): id is string => !!id)
    )];
    return teamIds.find(id => id !== eliminated) ?? null;
  }

  // spike_detonate/spike_defuse/time_expire: ถ้ามี score update ใช้ score +1 หา winner
  // ถ้าไม่มี score update ใช้ isAlive เป็น fallback (ทีมที่ยังเหลือคนเยอะกว่ามักเป็นฝ่ายชนะ)
  if (eliminated) {
    const teamIds = [...new Set(
      scoreboard
        .map(e => rosterByRiotId.get(riotIdKey(e.name, e.tagline))?.teamId)
        .filter((id): id is string => !!id)
    )];
    return teamIds.find(id => id !== eliminated) ?? null;
  }

  // ทั้งสองฝั่งยังมีคนเหลือ — ใช้ score update ถ้ามี
  // Overwolf ส่ง score เป็น { won, lost } จากมุมมอง local player
  // ถ้าไม่มี score update ก็ return null (ข้อมูลไม่พอ)
  if (scoreUpdate) {
    // TODO: ต้องรู้ว่า local player อยู่ทีมไหนถึงจะ map won/lost -> teamId ได้
    // ตอนนี้ return null ไว้ก่อน — รอทดสอบกับ Spectra-Server จริง
    return null;
  }

  return null;
}

export interface SpectraScoreboardEntry {
  name: string;
  tagline: string;
  playerId: string;
  agentInternal: string;
  isAlive: boolean;
  initialArmor: number;
  scoreboardWeaponInternal: string;
  currUltPoints: number;
  maxUltPoints: number;
  money: number;
}

/** riot_id ("Name#Tag") -> ผู้เล่นในระบบเรา ใช้จับคู่ scoreboard entry กับ display_name ที่ Overlay ใช้อยู่ */
export interface RiotIdRosterEntry {
  displayName: string;
  teamId?: string;
}

/** ทำ key มาตรฐานจาก game_name + tag_line (ไม่สนตัวพิมพ์เล็ก/ใหญ่ ตัดช่องว่างหัวท้าย ตัด # นำหน้า tagline ถ้ามี) */
export function riotIdKey(name: string, tagline: string): string {
  const cleanTag = tagline.trim().replace(/^#/, '');
  return `${name.trim()}#${cleanTag}`.toUpperCase();
}

/** เกราะ 0 = ไม่มี, ต่ำกว่า Heavy เต็ม (50) = Light, ครบ = Heavy — เกณฑ์ยังไม่ยืนยันกับข้อมูลจริง (ดูคอมเมนต์บนไฟล์) */
export function translateArmor(initialArmor: number): TelemetryPlayerFrame['armor'] {
  if (!initialArmor || initialArmor <= 0) return 'NONE';
  if (initialArmor < 50) return 'LIGHT';
  return 'HEAVY';
}

/** ชื่ออาวุธ/เอเจนต์ภายในของ Overwolf มักมีรูปแบบ prefix/underscore เช่น "Weapon_Vandal" — ตัดให้เหลือชื่ออ่านง่าย */
export function normalizeInternalName(internal: string): string {
  const stripped = internal.replace(/^.*[_:]/, '').trim();
  if (!stripped) return internal;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1).toLowerCase();
}

/**
 * แปลง scoreboard ทั้งชุดจาก Spectra เป็น TelemetryPlayerFrame[] พร้อมส่งเข้า /telemetry
 * เฉพาะคนที่จับคู่ Riot ID กับ roster ของเราได้เท่านั้นจะอยู่ในผลลัพธ์ (คนที่จับคู่ไม่ได้ถูกข้าม ไม่ใช่ error)
 * ไม่ใส่ hp/hpMax เพราะ Spectra ไม่มีข้อมูล HP ของศัตรู — ให้ OCR (lib/ocr/hp-bar.ts) ดูแลส่วนนั้นต่อไป
 */
/**
 * ตรวจจับว่ารอบจบหรือยัง + ทีมไหนชนะ จาก isAlive ของ Spectra scoreboard
 * คืน teamId ของทีมที่ยังมีคนรอดอยู่ (อีกฝั่ง isAlive = false ทั้งหมด)
 * คืน null ถ้ายังไม่จบ (ทั้งสองฝั่งยังมีคนเหลือ) หรือข้อมูลไม่พอตัดสิน
 */
export function detectRoundWinner(
  scoreboard: SpectraScoreboardEntry[],
  rosterByRiotId: Map<string, RiotIdRosterEntry>
): string | null {
  const teamAlive = new Map<string, { alive: number; total: number }>();

  for (const entry of scoreboard) {
    const roster = rosterByRiotId.get(riotIdKey(entry.name, entry.tagline));
    if (!roster?.teamId) continue;

    const stats = teamAlive.get(roster.teamId) ?? { alive: 0, total: 0 };
    stats.total += 1;
    if (entry.isAlive) stats.alive += 1;
    teamAlive.set(roster.teamId, stats);
  }

  const teams = [...teamAlive.entries()];
  if (teams.length !== 2) return null;

  const [teamA, teamB] = teams;
  if (teamA[1].alive === 0 && teamB[1].alive > 0) return teamB[0];
  if (teamB[1].alive === 0 && teamA[1].alive > 0) return teamA[0];
  return null;
}

export function buildTelemetryPlayers(
  scoreboard: SpectraScoreboardEntry[],
  rosterByRiotId: Map<string, RiotIdRosterEntry>
): TelemetryPlayerFrame[] {
  const frames: TelemetryPlayerFrame[] = [];
  for (const entry of scoreboard) {
    const roster = rosterByRiotId.get(riotIdKey(entry.name, entry.tagline));
    if (!roster) continue; // อาจเป็นบัญชีสำรอง/ยังไม่ล็อกไว้ — ปล่อยผ่านไม่ทำให้เฟรมอื่นพัง
    frames.push({
      name: roster.displayName,
      credits: Math.max(0, Math.min(99999, Math.round(entry.money))),
      weapon: normalizeInternalName(entry.scoreboardWeaponInternal),
      armor: translateArmor(entry.initialArmor),
      ultPoints: Math.max(0, Math.min(20, Math.round(entry.currUltPoints))),
      ultMax: Math.max(1, Math.min(20, Math.round(entry.maxUltPoints) || 1)),
    });
  }
  return frames;
}
