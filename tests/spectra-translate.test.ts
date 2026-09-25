// Run: npx tsx --test tests/spectra-translate.test.ts
// แปลง scoreboard จาก Spectra-Server เป็น TelemetryPlayerFrame (lib/spectra/translate.ts)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTelemetryPlayers,
  buildTelemetryPlayersFromMatchData,
  detectRoundWinner,
  normalizeInternalName,
  riotIdKey,
  RoundTracker,
  translateArmor,
  type RiotIdRosterEntry,
  type SpectraMatchData,
  type SpectraScoreboardEntry,
  type SpectraTeamData,
} from '@/lib/spectra/translate';

test('riotIdKey ไม่สนตัวพิมพ์เล็ก/ใหญ่ ช่องว่าง และ # นำหน้า tagline', () => {
  assert.equal(riotIdKey('Ming', '1234'), 'MING#1234');
  assert.equal(riotIdKey(' ming ', '#1234'), 'MING#1234');
});

test('translateArmor: 0 = NONE, ต่ำกว่าเต็ม = LIGHT, เต็ม = HEAVY', () => {
  assert.equal(translateArmor(0), 'NONE');
  assert.equal(translateArmor(25), 'LIGHT');
  assert.equal(translateArmor(50), 'HEAVY');
});

test('normalizeInternalName ตัด prefix/underscore แล้ว Title Case', () => {
  assert.equal(normalizeInternalName('Weapon_Vandal'), 'Vandal');
  assert.equal(normalizeInternalName('EEquippableWeapons::Phantom'), 'Phantom');
  assert.equal(normalizeInternalName('CLASSIC'), 'Classic');
});

function entry(over: Partial<SpectraScoreboardEntry> = {}): SpectraScoreboardEntry {
  return {
    name: 'Ming',
    tagline: '1234',
    playerId: 'p1',
    agentInternal: 'Jett',
    isAlive: true,
    initialArmor: 50,
    scoreboardWeaponInternal: 'Weapon_Vandal',
    currUltPoints: 6,
    maxUltPoints: 6,
    money: 4500,
    ...over,
  };
}

test('buildTelemetryPlayers จับคู่ได้ก็ส่ง ใช้ display_name ของเราไม่ใช่ Riot ID', () => {
  const roster = new Map<string, RiotIdRosterEntry>([['MING#1234', { displayName: 'MWL | Ming' }]]);
  const [frame] = buildTelemetryPlayers([entry()], roster);
  assert.equal(frame.name, 'MWL | Ming');
  assert.equal(frame.credits, 4500);
  assert.equal(frame.weapon, 'Vandal');
  assert.equal(frame.armor, 'HEAVY');
  assert.equal(frame.ultPoints, 6);
});

test('buildTelemetryPlayers ข้ามคนที่จับคู่ Riot ID ไม่ได้ ไม่ทำให้เฟรมอื่นพัง', () => {
  const roster = new Map<string, RiotIdRosterEntry>();
  const frames = buildTelemetryPlayers([entry()], roster);
  assert.deepEqual(frames, []);
});

test('buildTelemetryPlayers กันค่าเกินขอบเขตของ schema (credits/ult ติดลบหรือเกิน max)', () => {
  const roster = new Map<string, RiotIdRosterEntry>([['MING#1234', { displayName: 'Ming' }]]);
  const [frame] = buildTelemetryPlayers([entry({ money: -5, currUltPoints: 999, maxUltPoints: 0 })], roster);
  assert.equal(frame.credits, 0);
  assert.equal(frame.ultPoints, 20);
  assert.equal(frame.ultMax, 1);
});

// --- detectRoundWinner tests (legacy flat scoreboard) ---

const TEAM_A = 'aaaa-aaaa';
const TEAM_B = 'bbbb-bbbb';

function rosterWithTeams(): Map<string, RiotIdRosterEntry> {
  return new Map([
    ['MING#1234', { displayName: 'Ming', teamId: TEAM_A }],
    ['KONG#5678', { displayName: 'Kong', teamId: TEAM_A }],
    ['ZAP#0001', { displayName: 'Zap', teamId: TEAM_B }],
    ['RAY#0002', { displayName: 'Ray', teamId: TEAM_B }],
  ]);
}

