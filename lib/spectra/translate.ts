// lib/spectra/translate.ts
// แปลงข้อมูล scoreboard จาก Spectra-Server (อ่านผ่าน Overwolf GEP บนเครื่อง Observer) ให้เป็นรูปแบบ
// TelemetryPlayerFrame ของเราเอง (lib/overlay/telemetry-schema.ts) — ไม่ใช้ OCR เลยสำหรับส่วนนี้
// จับคู่คนด้วย Riot ID (name#tagline) ตรง ๆ กับ game_accounts ในระบบเรา แม่นกว่าอ่านชื่อบนจอมาก และ
// ทำงานได้ทุกวินาทีไม่ต้องรอกด Tab (GEP อ่านจากสถานะเกม ไม่ใช่จากภาพหน้าจอ) — ดู scripts/spectra-adapter.ts
// สำหรับตัวเชื่อมสาย WebSocket จริง (ยังไม่มีของจริงให้ทดสอบคืนนี้ ทดสอบกับ Spectra-Server จริงก่อนใช้งาน)
//
// ⚠️ initialArmor และ scoreboardWeaponInternal/agentInternal เป็นค่าดิบจากภายในเกม รูปแบบที่แน่นอนยัง
// ไม่เคยเห็นข้อมูลจริง (เอกสาร Spectra ไม่ได้ระบุ range/format ชัดเจน) ค่า threshold ด้านล่างเป็นการ
// ประมาณตามสัดส่วนเกราะจริงของ VALORANT (25 = Light, 50 = Heavy) — ต้องเทียบกับข้อมูลจริงก่อนใช้งานจริง
import type { TelemetryPlayerFrame } from '@/lib/overlay/telemetry-schema';

export interface SpectraScoreboardEntry {
  name: string;
  tagline: string;
  playerId: string;
  agentInternal: string;
  isAlive: boolean;
  initialArmor: number;
  scoreboardWeaponInternal: string;
  currUltPoints: number;
  maxUltPoints: number;
  money: number;
}

/** riot_id ("Name#Tag") -> ผู้เล่นในระบบเรา ใช้จับคู่ scoreboard entry กับ display_name ที่ Overlay ใช้อยู่ */
export interface RiotIdRosterEntry {
  displayName: string;
}

/** ทำ key มาตรฐานจาก game_name + tag_line (ไม่สนตัวพิมพ์เล็ก/ใหญ่ ตัดช่องว่างหัวท้าย ตัด # นำหน้า tagline ถ้ามี) */
export function riotIdKey(name: string, tagline: string): string {
  const cleanTag = tagline.trim().replace(/^#/, '');
  return `${name.trim()}#${cleanTag}`.toUpperCase();
}

/** เกราะ 0 = ไม่มี, ต่ำกว่า Heavy เต็ม (50) = Light, ครบ = Heavy — เกณฑ์ยังไม่ยืนยันกับข้อมูลจริง (ดูคอมเมนต์บนไฟล์) */
export function translateArmor(initialArmor: number): TelemetryPlayerFrame['armor'] {
  if (!initialArmor || initialArmor <= 0) return 'NONE';
  if (initialArmor < 50) return 'LIGHT';
  return 'HEAVY';
}

/** ชื่ออาวุธ/เอเจนต์ภายในของ Overwolf มักมีรูปแบบ prefix/underscore เช่น "Weapon_Vandal" — ตัดให้เหลือชื่ออ่านง่าย */
export function normalizeInternalName(internal: string): string {
  const stripped = internal.replace(/^.*[_:]/, '').trim();
  if (!stripped) return internal;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1).toLowerCase();
}

/**
 * แปลง scoreboard ทั้งชุดจาก Spectra เป็น TelemetryPlayerFrame[] พร้อมส่งเข้า /telemetry
 * เฉพาะคนที่จับคู่ Riot ID กับ roster ของเราได้เท่านั้นจะอยู่ในผลลัพธ์ (คนที่จับคู่ไม่ได้ถูกข้าม ไม่ใช่ error)
 * ไม่ใส่ hp/hpMax เพราะ Spectra ไม่มีข้อมูล HP ของศัตรู — ให้ OCR (lib/ocr/hp-bar.ts) ดูแลส่วนนั้นต่อไป
 */
export function buildTelemetryPlayers(
  scoreboard: SpectraScoreboardEntry[],
  rosterByRiotId: Map<string, RiotIdRosterEntry>
): TelemetryPlayerFrame[] {
  const frames: TelemetryPlayerFrame[] = [];
  for (const entry of scoreboard) {
    const roster = rosterByRiotId.get(riotIdKey(entry.name, entry.tagline));
    if (!roster) continue; // อาจเป็นบัญชีสำรอง/ยังไม่ล็อกไว้ — ปล่อยผ่านไม่ทำให้เฟรมอื่นพัง
    frames.push({
      name: roster.displayName,
      credits: Math.max(0, Math.min(99999, Math.round(entry.money))),
      weapon: normalizeInternalName(entry.scoreboardWeaponInternal),
      armor: translateArmor(entry.initialArmor),
      ultPoints: Math.max(0, Math.min(20, Math.round(entry.currUltPoints))),
      ultMax: Math.max(1, Math.min(20, Math.round(entry.maxUltPoints) || 1)),
    });
  }
  return frames;
}
