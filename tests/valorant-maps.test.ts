import test from 'node:test';
import assert from 'node:assert/strict';
import { VALORANT_MAPS, canonicalMapName, normalizeMapPool, toggleMap, extraMaps } from '../lib/veto/valorant-maps';

test('รายการมี 13 แมพตามภาพ mapban.gg ไม่ซ้ำ', () => {
  assert.equal(VALORANT_MAPS.length, 13);
  assert.equal(new Set(VALORANT_MAPS.map((m) => m.toLowerCase())).size, 13);
  for (const m of ['Abyss', 'Ascent', 'Bind', 'Breeze', 'Corrode', 'Fracture', 'Haven', 'Icebox', 'Lotus', 'Pearl', 'Split', 'Summit', 'Sunset']) {
    assert.ok(VALORANT_MAPS.includes(m), m);
  }
});

test('canonicalMapName: ไม่สนตัวพิมพ์/ช่องว่าง · ชื่อนอกรายการ → null', () => {
  assert.equal(canonicalMapName(' ICEBOX '), 'Icebox');
  assert.equal(canonicalMapName('corrode'), 'Corrode');
  assert.equal(canonicalMapName('Dust2'), null);
  assert.equal(canonicalMapName(''), null);
});

test('normalizeMapPool: แปลงสะกด ตัดซ้ำ ตัดค่าว่าง คงชื่อนอกรายการ', () => {
  assert.deepEqual(normalizeMapPool(['ascent', 'Ascent', ' split', '', 'Dust2']), ['Ascent', 'Split', 'Dust2']);
});

test('toggleMap: ติ๊กเพิ่มต่อท้าย · ติ๊กซ้ำเอาออก (ไม่สนตัวพิมพ์)', () => {
  assert.deepEqual(toggleMap(['Bind'], 'Haven'), ['Bind', 'Haven']);
  assert.deepEqual(toggleMap(['Bind', 'Haven'], 'bind'), ['Haven']);
});

test('extraMaps: เฉพาะชื่อที่ไม่อยู่ในรายการ', () => {
  assert.deepEqual(extraMaps(['Bind', 'Dust2', 'sunset']), ['Dust2']);
});