test('detectRoundWinner: ทีม B ตายหมด → ทีม A ชนะ', () => {
  const scoreboard = [
    entry({ name: 'Ming', tagline: '1234', isAlive: true }),
    entry({ name: 'Kong', tagline: '5678', isAlive: true }),
    entry({ name: 'Zap', tagline: '0001', isAlive: false }),
    entry({ name: 'Ray', tagline: '0002', isAlive: false }),
  ];
  assert.equal(detectRoundWinner(scoreboard, rosterWithTeams()), TEAM_A);
});

test('detectRoundWinner: ทีม A ตายหมด → ทีม B ชนะ', () => {
  const scoreboard = [
    entry({ name: 'Ming', tagline: '1234', isAlive: false }),
    entry({ name: 'Kong', tagline: '5678', isAlive: false }),
    entry({ name: 'Zap', tagline: '0001', isAlive: true }),
    entry({ name: 'Ray', tagline: '0002', isAlive: false }),
  ];
  assert.equal(detectRoundWinner(scoreboard, rosterWithTeams()), TEAM_B);
});

test('detectRoundWinner: ทั้งสองทีมยังมีคนรอด → null (ยังไม่จบรอบ)', () => {
  const scoreboard = [
    entry({ name: 'Ming', tagline: '1234', isAlive: true }),
    entry({ name: 'Kong', tagline: '5678', isAlive: false }),
    entry({ name: 'Zap', tagline: '0001', isAlive: true }),
    entry({ name: 'Ray', tagline: '0002', isAlive: false }),
  ];
  assert.equal(detectRoundWinner(scoreboard, rosterWithTeams()), null);
});

test('detectRoundWinner: ไม่มี teamId ใน roster → null', () => {
  const noTeamRoster = new Map<string, RiotIdRosterEntry>([
    ['MING#1234', { displayName: 'Ming' }],
  ]);
  const scoreboard = [entry({ name: 'Ming', tagline: '1234', isAlive: false })];
  assert.equal(detectRoundWinner(scoreboard, noTeamRoster), null);
});

// --- RoundTracker (match_data-based) tests ---

function makePlayer(name: string, tagline: string, overrides: Partial<SpectraScoreboardEntry> = {}) {
  return {
    name,
    tagline,
    playerId: `p-${name}`,
    agentInternal: 'Jett',
    isAlive: true,
    initialArmor: 50,
    scoreboardWeaponInternal: 'Weapon_Vandal',
    currUltPoints: 3,
    maxUltPoints: 7,
    money: 3000,
    ...overrides,
  };
}

function makeTeams(team0Score: number, team1Score: number): SpectraTeamData[] {
  return [
    {
      teamName: 'Alpha',
      teamTricode: 'ALP',
      ingameTeamId: 0,
      isAttacking: true,
      roundsWon: team0Score,
      players: [
        makePlayer('Ming', '1234'),
        makePlayer('Kong', '5678'),
      ],
    },
    {
      teamName: 'Beta',
      teamTricode: 'BET',
      ingameTeamId: 1,
      isAttacking: false,
      roundsWon: team1Score,
      players: [
        makePlayer('Zap', '0001'),
        makePlayer('Ray', '0002'),
      ],
    },
  ];
}

function makeMatchData(overrides: Partial<SpectraMatchData> = {}): SpectraMatchData {
  return {
    roundNumber: 1,
    roundPhase: 'combat',
    spikeState: { planted: false, detonated: false, defused: false },
    attackersWon: false,
    teams: makeTeams(0, 0),
    ...overrides,
  };
}

