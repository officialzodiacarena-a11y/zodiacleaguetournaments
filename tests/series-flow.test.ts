// tests/series-flow.test.ts
// จำลองซีรีส์ BO1 / BO3 / BO5 ตั้งแต่ Veto จนจบ ด้วยตรรกะจริงของระบบ (ไม่ใช้ DB): สถานะซีรีส์, END MAP, การเปลี่ยนสถานะแมตช์, การเลือกฉาก Overlay
// รัน: npx tsx --test tests/series-flow.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSeriesState, type SeriesMatchRow } from '@/lib/overlay/match-series';
import {
  isOvertimeScore,
  planAfterGameRecorded,
  planFinishMap,
  resolveDisplayScene,
  withSceneMemory,
  type FinishMapPlan,
} from '@/lib/overlay/series-flow';
import type { OverlayGame, OverlayVeto } from '@/components/overlay/series';

const TEAM_A = 'team-a';
const TEAM_B = 'team-b';
const NOW = '2026-09-22T00:00:00.000Z';

// Map Pool จริง 7 แมพ: Ascent, Bind, Haven, Split, Lotus, Sunset, Abyss
// ลำดับที่โค้ดทำจริง (7 สเต็ป): A BAN, B BAN, A PICK, B PICK, A BAN, B BAN, DECIDER
const VETO_7_STEPS: OverlayVeto[] = [
  { step_order: 1, action: 'BAN', team_id: TEAM_A, map_name: 'Split', was_auto: false },
  { step_order: 2, action: 'BAN', team_id: TEAM_B, map_name: 'Abyss', was_auto: false },
  { step_order: 3, action: 'PICK', team_id: TEAM_A, map_name: 'Ascent', was_auto: false },
  { step_order: 4, action: 'PICK', team_id: TEAM_B, map_name: 'Bind', was_auto: false },
  { step_order: 5, action: 'BAN', team_id: TEAM_A, map_name: 'Lotus', was_auto: false },
  { step_order: 6, action: 'BAN', team_id: TEAM_B, map_name: 'Sunset', was_auto: false },
  { step_order: 7, action: 'DECIDER', team_id: null, map_name: 'Haven', was_auto: true },
];

// ลำดับตาม veto_format ใน Stage จริง (5 สเต็ป): BAN, BAN, PICK, PICK, DECIDER
const VETO_5_STEPS: OverlayVeto[] = [
  { step_order: 1, action: 'BAN', team_id: TEAM_A, map_name: 'Split', was_auto: false },
  { step_order: 2, action: 'BAN', team_id: TEAM_B, map_name: 'Abyss', was_auto: false },
  { step_order: 3, action: 'PICK', team_id: TEAM_A, map_name: 'Ascent', was_auto: false },
  { step_order: 4, action: 'PICK', team_id: TEAM_B, map_name: 'Bind', was_auto: false },
  { step_order: 5, action: 'DECIDER', team_id: null, map_name: 'Haven', was_auto: true },
];

type MatchRow = SeriesMatchRow & { winner?: string | null };

// จำลองผู้คุมถ่ายทอด + ฐานข้อมูล (แถว matches, match_games) และ OBS
class Sim {
  match: MatchRow;
  games: OverlayGame[] = [];
  broadcast: string | null = null;

  constructor(bestOf: number, public vetoes: OverlayVeto[] = VETO_7_STEPS, status = 'LIVE') {
    this.match = {
      id: 'match-1',
      status,
      best_of: bestOf,
      team_a_id: TEAM_A,
      team_b_id: TEAM_B,
      rounds_won_a: 0,
      rounds_won_b: 0,
      format_config: { lobby_code: 'ZA-1' },
    };
  }

  state() {
    return computeSeriesState(this.match, this.vetoes, this.games);
  }

  setRounds(a: number, b: number) {
    assert.ok(['LIVE', 'PAUSED', 'AWAITING_RESULT'].includes(this.match.status), 'แก้สกอร์รอบได้เฉพาะ LIVE/PAUSED/AWAITING_RESULT');
    this.match.rounds_won_a = a;
    this.match.rounds_won_b = b;
  }

  endMap(): FinishMapPlan {
    const before = this.match.status;
    const plan = planFinishMap(this.state(), NOW);
    if (plan.ok) {
      this.games.push({ ...plan.game });
      Object.assign(this.match, plan.matchUpdate);
      this.broadcast = 'AWAITING_RESULT'; // ปุ่ม END MAP ส่ง Broadcast สลับเป็น Intermission ทันที
      if (before !== this.match.status) this.broadcast = null; // Overlay รีเซ็ต Broadcast เมื่อสถานะแมตช์เปลี่ยน
    }
    return plan;
  }

