// Run: npx tsx --test tests/spectra-translate.test.ts
// แปลง scoreboard จาก Spectra-Server เป็น TelemetryPlayerFrame (lib/spectra/translate.ts)
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTelemetryPlayers, detectRoundWinner, normalizeInternalName, riotIdKey, RoundTracker, translateArmor, type RiotIdRosterEntry, type SpectraScoreboardEntry } from '@/lib/spectra/translate';

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

// --- detectRoundWinner tests ---

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

// --- RoundTracker (win condition heuristic) tests ---

function allAliveScoreboard(): SpectraScoreboardEntry[] {
  return [
    entry({ name: 'Ming', tagline: '1234', isAlive: true }),
    entry({ name: 'Kong', tagline: '5678', isAlive: true }),
    entry({ name: 'Zap', tagline: '0001', isAlive: true }),
    entry({ name: 'Ray', tagline: '0002', isAlive: true }),
  ];
}

function teamBDeadScoreboard(): SpectraScoreboardEntry[] {
  return [
    entry({ name: 'Ming', tagline: '1234', isAlive: true }),
    entry({ name: 'Kong', tagline: '5678', isAlive: true }),
    entry({ name: 'Zap', tagline: '0001', isAlive: false }),
    entry({ name: 'Ray', tagline: '0002', isAlive: false }),
  ];
}

test('RoundTracker: elimination — ทีม B ตายหมด ไม่มี spike events', () => {
  const tracker = new RoundTracker();
  tracker.advanceRound(1);
  const outcome = tracker.resolveRoundEnd(teamBDeadScoreboard(), rosterWithTeams());
  assert.ok(outcome);
  assert.equal(outcome.winCondition, 'elimination');
  assert.equal(outcome.winnerTeamId, TEAM_A);
});

test('RoundTracker: spike_detonate — spike ระเบิดสำเร็จ', () => {
  const tracker = new RoundTracker();
  tracker.advanceRound(1);
  tracker.onSpikeDetonated();
  const outcome = tracker.resolveRoundEnd(teamBDeadScoreboard(), rosterWithTeams());
  assert.ok(outcome);
  assert.equal(outcome.winCondition, 'spike_detonate');
});

test('RoundTracker: spike_defuse — กู้ระเบิดสำเร็จ', () => {
  const tracker = new RoundTracker();
  tracker.advanceRound(1);
  tracker.onSpikeDefused();
  const outcome = tracker.resolveRoundEnd(teamBDeadScoreboard(), rosterWithTeams());
  assert.ok(outcome);
  assert.equal(outcome.winCondition, 'spike_defuse');
});

test('RoundTracker: time_expire — ไม่มี spike events ทั้งสองทีมยังเหลือคน', () => {
  const tracker = new RoundTracker();
  tracker.advanceRound(1);
  const outcome = tracker.resolveRoundEnd(allAliveScoreboard(), rosterWithTeams());
  // time_expire แต่ทั้งสองทีมยังมีคนเหลือ + ไม่มี score update → winner resolve ไม่ได้
  assert.equal(outcome, null);
});

test('RoundTracker: advanceRound reset spike flags', () => {
  const tracker = new RoundTracker();
  tracker.advanceRound(1);
  tracker.onSpikeDetonated();
  tracker.advanceRound(2);
  const outcome = tracker.resolveRoundEnd(teamBDeadScoreboard(), rosterWithTeams());
  assert.ok(outcome);
  assert.equal(outcome.winCondition, 'elimination');
});

test('RoundTracker: resolveRoundEnd reset spike flags หลัง resolve', () => {
  const tracker = new RoundTracker();
  tracker.advanceRound(1);
  tracker.onSpikeDefused();
  tracker.resolveRoundEnd(teamBDeadScoreboard(), rosterWithTeams());
  // resolve ครั้งที่สองไม่มี spike flag ค้าง
  const outcome2 = tracker.resolveRoundEnd(teamBDeadScoreboard(), rosterWithTeams());
  assert.ok(outcome2);
  assert.equal(outcome2.winCondition, 'elimination');
});
