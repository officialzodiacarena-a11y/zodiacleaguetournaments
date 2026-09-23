// lib/ocr/ocr-worker-pool.ts
// Client-side WASM OCR Engine (Tesseract.js) — SPEC-OCR-TELEMETRY-ROUNDS-V8.01-001 Section 1.2
// ประมวลผล 100% บนเครื่อง Observer เอง ไม่มี Cloud API, ไม่มีค่าใช้จ่าย, ไม่ส่งภาพออกนอกเครื่อง
// ต้อง import เฉพาะฝั่ง client ("use client") ห้าม import จาก Server Component/Route Handler
'use client';

import { createWorker, type Worker } from 'tesseract.js';

const POOL_SIZE = 2;

let workerPoolPromise: Promise<Worker[]> | null = null;
let nextWorkerIndex = 0;

async function getWorkerPool(): Promise<Worker[]> {
  if (!workerPoolPromise) {
    workerPoolPromise = Promise.all(
      Array.from({ length: POOL_SIZE }, () => createWorker('eng'))
    );
  }
  return workerPoolPromise;
}

/** ส่ง canvas ที่ crop มาแล้วเข้า OCR แล้วคืนข้อความดิบที่อ่านได้ (round-robin ระหว่าง worker ในพูล) */
export async function recognizeText(image: HTMLCanvasElement): Promise<string> {
  const pool = await getWorkerPool();
  const worker = pool[nextWorkerIndex % pool.length];
  nextWorkerIndex += 1;

  const { data } = await worker.recognize(image);
  return data.text.trim();
}

/** เรียกตอน unmount หน้า Observer Control เพื่อคืน memory ของ Web Worker */
export async function terminateOcrWorkerPool(): Promise<void> {
  if (!workerPoolPromise) return;
  const pool = await workerPoolPromise;
  await Promise.all(pool.map((w) => w.terminate()));
  workerPoolPromise = null;
}
