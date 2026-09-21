// lib/overlay/series-flow.ts
// กติกาการจบแมพ / การเปลี่ยนสถานะระหว่างซีรีส์ / การเลือกฉาก Overlay — ตรรกะล้วน (ไม่ใช้ DB) ใช้ร่วมกันระหว่าง API และหน้า Overlay
// ทดสอบด้วย: npx tsx --test tests/series-flow.test.ts
import type { SeriesState } from '@/lib/overlay/match-series';

export type OverlayScene = 'VETO' | 'LIVE' | 'AWAITING_RESULT';

function asConfig(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

// ผลของแมพ: ผู้ชนะจากสกอร์รอบ (ห้ามเสมอ) และ Overtime เมื่อสกอร์เกิน 13 (Valorant: 12–12 ต่อเวลา ผู้ชนะได้ ≥14)
export function isOvertimeScore(roundsA: number, roundsB: number): boolean {
  return Math.max(roundsA, roundsB) >= 14;
}

// ค่า format_config ที่จำฉากไว้ (overlay_scene_games = จำนวนเกมที่จบ ณ ตอนเลือกฉาก)
export function withSceneMemory(formatConfig: unknown, scene: OverlayScene, completedGames: number): Record<string, unknown> {
  return { ...asConfig(formatConfig), overlay_scene: scene, overlay_scene_games: completedGames };
}

export type FinishMapPlan =
  | { ok: false; httpStatus: number; code: string; message: string }
  | {
      ok: true;
      game: {
        game_number: number;
        map_name: string | null;
        score_a: number;
        score_b: number;
        winner_team_id: string | null;
        went_overtime: boolean;
        ended_at: string;
        status: 'COMPLETED';
      };
      matchUpdate: Record<string, unknown>;
      result: {
        game_number: number;
        map_name: string | null;
        score_a: number;
        score_b: number;
        winner_team_id: string | null;
        maps_won_a: number;
        maps_won_b: number;
        series_over: boolean;
      };
    };

// จบแมพปัจจุบันจากสกอร์รอบที่กรอกไว้ (END MAP)
export function planFinishMap(state: SeriesState, nowIso: string): FinishMapPlan {
  const { match } = state;

  if (match.status !== 'LIVE' && match.status !== 'AWAITING_RESULT') {
    return {
      ok: false,
      httpStatus: 422,
      code: 'MATCH_NOT_FINISHABLE',
      message: `จบแมพได้เฉพาะสถานะ LIVE / AWAITING_RESULT (ตอนนี้ ${match.status}) — ถ้าหยุดพักอยู่ให้กลับเป็น LIVE ก่อน`,
    };
  }
  if (state.seriesOver || !state.currentGameNumber) {
    return { ok: false, httpStatus: 422, code: 'SERIES_ALREADY_DECIDED', message: 'ซีรีส์นี้ตัดสินผลครบแล้ว ไม่มีแมพที่ต้องบันทึกเพิ่ม' };
  }

  const roundsA = match.rounds_won_a ?? 0;
  const roundsB = match.rounds_won_b ?? 0;
  if (roundsA === roundsB) {
    return { ok: false, httpStatus: 422, code: 'TIED_ROUNDS', message: `สกอร์รอบเสมอกัน (${roundsA}–${roundsB}) ยังหาผู้ชนะของแมพนี้ไม่ได้` };
  }

  const aWins = roundsA > roundsB;
  const winnerTeamId = aWins ? match.team_a_id : match.team_b_id;
  const winsAfterA = state.winsA + (aWins ? 1 : 0);
  const winsAfterB = state.winsB + (aWins ? 0 : 1);
  const completedAfter = state.completedCount + 1;
  const seriesOverAfter = winsAfterA >= state.winsNeeded || winsAfterB >= state.winsNeeded || completedAfter >= state.totalGames;

  // สถานะแมตช์คง LIVE ระหว่างซีรีส์ (trigger ใน DB ให้ AWAITING_RESULT ไปได้แค่ COMPLETED / DISPUTED)
  const matchUpdate: Record<string, unknown> = {
    rounds_won_a: 0,
    rounds_won_b: 0,
    updated_at: nowIso,
    format_config: withSceneMemory(match.format_config, 'AWAITING_RESULT', completedAfter),
  };
  if (match.status === 'LIVE' && seriesOverAfter) matchUpdate.status = 'AWAITING_RESULT';

  return {
    ok: true,
    game: {
      game_number: state.currentGameNumber,
      map_name: state.currentMapName,
      score_a: roundsA,
      score_b: roundsB,
      winner_team_id: winnerTeamId,
      went_overtime: isOvertimeScore(roundsA, roundsB),
      ended_at: nowIso,
      status: 'COMPLETED',
    },
    matchUpdate,
    result: {
      game_number: state.currentGameNumber,
      map_name: state.currentMapName,
      score_a: roundsA,
      score_b: roundsB,
      winner_team_id: winnerTeamId,
      maps_won_a: winsAfterA,
      maps_won_b: winsAfterB,
      series_over: seriesOverAfter,
    },
  };
}

// หลังบันทึกเกมผ่าน POST /games: state = สถานะซีรีส์ "หลังรวมเกมที่เพิ่งบันทึกแล้ว"
// คืนค่าที่ต้องอัปเดตในตาราง matches (หรือ null ถ้าสถานะไม่ใช่ LIVE/AWAITING_RESULT)
export function planAfterGameRecorded(state: SeriesState, nowIso: string): Record<string, unknown> | null {
  const { match } = state;
  if (match.status !== 'LIVE' && match.status !== 'AWAITING_RESULT') return null;

  const update: Record<string, unknown> = {
    updated_at: nowIso,
    format_config: withSceneMemory(match.format_config, 'AWAITING_RESULT', state.completedCount),
  };
  if (match.status === 'LIVE' && state.seriesOver) update.status = 'AWAITING_RESULT';
  return update;
}

// ฉากที่ Overlay ต้องแสดง: Broadcast (ทันที) → ฉากที่จำไว้ (เฉพาะช่วงแข่ง และตรงกับจำนวนเกมที่จบ) → สถานะแมตช์
export function resolveDisplayScene(input: {
  status: string;
  broadcastScene: string | null;
  formatConfig: unknown;
  completedGames: number;
}): string {
  const config = asConfig(input.formatConfig);
  const savedScene = typeof config.overlay_scene === 'string' ? config.overlay_scene : null;
  const savedGames = typeof config.overlay_scene_games === 'number' ? config.overlay_scene_games : null;

  const inPlay = input.status === 'LIVE' || input.status === 'AWAITING_RESULT';
  const savedApplies = inPlay && (savedScene === 'LIVE' || savedScene === 'AWAITING_RESULT') && savedGames === input.completedGames;

  return input.broadcastScene ?? (savedApplies ? (savedScene as string) : null) ?? input.status;
}
