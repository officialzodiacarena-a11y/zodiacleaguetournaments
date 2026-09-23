// Run: npx tsx --test tests/hp-bar.test.ts
// อ่าน HP จากสัดส่วนพิกเซลที่สว่างในหลอดเลือด (lib/ocr/hp-bar.ts)
import test from 'node:test';
import assert from 'node:assert/strict';
import { hpPercentFromPixels } from '@/lib/ocr/hp-bar';

const FILLED: [number, number, number] = [90, 230, 140]; // เขียวสว่างแบบหลอดเลือด
const EMPTY: [number, number, number] = [20, 22, 30]; // พื้นแผง HUD สีเข้ม

// สร้างหลอดกว้าง width สูง height โดยมีเลือด filledCols คอลัมน์ เริ่มจากซ้าย (หรือขวา ถ้า fromRight)
function bar(width: number, height: number, filledCols: number, fromRight = false): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const filled = fromRight ? x >= width - filledCols : x < filledCols;
      const [r, g, b] = filled ? FILLED : EMPTY;
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return data;
}

test('เลือดเต็ม = 100, หมด = 0', () => {
  assert.equal(hpPercentFromPixels(bar(170, 10, 170), 170, 10), 100);
  assert.equal(hpPercentFromPixels(bar(170, 10, 0), 170, 10), 0);
});

test('เลือดครึ่งหลอด ~50 ไม่ว่าหลอดลดจากซ้ายหรือขวา', () => {
  assert.equal(hpPercentFromPixels(bar(100, 10, 50), 100, 10), 50);
  assert.equal(hpPercentFromPixels(bar(100, 10, 50, true), 100, 10), 50);
});

test('จุดสว่างแถวเดียว (ขอบกรอบ/สัญญาณรบกวน) ไม่ถูกนับเป็นเลือด', () => {
  const width = 100;
  const height = 10;
  const data = bar(width, height, 30);
  // เส้นขอบสว่างแถวบนสุดตลอดความกว้าง
  for (let x = 0; x < width; x++) {
    const i = x * 4;
    data[i] = data[i + 1] = data[i + 2] = 255;
  }
  assert.equal(hpPercentFromPixels(data, width, height), 30);
});

test('ขนาดผิดปกติ (0) คืน 0 ไม่ throw', () => {
  assert.equal(hpPercentFromPixels(new Uint8ClampedArray(0), 0, 0), 0);
});
