// tests/chrome-visibility.test.ts
// ทดสอบกฎว่าหน้าไหนแสดง Navbar และปุ่มลอยแชทบอท (ZodiacOracle)
// รัน: npx tsx --test tests/chrome-visibility.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromeVisibility } from '@/lib/layout/chromeVisibility';

const both = { navbar: true, oracle: true };
const noOracle = { navbar: true, oracle: false };
const none = { navbar: false, oracle: false };

test('Clean View เดิม: /overlay และ /stream-hub ไม่แสดงอะไรเลย', () => {
  assert.deepEqual(chromeVisibility('/overlay/match/abc'), none);
  assert.deepEqual(chromeVisibility('/stream-hub'), none);
  assert.deepEqual(chromeVisibility('/stream-hub/abc'), none);
});

test('หน้าไลฟ์: มี Navbar ไม่มีแชทบอท · เทียบเป็นช่วงของเส้นทาง', () => {
  assert.deepEqual(chromeVisibility('/live'), noOracle);
  assert.deepEqual(chromeVisibility('/live/abc'), noOracle);
  assert.deepEqual(chromeVisibility('/livestream'), both);
});

test('หน้าแอดมินทั้งหมด: มี Navbar ไม่มีแชทบอท · เทียบเป็นช่วงของเส้นทาง', () => {
  assert.deepEqual(chromeVisibility('/admin'), noOracle);
  assert.deepEqual(chromeVisibility('/admin/tournaments/abc/bracket'), noOracle);
  assert.deepEqual(chromeVisibility('/administrator'), both);
});

test('ห้อง Lobby และห้อง Veto ของแมตช์: มี Navbar ไม่มีแชทบอท', () => {
  assert.deepEqual(chromeVisibility('/matches/abc/lobby'), noOracle);
  assert.deepEqual(chromeVisibility('/matches/abc/veto'), noOracle);
  assert.deepEqual(chromeVisibility('/matches/abc/veto/extra'), noOracle);
});

test('หน้าแมตช์อื่นและหน้าอื่นทั้งหมด: เหมือนเดิม (แสดงทั้งคู่)', () => {
  assert.deepEqual(chromeVisibility('/matches'), both);
  assert.deepEqual(chromeVisibility('/matches/abc/report'), both);
  for (const p of ['/', '/home', '/dashboard', '/chatbot', '/tournament/abc', '/teams/abc']) {
    assert.deepEqual(chromeVisibility(p), both, p);
  }
});

test('ไม่มี pathname (null / undefined): แสดงทั้งคู่เหมือนโค้ดเดิม', () => {
  assert.deepEqual(chromeVisibility(null), both);
  assert.deepEqual(chromeVisibility(undefined), both);
});
