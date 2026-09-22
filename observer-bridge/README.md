# Observer Bridge (Overwolf)

แอป Overwolf ขนาดเล็กที่รันบน**เครื่อง Observer/Spectator เท่านั้น** อ่านข้อมูล scoreboard ของ Valorant
ผ่าน Overwolf GEP (เงิน/อาวุธ/เกราะ/Ult) แล้วยิงเข้า `POST /api/v1/matches/[id]/telemetry` ของ Zodiac Arena
ทุก 1 วินาที เพื่อไปโผล่ที่ Buy Phase HUD (`components/overlay/BuyPhaseHud.tsx`) ของ Overlay ถ่ายทอดสด

อ้างอิงมติ: `D:\Obsidian\Vault-V501\07_Decisions_ADR\ADR-004_Observer_Bridge_Telemetry_Data_Source.md`

## กฎบังคับ (จาก ADR-004 — ห้ามข้าม)

- ติดตั้ง/รันแอปนี้ **เฉพาะเครื่อง Observer เท่านั้น** ผู้เล่นทั้ง 10 คนในแมตช์ **ห้ามติดตั้งเด็ดขาด**
- **ต้องทดสอบกับบัญชี/เครื่องสำรอง** (ไม่ใช่บัญชีแข่งขันจริง) ก่อนใช้งานกับทัวร์นาเมนต์จริงทุกครั้ง
- นี่คือข้อยกเว้นชั่วคราวของ Zero-Contact Security Policy (Ticket #8) — ถ้า Riot RSO อนุมัติ Tournament API เมื่อไหร่ ให้ทบทวนว่าจะเลิกใช้เส้นทางนี้

## ทำไมเลือกเขียนเองแทนการ fork Spectra-Client

ADR-004 อนุญาตทั้งสองทาง เลือกเขียนเองเพราะ:

- โจทย์แคบมาก (5 ฟิลด์ต่อผู้เล่น ยิงเข้า endpoint เดียวที่มีอยู่แล้ว) — Spectra-Client เป็นระบบ 3 ส่วน (Client/Server/Frontend)
  เต็มรูปแบบสำหรับโปรดักชันถ่ายทอดสดทั้งชุด ใหญ่เกินความจำเป็นและ README ของมันไม่เปิดเผยรายละเอียดว่าจะเสียบ endpoint
  ของเราเข้าไปตรงไหนโดยไม่เจาะซอร์สเพิ่ม
- แอปที่คุมเองทั้งหมด ตรวจสอบง่ายกว่า (สำคัญเพราะรันบนเครื่องที่เล่นเกมจริง มีความเสี่ยง Vanguard อยู่แล้วตาม ADR)
- ตรงกับกฎ anti-overengineering ที่ทีมตกลงกันไว้ในเซสชันนี้เอง (ดู Vault §3 ของเคสศึกษา Workflow-Sync)

## ⚠️ สิ่งที่ต้องเช็คก่อนเริ่ม (เจอระหว่างค้นคว้า ยังไม่ verify จริง)

เอกสารของ Overwolf (ทั้งจาก dev.overwolf.com และแหล่งภายนอก) ระบุว่า**การ "Load unpacked extension" ต้องใช้บัญชี
Overwolf ที่ผ่านการ whitelist เป็น developer ก่อน** (ปกติต้องอีเมลขอกับทีม Overwolf) — ไม่ใช่ instant approval
เหมือนสมัคร dev account ทั่วไป ถ้าเครื่อง Observer ยังไม่เคย sideload แอป Overwolf มาก่อน **ให้ลองขั้นตอนนี้ก่อนเป็นอันดับแรก**
เพื่อดูว่าเจอ gate เดียวกับที่ Riot RSO เจอหรือไม่ (ถ้าใช่ ต้องแจ้งพี่หยัด/พี่ศิลาทันทีเพราะกระทบเดดไลน์คืนนี้เหมือนกัน):

1. เปิด Overwolf → คลิกขวาที่ dock หรือไอคอนประแจ → แท็บ **Support** → **Development options**
2. กด **Load unpacked extension** → เลือกโฟลเดอร์นี้ (`observer-bridge/`)
3. ถ้าขึ้น error เกี่ยวกับสิทธิ์ developer/whitelist → หยุดตรงนี้แล้วแจ้งทีมทันที อย่าไปเสียเวลาลองแก้เอง

## Mapping ที่ยังไม่ verify — ต้องเทียบสายตากับเกมจริงคืนนี้

- `shield` (ตัวเลข 0-4 จาก GEP) → แมปเป็น `NONE / LIGHT / HEAVY` ด้วย threshold ที่ **เดาไว้อย่างสมเหตุสมผล**
  (`0` → NONE, `1-2` → LIGHT, `3-4` → HEAVY) เพราะ Overwolf ไม่มีเอกสารระบุ threshold ตรงนี้ชัดเจน —
  ดูใน `background.js` ฟังก์ชัน `shieldToArmor()` ถ้าเทียบกับเกมจริงแล้วไม่ตรง ให้แก้เลข threshold ตรงนั้น
- **ไม่มีฟิลด์ HP ของเพื่อนร่วมทีม/ฝ่ายตรงข้าม** ใน GEP ของ Valorant (มีแค่ HP ของ local player เอง ผ่าน feature `me`
  ซึ่งไม่มีประโยชน์สำหรับ Observer) — แอปนี้จึงไม่ส่ง `hp`/`hpMax` เลย `BuyPhaseHud.tsx` ถูกออกแบบให้ซ่อนคอลัมน์ HP
  เองอยู่แล้วเมื่อไม่มีค่า จึงไม่กระทบการแสดงผล แค่จะไม่มีแถบ HP ให้เห็นในเวอร์ชันนี้

## วิธีทดสอบคืนนี้ (ตามลำดับ)

### ขั้น 0 — ทดสอบ pipeline backend + HUD แยกจาก Overwolf ก่อน (ไม่ต้องรอ Overwolf)

ใช้ `scripts/telemetry-e2e.ts` ที่มีอยู่แล้วยิง telemetry จำลองเข้า endpoint เดียวกัน เพื่อยืนยันว่า
backend relay + Buy Phase HUD ทำงานถูกต้อง ก่อนเอา Overwolf เข้ามาเป็นตัวแปรเพิ่ม:

```
npx tsx scripts/telemetry-e2e.ts --apply
```

แล้วเปิด `/overlay/match/<matchId>/` ดูว่า Buy Phase HUD อัปเดตตามเฟรมที่ยิงเข้าไปหรือไม่

### ขั้น 1 — ออก Observer Token

Referee/admin เปิดหน้า Spectator Control ของแมตช์ (หรือเรียก `POST /api/v1/matches/[id]/observer-token` ตรงๆ
ด้วยสิทธิ์ broadcast role) จะได้ token ดิบกลับมาครั้งเดียว — คัดลอกเก็บไว้ (ออกใหม่ = token เก่าใช้ไม่ได้ทันที)

### ขั้น 2 — โหลดแอปนี้ใน Overwolf บนเครื่อง Observer (เครื่อง/บัญชีสำรองก่อนเท่านั้น)

ตามขั้นตอนในหัวข้อด้านบน แล้วเข้า custom game (บัญชีสำรอง ไม่ใช่บัญชีแข่งขันจริง) จนเห็น scoreboard ในเกม

### ขั้น 3 — กรอกค่าในหน้าต่าง Controller แล้วกด Start

- **Base URL**: `http://localhost:3000` (dev server) หรือโดเมนจริงถ้าทดสอบผ่านของจริง
- **Match ID**: แมตช์เดียวกับที่ออก token ไว้
- **Observer Token**: จากขั้น 1

ดู log panel ในแอป — ถ้าเห็น `ยิง telemetry ล้มเหลว` ให้อ่านข้อความ error (401 = token ผิด/หมดอายุ,
409 = ยังไม่ได้ออก token ให้แมตช์นี้, 400 = รูปแบบข้อมูลไม่ผ่าน schema)

### ขั้น 4 — เปิด Buy Phase HUD เทียบกับเกมจริง

เปิด `/overlay/match/<matchId>` คู่กับหน้าจอเกม เช็คว่าเงิน/อาวุธ/เกราะ/Ult ตรงกับที่เห็นในเกมจริงหรือไม่
โดยเฉพาะคอลัมน์เกราะ (shield mapping ที่ยังไม่ verify ด้านบน) — นี่คือ "ของสำรองจริง" ที่ ADR-004 บังคับให้ทดสอบ
ก่อนใช้กับทัวร์นาเมนต์จริง

## โครงสร้างไฟล์

- `manifest.json` — Overwolf app manifest, ประกาศ GEP ของ Valorant (classId `21640`)
- `background.js` / `background.html` — ตัวทำงานจริง: subscribe GEP, ประกอบ scoreboard, ยิง HTTP ทุก 1 วิ
- `index.html` / `index.js` — หน้าต่าง controller: กรอก Base URL/Match ID/Token, ปุ่ม Start/Stop, log panel
- `icons/icon.png` — ไอคอนชั่วคราว (ใช้โลโก้เดิมของเว็บ) ใช้ได้สำหรับทดสอบ local ยังไม่ได้ทำเป็นไซซ์มาตรฐานสำหรับขึ้น store