  startNextMap() {
    this.match.format_config = withSceneMemory(this.match.format_config, 'LIVE', this.state().completedCount);
    this.broadcast = 'LIVE';
  }

  reloadObs() {
    this.broadcast = null; // OBS รีเฟรช: Broadcast หายไป เหลือแต่สิ่งที่จำใน DB
  }

  scene() {
    return resolveDisplayScene({
      status: this.match.status,
      broadcastScene: this.broadcast,
      formatConfig: this.match.format_config,
      completedGames: this.state().completedCount,
    });
  }
}

function assertOk(plan: FinishMapPlan): asserts plan is Extract<FinishMapPlan, { ok: true }> {
  assert.ok(plan.ok, plan.ok ? '' : `${plan.code}: ${plan.message}`);
}

test('BO3 2-1: สถานะคง LIVE ตลอดซีรีส์ แล้ว AWAITING_RESULT เมื่อตัดสินผลครบ', () => {
  const sim = new Sim(3);
  assert.equal(sim.state().currentGameNumber, 1);
  assert.equal(sim.state().currentMapName, 'Ascent'); // PICK แรก = เกม 1

  // เกม 1: A ชนะ 13-9
  sim.setRounds(13, 9);
  const g1 = sim.endMap();
  assertOk(g1);
  assert.equal(g1.result.game_number, 1);
  assert.equal(g1.result.map_name, 'Ascent');
  assert.equal(g1.result.winner_team_id, TEAM_A);
  assert.equal(g1.result.series_over, false);
  assert.equal(sim.match.status, 'LIVE', 'ระหว่างซีรีส์ต้องคง LIVE (trigger ไม่ให้ AWAITING_RESULT กลับ LIVE)');
  assert.deepEqual([sim.match.rounds_won_a, sim.match.rounds_won_b], [0, 0], 'รีเซ็ตสกอร์รอบ');
  assert.equal(sim.scene(), 'AWAITING_RESULT', 'ระหว่างเกมขึ้นฉาก Intermission');
  sim.reloadObs();
  assert.equal(sim.scene(), 'AWAITING_RESULT', 'OBS รีเฟรชระหว่างพักเกม ยังต้องเป็น Intermission');

  // เริ่มเกม 2
  sim.startNextMap();
  assert.equal(sim.scene(), 'LIVE');
  sim.reloadObs();
  assert.equal(sim.scene(), 'LIVE', 'OBS รีเฟรชกลางเกม 2 ต้องยังเป็นฉาก LIVE');
  assert.equal(sim.state().currentGameNumber, 2);
  assert.equal(sim.state().currentMapName, 'Bind');

  // เกม 2: B ชนะ 13-11 (ไม่ใช่ Overtime)
  sim.setRounds(11, 13);
  const g2 = sim.endMap();
  assertOk(g2);
  assert.equal(g2.result.winner_team_id, TEAM_B);
  assert.equal(g2.game.went_overtime, false);
  assert.deepEqual([g2.result.maps_won_a, g2.result.maps_won_b], [1, 1]);
  assert.equal(g2.result.series_over, false);
  assert.equal(sim.match.status, 'LIVE');
  assert.equal(sim.scene(), 'AWAITING_RESULT');

  // เกม 3 (Decider)
  sim.startNextMap();
  assert.equal(sim.state().currentGameNumber, 3);
  assert.equal(sim.state().currentMapName, 'Haven');
  sim.setRounds(14, 12); // Overtime
  const g3 = sim.endMap();
  assertOk(g3);
  assert.equal(g3.game.went_overtime, true);
  assert.deepEqual([g3.result.maps_won_a, g3.result.maps_won_b], [2, 1]);
  assert.equal(g3.result.series_over, true);
  assert.equal(sim.match.status, 'AWAITING_RESULT', 'ตัดสินผลครบ → AWAITING_RESULT (แล้วไป COMPLETED ตามสเปก)');
  assert.equal(sim.scene(), 'AWAITING_RESULT');
  assert.equal(sim.state().seriesOver, true);
  assert.equal(sim.state().currentGameNumber, null);

  // ซีรีส์จบแล้ว กดจบแมพซ้ำไม่ได้
  sim.setRounds(13, 0);
  const extra = sim.endMap();
  assert.equal(extra.ok, false);
  assert.equal(!extra.ok && extra.code, 'SERIES_ALREADY_DECIDED');
});

test('BO3 2-0: ซีรีส์จบหลังเกม 2 ไม่ต้องเล่นเกม 3', () => {
  const sim = new Sim(3);
  sim.setRounds(13, 5);
  assertOk(sim.endMap());
  assert.equal(sim.match.status, 'LIVE');
  sim.startNextMap();
  sim.setRounds(13, 8);
  const g2 = sim.endMap();
  assertOk(g2);
  assert.equal(g2.result.series_over, true);
  assert.equal(sim.match.status, 'AWAITING_RESULT');
  assert.equal(sim.state().completedCount, 2);
  assert.equal(sim.state().winsNeeded, 2);
  sim.setRounds(13, 1);
  assert.equal(sim.endMap().ok, false);
});

