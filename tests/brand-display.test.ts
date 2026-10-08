import test from 'node:test';
import assert from 'node:assert/strict';
import { brandBadge, brandPageHref, categoryTabLabel, toStoreBrand } from '../lib/store/brand-display';

const sponsored = { slug: 'luminary', name: 'LUMINARY GLOBAL', badge_icon: null, has_sponsor: true };
const plain = { slug: 'sinopec', name: 'SINOPEC', badge_icon: '🛢️', has_sponsor: false };

test('brandBadge: แบรนด์ผูกสปอนเซอร์ → ป้ายสปอนเซอร์', () => {
  assert.deepEqual(brandBadge(sponsored, 'LUMINARY GLOBAL'), { label: 'LUMINARY GLOBAL', tone: 'SPONSOR', icon: null });
});

test('brandBadge: แบรนด์ธรรมดา → ป้ายธรรมดา พร้อมไอคอน', () => {
  assert.deepEqual(brandBadge(plain, 'SINOPEC'), { label: 'SINOPEC', tone: 'BRAND', icon: '🛢️' });
});

test('brandBadge: ไม่มี brand แต่มี partner_brand → ป้ายธรรมดาจากข้อความ (สินค้าที่เพิ่มก่อน K4)', () => {
  assert.deepEqual(brandBadge(null, ' SPACE '), { label: 'SPACE', tone: 'BRAND', icon: null });
  assert.deepEqual(brandBadge(undefined, 'PINKY POP'), { label: 'PINKY POP', tone: 'BRAND', icon: null });
});

test('brandBadge: ไม่มีทั้งสองอย่าง → ไม่มีป้าย (ไม่ใส่ชื่อแบรนด์ให้เอง)', () => {
  assert.equal(brandBadge(null, null), null);
  assert.equal(brandBadge(null, '   '), null);
});

test('brandPageHref: มีลิงก์เฉพาะแบรนด์ที่ผูกสปอนเซอร์ ใช้ slug ของแบรนด์', () => {
  assert.equal(brandPageHref(sponsored), '/sponsor/luminary');
  assert.equal(brandPageHref(plain), null);
  assert.equal(brandPageHref(null), null);
  assert.equal(brandPageHref({ ...sponsored, slug: 'a b/c' }), '/sponsor/a%20b%2Fc');
});

test('categoryTabLabel: ไอคอนแบรนด์นำหน้า ถ้ามี', () => {
  assert.equal(categoryTabLabel('น้ำมัน', plain), '🛢️ น้ำมัน');
  assert.equal(categoryTabLabel('เครื่องดื่ม', null), 'เครื่องดื่ม');
  assert.equal(categoryTabLabel('เครื่องดื่ม', { badge_icon: '  ' }), 'เครื่องดื่ม');
});

test('toStoreBrand: ไม่ส่ง sponsor_id ออก มีแต่ has_sponsor', () => {
  assert.deepEqual(toStoreBrand({ slug: 's', name: 'S', badge_icon: null, sponsor_id: 'abc' }), {
    slug: 's', name: 'S', badge_icon: null, has_sponsor: true,
  });
  assert.equal(toStoreBrand({ slug: 's', name: 'S', badge_icon: null, sponsor_id: null })?.has_sponsor, false);
  assert.equal(toStoreBrand(null), null);
});
