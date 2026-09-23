// Run: npx tsx --test tests/spectra-translate.test.ts
// แปลง scoreboard จาก Spectra-Server เป็น TelemetryPlayerFrame (lib/spectra/translate.ts)
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTelemetryPlayers, normalizeInternalName, riotIdKey, translateArmor, type RiotIdRosterEntry, type SpectraScoreboardEntry } from '@/lib/spectra/translate';

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