test('BO5: 3-2 ต้องครบ 5 เกม, 3-1 จบหลังเกม 4', () => {
  const pool = ['Ascent', 'Bind', 'Haven', 'Split', 'Lotus'];
  // BO5 ต้องมีแมพที่จะเล่น 5 แมพ: PICK/DECIDER ตามลำดับสเต็ป
  const veto: OverlayVeto[] = pool.map((map, i) => ({
    step_order: i + 1,
    action: i === 4 ? 'DECIDER' : 'PICK',
    team_id: i === 4 ? null : i % 2 === 0 ? TEAM_A : TEAM_B,
    map_name: map,
    was_auto: i === 4,
  }));

  const sweepFive = new Sim(5, veto);
  const scores: Array<[number, number]> = [[13, 9], [9, 13], [13, 10], [8, 13], [13, 11]];
  scores.forEach(([a, b], i) => {
    sweepFive.startNextMap();
    assert.equal(sweepFive.state().currentGameNumber, i + 1);
    assert.equal(sweepFive.state().currentMapName, pool[i]);
    sweepFive.setRounds(a, b);
    const plan = sweepFive.endMap();
    assertOk(plan);
    assert.equal(plan.result.series_over, i === 4, `หลังเกม ${i + 1}`);
    assert.equal(sweepFive.match.status, i === 4 ? 'AWAITING_RESULT' : 'LIVE');
  });
  assert.equal(sweepFive.state().winsA, 3);
  assert.equal(sweepFive.state().winsB, 2);

  const threeOne = new Sim(5, veto);
  ([[13, 9], [13, 7], [9, 13], [13, 12]] as Array<[number, number]>).forEach(([a, b]) => {
    threeOne.startNextMap();
    threeOne.setRounds(a, b);
    assertOk(threeOne.endMap());
  });
  assert.equal(threeOne.state().seriesOver, true);
  assert.equal(threeOne.state().completedCount, 4);
  assert.equal(threeOne.match.status, 'AWAITING_RESULT');
});

test('BO1: จบซีรีส์ทันทีหลังแมพแรก', () => {
  const sim = new Sim(1, VETO_5_STEPS);
  assert.equal(sim.state().currentGameNumber, 1);
  sim.setRounds(7, 13);
  const g1 = sim.endMap();
  assertOk(g1);
  assert.equal(g1.result.winner_team_id, TEAM_B);
  assert.equal(g1.result.series_over, true);
  assert.equal(sim.match.status, 'AWAITING_RESULT');
});

test('Veto 5 สเต็ป (ค่าจริงใน Stage) ให้แมพของ BO3 เหมือน Veto 7 สเต็ป: Ascent, Bind, Haven', () => {
  for (const veto of [VETO_5_STEPS, VETO_7_STEPS]) {
    const names: Array<string | null> = [];
    const sim = new Sim(3, veto);
    for (const [a, b] of [[13, 1], [1, 13], [13, 2]] as Array<[number, number]>) {
      names.push(sim.state().currentMapName);
      sim.setRounds(a, b);
      assertOk(sim.endMap());
    }
    assert.deepEqual(names, ['Ascent', 'Bind', 'Haven']);
  }
});

test('ตัวกันพลาด: เสมอ, 0-0, สถานะไม่ใช่ LIVE/AWAITING_RESULT', () => {
  const tied = new Sim(3);
  tied.setRounds(12, 12);
  const t = tied.endMap();
  assert.equal(!t.ok && t.code, 'TIED_ROUNDS');
  assert.equal(tied.games.length, 0, 'ต้องไม่บันทึกเกมเมื่อเสมอ');

  const zero = new Sim(3);
  const z = zero.endMap();
  assert.equal(!z.ok && z.code, 'TIED_ROUNDS');

  for (const status of ['PAUSED', 'VETO', 'COMPLETED', 'SCHEDULED', 'DISPUTED']) {
    const sim = new Sim(3, VETO_7_STEPS, status);
    sim.match.rounds_won_a = 13;
    sim.match.rounds_won_b = 4;
    const plan = sim.endMap();
    assert.equal(!plan.ok && plan.code, 'MATCH_NOT_FINISHABLE', `สถานะ ${status}`);
    assert.equal(sim.games.length, 0);
  }
});