test('RoundTracker: elimination — score change on phase transition to shopping', () => {
  const tracker = new RoundTracker();
  const roster = rosterWithTeams();

  // Baseline (first payload — absorbed, no outcome)
  tracker.processMatchData(makeMatchData({
    roundNumber: 1,
    roundPhase: 'shopping',
    teams: makeTeams(0, 0),
  }), roster);

  // Round 1 combat
  tracker.processMatchData(makeMatchData({
    roundNumber: 1,
    roundPhase: 'combat',
    teams: makeTeams(0, 0),
  }), roster);

  // Round 1 end
  tracker.processMatchData(makeMatchData({
    roundNumber: 1,
    roundPhase: 'end',
    attackersWon: true,
    spikeState: { planted: false, detonated: false, defused: false },
    teams: makeTeams(0, 0),
  }), roster);

  // Round 2 shopping — score updated: team 0 (attackers/Alpha) won
  const outcome = tracker.processMatchData(makeMatchData({
    roundNumber: 2,
    roundPhase: 'shopping',
    teams: makeTeams(1, 0),
    spikeState: { planted: false, detonated: false, defused: false },
  }), roster);

  assert.ok(outcome);
  assert.equal(outcome.winCondition, 'elimination');
  assert.equal(outcome.winnerTeamId, TEAM_A);
});

test('RoundTracker: spike_detonate — spikeState.detonated = true', () => {
  const tracker = new RoundTracker();
  const roster = rosterWithTeams();

  // Baseline
  tracker.processMatchData(makeMatchData({ roundNumber: 1, roundPhase: 'shopping', teams: makeTeams(0, 0) }), roster);

  tracker.processMatchData(makeMatchData({
    roundNumber: 1,
    roundPhase: 'combat',
    spikeState: { planted: true, detonated: false, defused: false },
    attackersWon: false,
    teams: makeTeams(0, 0),
  }), roster);

  tracker.processMatchData(makeMatchData({
    roundNumber: 1,
    roundPhase: 'end',
    spikeState: { planted: true, detonated: true, defused: false },
    attackersWon: true,
    teams: makeTeams(0, 0),
  }), roster);

  const outcome = tracker.processMatchData(makeMatchData({
    roundNumber: 2,
    roundPhase: 'shopping',
    teams: makeTeams(1, 0),
    spikeState: { planted: false, detonated: false, defused: false },
  }), roster);

  assert.ok(outcome);
  assert.equal(outcome.winCondition, 'spike_detonate');
  assert.equal(outcome.winnerTeamId, TEAM_A);
});

test('RoundTracker: spike_defuse — spikeState.defused = true, defenders win', () => {
  const tracker = new RoundTracker();
  const roster = rosterWithTeams();

  // Baseline
  tracker.processMatchData(makeMatchData({ roundNumber: 1, roundPhase: 'shopping', teams: makeTeams(0, 0) }), roster);

  tracker.processMatchData(makeMatchData({
    roundNumber: 1,
    roundPhase: 'combat',
    spikeState: { planted: true, detonated: false, defused: false },
    teams: makeTeams(0, 0),
  }), roster);

  tracker.processMatchData(makeMatchData({
    roundNumber: 1,
    roundPhase: 'end',
    spikeState: { planted: true, detonated: false, defused: true },
    attackersWon: false,
    teams: makeTeams(0, 0),
  }), roster);

  // Defenders (team 1 / Beta) win
  const outcome = tracker.processMatchData(makeMatchData({
    roundNumber: 2,
    roundPhase: 'shopping',
    teams: makeTeams(0, 1),
    spikeState: { planted: false, detonated: false, defused: false },
  }), roster);

  assert.ok(outcome);
  assert.equal(outcome.winCondition, 'spike_defuse');
  assert.equal(outcome.winnerTeamId, TEAM_B);
});

test('RoundTracker: no outcome when score unchanged (mid-round updates)', () => {
  const tracker = new RoundTracker();
  const roster = rosterWithTeams();

  // Baseline
  tracker.processMatchData(makeMatchData({ roundNumber: 1, roundPhase: 'shopping', teams: makeTeams(0, 0) }), roster);

  tracker.processMatchData(makeMatchData({
    roundNumber: 1,
    roundPhase: 'combat',
    teams: makeTeams(0, 0),
  }), roster);

  // Another combat update — same score
  const outcome = tracker.processMatchData(makeMatchData({
    roundNumber: 1,
    roundPhase: 'combat',
    teams: makeTeams(0, 0),
  }), roster);

  assert.equal(outcome, null);
});

