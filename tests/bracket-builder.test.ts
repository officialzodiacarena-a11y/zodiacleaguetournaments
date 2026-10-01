// tests/bracket-builder.test.ts
// ทดสอบตรรกะของหน้าจัดสาย (F6): แปลง Bo → best_of_config · เวลาไทย → ISO +07:00 · สิทธิ์ · ลำดับทีม · ข้อความ error
// รัน: npx tsx --test tests/bracket-builder.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bestOfConfigForPreset,
  bracketApiErrorMessage,
  BRACKET_API_FALLBACK_MESSAGE,
  canManageBrackets,
  isoToThaiParts,
  moveItem,
  presetFromBestOfConfig,
  seedCountProblem,
  shuffled,
  thaiLocalToIso,
} from '@/lib/tournament/bracketBuilder';

test('Bo → best_of_config: Bo1 ทุกรอบ / Bo3 ทุกรอบ / Bo1 + รอบรอง-ชิง Bo3', () => {
  assert.deepEqual(bestOfConfigForPreset('BO1_ALL'), { default: 1 });
  assert.deepEqual(bestOfConfigForPreset('BO3_ALL'), { default: 3 });
  assert.deepEqual(bestOfConfigForPreset('BO1_FINALS_BO3'), { default: 1, semifinal: 3, final: 3 });
});

test('best_of_config → preset ย้อนกลับได้ และค่านอกชุดคืน null', () => {
  for (const p of ['BO1_ALL', 'BO3_ALL', 'BO1_FINALS_BO3'] as const) {
    assert.equal(presetFromBestOfConfig(bestOfConfigForPreset(p)), p);
  }
  assert.equal(presetFromBestOfConfig({ default: 5 }), null);
  assert.equal(presetFromBestOfConfig({ default: 1, final: 5 }), null);
  assert.equal(presetFromBestOfConfig(null), null);
});

test('เวลาไทย → ISO +07:00 (ค่าเริ่ม 20:00)', () => {
  assert.equal(thaiLocalToIso('2026-10-03', '20:00'), '2026-10-03T20:00:00+07:00');
  // ต้องเป็นเวลาเดียวกับ 13:00 UTC
  assert.equal(Date.parse(thaiLocalToIso('2026-10-03', '20:00') as string), Date.parse('2026-10-03T13:00:00Z'));
});

test('เวลาไทย: รูปแบบผิด/วันไม่มีจริง → null', () => {
  assert.equal(thaiLocalToIso('', '20:00'), null);
  assert.equal(thaiLocalToIso('2026-10-03', ''), null);
  assert.equal(thaiLocalToIso('03/10/2026', '20:00'), null);
  assert.equal(thaiLocalToIso('2026-10-03', '25:00'), null);
  assert.equal(thaiLocalToIso('2026-10-03', '20:60'), null);
  assert.equal(thaiLocalToIso('2026-13-40', '20:00'), null);
});

test('ISO จาก DB (UTC) → วันที่/เวลาไทยสำหรับช่อง input · ข้ามเที่ยงคืน', () => {
  assert.deepEqual(isoToThaiParts('2026-10-03T13:00:00Z'), { date: '2026-10-03', time: '20:00' });
  assert.deepEqual(isoToThaiParts('2026-10-03T13:00:00+00:00'), { date: '2026-10-03', time: '20:00' });
  assert.deepEqual(isoToThaiParts('2026-10-03T20:00:00+07:00'), { date: '2026-10-03', time: '20:00' });
  assert.deepEqual(isoToThaiParts('2026-10-02T17:30:00Z'), { date: '2026-10-03', time: '00:30' });
  assert.equal(isoToThaiParts(null), null);
  assert.equal(isoToThaiParts('nope'), null);
});

test('thaiLocalToIso ↔ isoToThaiParts วนกลับได้', () => {
  const iso = thaiLocalToIso('2026-10-03', '20:00') as string;
  assert.deepEqual(isoToThaiParts(iso), { date: '2026-10-03', time: '20:00' });
});

test('สิทธิ์: ผู้ใช้ทั่วไป ไม่ผ่าน (→ 403/redirect) · REFEREE ผ่าน · ADMIN ผ่าน · SUPER_ADMIN ผ่าน', () => {
  assert.equal(canManageBrackets([{ role: 'ATHLETE' }]), false);
  assert.equal(canManageBrackets([{ role: 'ATHLETE' }, { role: 'TEAM_MANAGER' }]), false);
  assert.equal(canManageBrackets([{ role: 'MARKETPLACE_ADMIN' }]), false);
  assert.equal(canManageBrackets([]), false);
  assert.equal(canManageBrackets(null), false);
  assert.equal(canManageBrackets([{ role: 'REFEREE' }]), true);
  assert.equal(canManageBrackets([{ role: 'ADMIN' }]), true);
  assert.equal(canManageBrackets([{ role: 'SUPER_ADMIN' }]), true);
});

test('สิทธิ์: ผู้ใช้หลาย role (ATHLETE + REFEREE) ผ่าน', () => {
  assert.equal(canManageBrackets([{ role: 'ATHLETE' }, { role: 'REFEREE' }]), true);
});

test('seedCountProblem: ต้องเท่า teams_in และอย่างน้อย 2 ทีม', () => {
  assert.equal(seedCountProblem(8, 8), null);
  assert.equal(seedCountProblem(8, null), null);
  assert.match(seedCountProblem(7, 8) as string, /จำนวนทีมไม่ตรง/);
  assert.match(seedCountProblem(1, null) as string, /อย่างน้อย 2 ทีม/);
});

test('shuffled: ไม่แก้อาร์เรย์เดิม · ได้สมาชิกครบเท่าเดิม · rng คงที่ให้ผลคงที่', () => {
  const src = ['a', 'b', 'c', 'd', 'e'];
  const out = shuffled(src, () => 0.5);
  assert.deepEqual(src, ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(out.slice().sort(), src);
  assert.deepEqual(shuffled(src, () => 0.5), out);
  const random = shuffled(src);
  assert.deepEqual(random.slice().sort(), src);
});

test('moveItem: ขยับขึ้น/ลง · ขอบเขตผิดไม่เปลี่ยน', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 1, 0), ['b', 'a', 'c']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 5), ['a', 'b', 'c']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], -1, 1), ['a', 'b', 'c']);
});

test('ข้อความ error เป็นไทยตาม code · code แปลกหรือข้อความดิบ → ข้อความกลาง ไม่ส่งต่อ message ดิบ', () => {
  assert.equal(bracketApiErrorMessage('TEAM_NOT_CHECKED_IN'), 'มีทีมที่ยังไม่ชำระ/ยังไม่ได้รับการอนุมัติ');
  assert.equal(bracketApiErrorMessage('TEAM_COUNT_MISMATCH'), 'จำนวนทีมไม่ตรงกับที่ตั้งไว้ในสาย');
  assert.equal(bracketApiErrorMessage('SOMETHING_NEW'), BRACKET_API_FALLBACK_MESSAGE);
  assert.equal(bracketApiErrorMessage(undefined), BRACKET_API_FALLBACK_MESSAGE);
  assert.equal(bracketApiErrorMessage('relation "x" does not exist'), BRACKET_API_FALLBACK_MESSAGE);
});
