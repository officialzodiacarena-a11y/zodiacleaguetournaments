// lib/spectra/translate.ts
// แปลงข้อมูลจาก Spectra-Server WebSocket (`match_data` event) ให้เป็น TelemetryPlayerFrame
// ของเราเอง (lib/overlay/telemetry-schema.ts)
//
// Spectra-Server ส่งข้อมูลทั้งหมดผ่าน event เดียว `match_data` เป็น JSON ก้อนใหญ่ที่มีทั้ง
// scoreboard, roundNumber, roundPhase, spikeState, attackersWon — ดูจาก
// Spectra-Server/src/connector/websocketOutgoing.ts method sendMatchData()
//
// RoundTracker อ่าน state จาก match_data payload ตรงๆ ไม่ track spike เอง เพราะ
// Spectra-Server ทำ processRoundReasons() ให้แล้วฝั่ง server
import type { TelemetryPlayerFrame } from '@/lib/overlay/telemetry-schema';

export type WinCondition = 'elimination' | 'spike_detonate' | 'spike_defuse' | 'time_expire';

export interface RoundOutcome {
  winnerTeamId: string;
  winCondition: WinCondition;
}

/** Spectra-Server match_data payload ส่วนที่เราใช้ (subset ของ Match class ที่ถูก serialize) */
export interface SpectraMatchData {
  roundNumber: number;
  roundPhase: string; // "shopping" | "combat" | "end" | "game_end"
  spikeState: { planted: boolean; detonated: boolean; defused: boolean };
  attackersWon: boolean;
  teams: SpectraTeamData[];
  map?: string;
  isRunning?: boolean;
}

export interface SpectraTeamData {
  teamName: string;
  teamTricode: string;
  ingameTeamId: number;
  isAttacking: boolean;
  roundsWon: number;
  players: SpectraPlayerData[];
}

export interface SpectraPlayerData {
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
  kills?: number;
  deaths?: number;
  assists?: number;
}

/**
 * State machine ที่อ่าน match_data payload จาก Spectra-Server แล้ว resolve win condition
 * ตอน roundPhase เปลี่ยนจาก "combat"/"end" ไป "shopping" (ของรอบถัดไป)
 *
 * ตาม Spectra-Server Match.ts: processRoundReasons() ถูกเรียกตอน shopping phase ของ
 * รอบถัดไป โดยอ่าน attackersWon + spikeState ที่ค้างจากรอบก่อน
 */
export class RoundTracker {
  private _currentRound = 0;
  private _prevRoundPhase = '';
  private _pendingSpikeState = { planted: false, detonated: false, defused: false };
  private _pendingAttackersWon = false;
  private _prevScores: [number, number] = [0, 0];
  private _baselineSet = false;

  get currentRound() { return this._currentRound; }

  /** Reset baseline flag — call on reconnect so first payload is treated as baseline again */
  resetBaseline() {
    this._baselineSet = false;
  }

  /**
   * เรียกทุกครั้งที่ได้รับ match_data — คืน RoundOutcome ถ้ารอบเพิ่งจบ (detect จาก
   * roundPhase เปลี่ยนเป็น "shopping" หรือ "game_end" และ score เปลี่ยน) หรือ null ถ้ายังไม่จบ
   */
  processMatchData(
    data: SpectraMatchData,
    rosterByRiotId: Map<string, RiotIdRosterEntry>,
  ): RoundOutcome | null {
    const { roundNumber, roundPhase, spikeState, attackersWon, teams } = data;

    const scores: [number, number] = [
      teams.find(t => t.ingameTeamId === 0)?.roundsWon ?? 0,
      teams.find(t => t.ingameTeamId === 1)?.roundsWon ?? 0,
    ];

    // First payload after connect/reconnect: set baseline only, never emit outcome
    // (prevents phantom "round ended" when adapter restarts mid-match)
    if (!this._baselineSet) {
      this._baselineSet = true;
      this._currentRound = roundNumber;
      this._prevRoundPhase = roundPhase;
      this._prevScores = scores;
      if (roundPhase === 'combat' || roundPhase === 'end') {
        this._pendingSpikeState = { ...spikeState };
        this._pendingAttackersWon = attackersWon;
      }
      return null;
    }

    let outcome: RoundOutcome | null = null;

    const phaseChanged = roundPhase !== this._prevRoundPhase;
    const scoreChanged = scores[0] !== this._prevScores[0] || scores[1] !== this._prevScores[1];

    if (phaseChanged && (roundPhase === 'shopping' || roundPhase === 'game_end') && scoreChanged) {
      const winCondition = this.resolveWinCondition(this._pendingSpikeState);
      const winnerTeamId = this.resolveWinner(
        winCondition,
        this._pendingAttackersWon,
        teams,
        rosterByRiotId,
        this._prevScores,
        scores,
      );

      if (winnerTeamId) {
        outcome = { winnerTeamId, winCondition };
      }
    }

    // Update state for next tick
    this._currentRound = roundNumber;
    this._prevRoundPhase = roundPhase;
    this._prevScores = scores;

    // Cache spike/attackers state during combat/end phases (before it resets at shopping)
    if (roundPhase === 'combat' || roundPhase === 'end') {
      this._pendingSpikeState = { ...spikeState };
      this._pendingAttackersWon = attackersWon;
    }

    return outcome;
  }