test('RoundTracker: game_end triggers outcome', () => {
  const tracker = new RoundTracker();
  const roster = rosterWithTeams();

  // Baseline
  tracker.processMatchData(makeMatchData({ roundNumber: 24, roundPhase: 'shopping', teams: makeTeams(12, 12) }), roster);

  tracker.processMatchData(makeMatchData({
    roundNumber: 24,
    roundPhase: 'combat',
    teams: makeTeams(12, 12),
  }), roster);

  tracker.processMatchData(makeMatchData({
    roundNumber: 24,
    roundPhase: 'end',
    attackersWon: true,
    spikeState: { planted: false, detonated: false, defused: false },
    teams: makeTeams(12, 12),
  }), roster);

  const outcome = tracker.processMatchData(makeMatchData({
    roundNumber: 24,
    roundPhase: 'game_end',
    teams: makeTeams(13, 12),
  }), roster);

  assert.ok(outcome);
  assert.equal(outcome.winnerTeamId, TEAM_A);
});

test('buildTelemetryPlayersFromMatchData: maps nested teams[].players[] correctly', () => {
  const roster = rosterWithTeams();
  const teams = makeTeams(3, 2);
  const frames = buildTelemetryPlayersFromMatchData(teams, roster);
  assert.equal(frames.length, 4);
  assert.equal(frames[0].name, 'Ming');
  assert.equal(frames[2].name, 'Zap');
});

// Spectra only knows alive/dead — it must not overwrite the real HP that OCR reads mid-round.
test('buildTelemetryPlayersFromMatchData: HP ownership — dead=0, buy phase=100, alive in combat=omitted', () => {
  const roster = rosterWithTeams();
  const teams = makeTeams(0, 0);
  teams[0].players[0].isAlive = false;

  const combat = buildTelemetryPlayersFromMatchData(teams, roster, 'combat');
  assert.equal(combat[0].hp, 0);
  assert.equal(combat[1].hp, undefined);
  assert.equal(combat[1].hpMax, undefined);

  teams[0].players[0].isAlive = true;
  const shopping = buildTelemetryPlayersFromMatchData(teams, roster, 'shopping');
  assert.ok(shopping.every((f) => f.hp === 100));
});

// --- Baseline guard (QA item #1) ---

test('RoundTracker: first processMatchData is baseline only — no outcome even if scores differ from zero', () => {
  const tracker = new RoundTracker();
  const roster = rosterWithTeams();

  // Adapter reconnects mid-match at round 8, score 5-3
  const outcome = tracker.processMatchData(makeMatchData({
    roundNumber: 8,
    roundPhase: 'shopping',
    teams: makeTeams(5, 3),
  }), roster);

  assert.equal(outcome, null, 'first payload must be baseline only');
});

test('RoundTracker: resetBaseline allows re-baseline on reconnect', () => {
  const tracker = new RoundTracker();
  const roster = rosterWithTeams();

  // Normal usage
  tracker.processMatchData(makeMatchData({ roundNumber: 1, roundPhase: 'combat', teams: makeTeams(0, 0) }), roster);

  // Simulate reconnect
  tracker.resetBaseline();

  // First payload after reconnect — should be baseline, no outcome
  const outcome = tracker.processMatchData(makeMatchData({
    roundNumber: 5,
    roundPhase: 'shopping',
    teams: makeTeams(3, 2),
  }), roster);

  assert.equal(outcome, null, 'post-reconnect baseline must not emit outcome');
});

// --- PUUID matching (QA item #3) ---