test('Overtime: 13-11 ไม่ใช่ OT, 14-12 / 16-14 เป็น OT', () => {
  assert.equal(isOvertimeScore(13, 11), false);
  assert.equal(isOvertimeScore(13, 0), false);
  assert.equal(isOvertimeScore(14, 12), true);
  assert.equal(isOvertimeScore(12, 14), true);
  assert.equal(isOvertimeScore(16, 14), true);
});

test('ฉากที่จำไว้: ไม่ค้างข้ามรอบเทส และ Broadcast มาก่อนเสมอ', () => {
  // จำ Intermission หลังเกม 1 แต่ตอนนี้ไม่มีเกมที่จบแล้ว (รีเซ็ตแมตช์) → ใช้สถานะ LIVE
  const stale = withSceneMemory({}, 'AWAITING_RESULT', 1);
  assert.equal(resolveDisplayScene({ status: 'LIVE', broadcastScene: null, formatConfig: stale, completedGames: 0 }), 'LIVE');
  // จำนวนเกมตรงกัน → ใช้ฉากที่จำไว้
  assert.equal(resolveDisplayScene({ status: 'LIVE', broadcastScene: null, formatConfig: stale, completedGames: 1 }), 'AWAITING_RESULT');
  // Broadcast ชนะฉากที่จำไว้
  assert.equal(resolveDisplayScene({ status: 'LIVE', broadcastScene: 'VETO', formatConfig: stale, completedGames: 1 }), 'VETO');
  // แมตช์จบแล้ว: ต้องเป็น COMPLETED ไม่ว่าจะจำฉากอะไรไว้
  assert.equal(resolveDisplayScene({ status: 'COMPLETED', broadcastScene: null, formatConfig: withSceneMemory({}, 'LIVE', 2), completedGames: 2 }), 'COMPLETED');
  // ฉาก VETO ที่จำไว้ไม่ถูกใช้ (สถานะ VETO ขึ้นฉาก VETO อยู่แล้ว และห้ามไปทับ LIVE)
  assert.equal(resolveDisplayScene({ status: 'LIVE', broadcastScene: null, formatConfig: withSceneMemory({}, 'VETO', 0), completedGames: 0 }), 'LIVE');
  // format_config ว่าง/ไม่ใช่ object
  assert.equal(resolveDisplayScene({ status: 'LIVE', broadcastScene: null, formatConfig: null, completedGames: 0 }), 'LIVE');
  assert.equal(resolveDisplayScene({ status: 'LIVE', broadcastScene: null, formatConfig: ['x'], completedGames: 0 }), 'LIVE');
  // withSceneMemory ต้องเก็บค่าอื่นใน format_config (เช่น lobby_code) ไว้
  assert.deepEqual(withSceneMemory({ lobby_code: 'ZA-9' }, 'LIVE', 2), { lobby_code: 'ZA-9', overlay_scene: 'LIVE', overlay_scene_games: 2 });
});

test('POST /games (planAfterGameRecorded): ไม่เปลี่ยนสถานะจนกว่าซีรีส์จะตัดสิน', () => {
  const sim = new Sim(3);
  sim.games.push({ game_number: 1, map_name: 'Ascent', score_a: 13, score_b: 9, status: 'COMPLETED', winner_team_id: TEAM_A });
  const afterOne = planAfterGameRecorded(sim.state(), NOW);
  assert.ok(afterOne);
  assert.equal('status' in afterOne, false, 'หลังเกม 1 ของ BO3 ต้องไม่แตะสถานะ');
  assert.equal((afterOne.format_config as Record<string, unknown>).overlay_scene_games, 1);

  sim.games.push({ game_number: 2, map_name: 'Bind', score_a: 13, score_b: 4, status: 'COMPLETED', winner_team_id: TEAM_A });
  const afterTwo = planAfterGameRecorded(sim.state(), NOW);
  assert.ok(afterTwo);
  assert.equal(afterTwo.status, 'AWAITING_RESULT', 'A ชนะ 2-0 → ตัดสินผลครบ');

  const paused = new Sim(3, VETO_7_STEPS, 'PAUSED');
  assert.equal(planAfterGameRecorded(paused.state(), NOW), null);
});

test('สกอร์ซีรีส์: ใช้ winner_team_id ก่อน ถ้าไม่มีเทียบสกอร์ และไม่นับเกมที่ยังไม่จบ', () => {
  const sim = new Sim(3);
  sim.games.push({ game_number: 1, map_name: 'Ascent', score_a: 9, score_b: 13, status: 'COMPLETED', winner_team_id: null }); // เทียบสกอร์ → B
  sim.games.push({ game_number: 2, map_name: 'Bind', score_a: 5, score_b: 3, status: 'LIVE', winner_team_id: null }); // ยังไม่จบ ไม่นับ
  const state = sim.state();
  assert.equal(state.winsA, 0);
  assert.equal(state.winsB, 1);
  assert.equal(state.completedCount, 1);
});