  private resolveWinCondition(
    spike: { planted: boolean; detonated: boolean; defused: boolean },
  ): WinCondition {
    // Mirrors Spectra-Server Match.ts processRoundReasons() logic exactly
    if (spike.detonated) return 'spike_detonate';
    if (spike.defused) return 'spike_defuse';
    // KNOWN LIMITATION: cannot distinguish elimination vs time_expire — Spectra's wasTimeout
    // field is not in match_data. Both mean defenders won; scoreboard is correct, but
    // Round History Table icons will show elimination instead of time-expire clock icon.
    return 'elimination';
  }

  private resolveWinner(
    _winCondition: WinCondition,
    attackersWon: boolean,
    teams: SpectraTeamData[],
    rosterByRiotId: Map<string, RiotIdRosterEntry>,
    prevScores: [number, number],
    newScores: [number, number],
  ): string | null {
    // Find which ingame team gained a point
    let winnerIngameTeamId: number | null = null;
    if (newScores[0] > prevScores[0]) winnerIngameTeamId = 0;
    else if (newScores[1] > prevScores[1]) winnerIngameTeamId = 1;

    if (winnerIngameTeamId === null) return null;

    const winnerTeam = teams.find(t => t.ingameTeamId === winnerIngameTeamId);
    if (!winnerTeam) return null;

    // Map Spectra team to our teamId via player roster matching
    return this.mapSpectraTeamToOurTeamId(winnerTeam, rosterByRiotId);
  }

  private mapSpectraTeamToOurTeamId(
    spectraTeam: SpectraTeamData,
    rosterByRiotId: Map<string, RiotIdRosterEntry>,
  ): string | null {
    for (const player of spectraTeam.players) {
      // Prefer PUUID match (stable) over Riot ID (can change, case-sensitive issues)
      if (player.playerId) {
        for (const entry of rosterByRiotId.values()) {
          if (entry.puuid && entry.puuid === player.playerId && entry.teamId) {
            return entry.teamId;
          }
        }
      }
      // Fallback to Riot ID match
      const key = riotIdKey(player.name, player.tagline ?? '');
      const roster = rosterByRiotId.get(key);
      if (roster?.teamId) return roster.teamId;
    }
    return null;
  }
}

// --- Legacy exports kept for backward compatibility with existing tests ---

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

export interface RiotIdRosterEntry {
  displayName: string;
  teamId?: string;
  puuid?: string;
}

export function riotIdKey(name: string, tagline: string): string {
  const cleanTag = tagline.trim().replace(/^#/, '');
  return `${name.trim()}#${cleanTag}`.toUpperCase();
}

export function translateArmor(initialArmor: number): TelemetryPlayerFrame['armor'] {
  if (!initialArmor || initialArmor <= 0) return 'NONE';
  if (initialArmor < 50) return 'LIGHT';
  return 'HEAVY';
}

export function normalizeInternalName(internal: string): string {
  const stripped = internal.replace(/^.*[_:]/, '').trim();
  if (!stripped) return internal;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1).toLowerCase();
}

/**
 * ตรวจจับว่ารอบจบหรือยัง + ทีมไหนชนะ จาก isAlive ของ Spectra scoreboard
 * (Legacy — ใช้กับ flat scoreboard array, ก่อนที่จะมี match_data payload เต็มรูป)
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

/**
 * แปลง Spectra match_data teams payload เป็น TelemetryPlayerFrame[]
 * ใช้ได้กับ full match_data format (teams[].players[])
 */
export function buildTelemetryPlayersFromMatchData(
  teams: SpectraTeamData[],
  rosterByRiotId: Map<string, RiotIdRosterEntry>,
): TelemetryPlayerFrame[] {
  const frames: TelemetryPlayerFrame[] = [];
  for (const team of teams) {
    for (const player of team.players) {
      // PUUID match first, then Riot ID fallback
      let roster: RiotIdRosterEntry | undefined;
      if (player.playerId) {
        for (const entry of rosterByRiotId.values()) {
          if (entry.puuid && entry.puuid === player.playerId) { roster = entry; break; }
        }
      }
      if (!roster) roster = rosterByRiotId.get(riotIdKey(player.name, player.tagline ?? ''));
      if (!roster) continue;
      frames.push({
        name: roster.displayName,
        credits: Math.max(0, Math.min(99999, Math.round(player.money))),
        weapon: normalizeInternalName(player.scoreboardWeaponInternal),
        armor: translateArmor(player.initialArmor),
        ultPoints: Math.max(0, Math.min(20, Math.round(player.currUltPoints))),
        ultMax: Math.max(1, Math.min(20, Math.round(player.maxUltPoints) || 1)),
      });
    }
  }
  return frames;
}

/**
 * Legacy: แปลง flat scoreboard array เป็น TelemetryPlayerFrame[]
 * (เก็บไว้สำหรับ test เดิมที่ใช้ flat scoreboard)
 */
export function buildTelemetryPlayers(
  scoreboard: SpectraScoreboardEntry[],
  rosterByRiotId: Map<string, RiotIdRosterEntry>
): TelemetryPlayerFrame[] {
  const frames: TelemetryPlayerFrame[] = [];
  for (const entry of scoreboard) {
    const roster = rosterByRiotId.get(riotIdKey(entry.name, entry.tagline));
    if (!roster) continue;
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