test('RoundTracker: resolves winner via PUUID when Riot ID does not match', () => {
  const tracker = new RoundTracker();

  // Roster with PUUID but Riot ID that won't match Spectra's (different case)
  const roster = new Map<string, RiotIdRosterEntry>([
    ['NOMATCH#0000', { displayName: 'Ming', teamId: TEAM_A, puuid: 'p-Ming' }],
    ['KONG#5678', { displayName: 'Kong', teamId: TEAM_A }],
    ['ZAP#0001', { displayName: 'Zap', teamId: TEAM_B, puuid: 'p-Zap' }],
    ['RAY#0002', { displayName: 'Ray', teamId: TEAM_B }],
  ]);

  // Baseline
  tracker.processMatchData(makeMatchData({ roundNumber: 1, roundPhase: 'combat', teams: makeTeams(0, 0) }), roster);

  tracker.processMatchData(makeMatchData({
    roundNumber: 1, roundPhase: 'end', attackersWon: true,
    spikeState: { planted: false, detonated: false, defused: false }, teams: makeTeams(0, 0),
  }), roster);

  const outcome = tracker.processMatchData(makeMatchData({
    roundNumber: 2, roundPhase: 'shopping', teams: makeTeams(1, 0),
  }), roster);

  assert.ok(outcome);
  assert.equal(outcome.winnerTeamId, TEAM_A);
});

test('buildTelemetryPlayersFromMatchData: PUUID match takes priority over Riot ID', () => {
  // Roster keyed by wrong Riot ID but correct PUUID
  const roster = new Map<string, RiotIdRosterEntry>([
    ['WRONG#0000', { displayName: 'Ming (PUUID)', teamId: TEAM_A, puuid: 'p-Ming' }],
  ]);
  const teams: SpectraTeamData[] = [{
    teamName: 'A', teamTricode: 'A', ingameTeamId: 0, isAttacking: true, roundsWon: 0,
    players: [makePlayer('Ming', '1234')], // playerId = 'p-Ming'
  }];
  const frames = buildTelemetryPlayersFromMatchData(teams, roster);
  assert.equal(frames.length, 1);
  assert.equal(frames[0].name, 'Ming (PUUID)');
});

// --- Overtime / side switch (QA item #4) ---

test('RoundTracker: round 13 side switch — isAttacking flips, outcome still resolves', () => {
  const tracker = new RoundTracker();
  const roster = rosterWithTeams();

  // Baseline
  tracker.processMatchData(makeMatchData({ roundNumber: 12, roundPhase: 'combat', teams: makeTeams(6, 6) }), roster);

  // Round 12 end — team 0 was attacking, now defenders win
  const teamsR12End = makeTeams(6, 6);
  tracker.processMatchData(makeMatchData({
    roundNumber: 12, roundPhase: 'end', attackersWon: false,
    spikeState: { planted: false, detonated: false, defused: false }, teams: teamsR12End,
  }), roster);

  // Round 13 shopping — sides switch, team 1 won round 12 (defenders → now attackers)
  const teamsR13 = makeTeams(6, 7);
  // Flip sides for round 13
  teamsR13[0].isAttacking = false;
  teamsR13[1].isAttacking = true;

  const outcome = tracker.processMatchData(makeMatchData({
    roundNumber: 13, roundPhase: 'shopping', teams: teamsR13,
  }), roster);

  assert.ok(outcome);
  assert.equal(outcome.winnerTeamId, TEAM_B);
  assert.equal(outcome.winCondition, 'elimination');
});

test('RoundTracker: overtime round — score 12-12, one team wins round 25', () => {
  const tracker = new RoundTracker();
  const roster = rosterWithTeams();

  // Baseline at round 25
  tracker.processMatchData(makeMatchData({ roundNumber: 25, roundPhase: 'combat', teams: makeTeams(12, 12) }), roster);

  tracker.processMatchData(makeMatchData({
    roundNumber: 25, roundPhase: 'end', attackersWon: true,
    spikeState: { planted: true, detonated: true, defused: false }, teams: makeTeams(12, 12),
  }), roster);

  const outcome = tracker.processMatchData(makeMatchData({
    roundNumber: 25, roundPhase: 'game_end', teams: makeTeams(13, 12),
  }), roster);

  assert.ok(outcome);
  assert.equal(outcome.winnerTeamId, TEAM_A);
  assert.equal(outcome.winCondition, 'spike_detonate');
});
