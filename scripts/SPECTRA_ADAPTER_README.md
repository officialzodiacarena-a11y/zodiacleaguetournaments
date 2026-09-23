# Spectra Adapter — เงิน/อาวุธ/เกราะ/อัลติแบบ Real-time ผ่าน Overwolf

แทนที่การอ่านชื่อ/อาวุธ/เงินด้วย OCR (ซึ่งกินซีพียูมากและต้องกด Tab ค้าง) ด้วย **Spectra**
(https://github.com/ValoSpectra) — แอป Overwolf ที่อ่านค่าเหล่านี้จากหน่วยความจำเกมตรง ๆ ผ่าน
Game Events Provider (GEP) ทำงานต่อเนื่องทุกวินาทีโดยไม่ต้องกด Tab และไม่ต้องแชร์จอ+ประมวลผลภาพเลย

**HP ยังต้องใช้ OCR ตัวเดิม (`lib/ocr/hp-bar.ts`) เหมือนเดิม** เพราะ Overwolf ไม่มีข้อมูล HP ของศัตรู
สองระบบนี้ส่งเข้า endpoint เดียวกัน (`/telemetry`) และ Overlay จับคู่ข้อมูลด้วยชื่อผู้เล่นให้เอง ไม่ชนกัน

## ⚠️ ยังไม่เคยทดสอบกับ Spectra-Server จริง

เขียนจากเอกสาร Spectra ล้วน ๆ (ไม่มี Overwolf/Spectra ให้ทดสอบตอนเขียน) **ต้องทดสอบกับบัญชี/แมตช์สำรอง
ก่อนใช้งานจริงเสมอ** ตามเงื่อนไขเดิมของ ADR-004 (Overwolf ใช้ได้เฉพาะเครื่อง Observer ห้ามผู้เล่นติดตั้ง)

## สถาปัตยกรรม

```
เครื่อง Observer
  └─ Spectra-Client (แอป Overwolf) ── อ่านเงิน/อาวุธ/เกราะ/อัลติ/Riot ID ของ 10 คน
        │ WebSocket พอร์ต 5100
        ▼
  Spectra-Server (Docker, รันเอง — เครื่องไหนก็ได้ที่ Client เห็น)
        │ WebSocket พอร์ต 5200 (event "match_data")
        ▼
  scripts/spectra-adapter.ts  ← สคริปต์นี้ (รันเป็น Node process แยก ไม่ใช่ route ของเว็บ)
        │ จับคู่ Riot ID กับ game_accounts ในระบบเรา แล้วแปลงเป็น TelemetryPlayerFrame
        │ POST /api/v1/matches/[id]/telemetry (Observer Token เดียวกับที่ OCR ใช้)
        ▼
  Overlay ของ Zodiac ขึ้นเงิน/อาวุธ/เกราะ/อัลติ (HP มาจาก OCR แยก)
```

## ติดตั้ง (ทำครั้งเดียวต่อเครื่อง Observer)

1. ติดตั้ง [Overwolf](https://www.overwolf.com/) แล้วติดตั้ง Spectra-Client จาก
   https://valospectra.com/download (ใช้บัญชี/เครื่องสำรองทดสอบก่อนเสมอ)
2. ติดตั้ง Docker แล้วรัน Spectra-Server + Spectra-Frontend ตามคู่มือของ ValoSpectra
   (รันบนเครื่อง Observer เองก็ได้ ไม่ต้องมีเครื่องแยก)
3. ตั้ง Group Code เดียวกันทั้งใน Spectra-Client และตอนรันสคริปต์นี้

## ใช้งานต่อ 1 แมตช์

1. **ล็อกรายชื่อผู้เล่น (Pre-Map Roster Lock)** ในหน้า Observer Control ก่อนเสมอ — สคริปต์นี้ต้องมี
   แถวเกมกับรายชื่อที่ล็อกไว้แล้วถึงจะโหลด Riot ID ได้
2. **ต้องผูก Riot ID ให้ผู้เล่นไว้ก่อน** (ตาราง `game_accounts`) ถ้าใครไม่มี Riot ID ผูกไว้ สคริปต์จะ
   ข้ามคนนั้นไปเงียบ ๆ (ไม่ error) แต่จะไม่มีข้อมูลเงิน/อาวุธของคนนั้นขึ้น Overlay
3. กด **GENERATE / ROTATE TOKEN** ในหน้า Observer Control แล้วคัดลอก Observer Token
4. รัน:
   ```
   npx tsx scripts/spectra-adapter.ts --match <matchId> --game 1 --token <observerToken> --group-code <code>
   ```
5. ดู log — ถ้าเชื่อมต่อสำเร็จจะเห็น `📡 ส่งแล้ว N เฟรม` พร้อมชื่อผู้เล่นที่จับคู่ได้ ถ้าไม่เห็นชื่อที่ควรมี
   ให้เช็คว่าผูก Riot ID ถูกคนไว้ในระบบหรือยัง

## ปัญหาที่คาดไว้ล่วงหน้า (ยังไม่เคยเจอจริง)

| อาการ | สาเหตุที่เป็นไปได้ |
| --- | --- |
| `เชื่อมต่อ Spectra-Server ไม่ได้` ค้างวนซ้ำ | Spectra-Server ยังไม่รัน หรือ `--spectra-url` ผิดพอร์ต |
| เชื่อมต่อได้แต่ไม่มี log `ส่งแล้ว N เฟรม` เลย | Group Code ไม่ตรงกับ Spectra-Client หรือยังไม่เริ่มเกม |
| ส่ง telemetry ได้ HTTP 401 | Observer Token หมดอายุ — ไปกด ROTATE TOKEN ใหม่แล้วรันสคริปต์ใหม่ |
| ชื่อบาง/ทุกคนไม่ขึ้นบน Overlay เลย | ยังไม่ได้ผูก Riot ID (`game_accounts`) ให้คนนั้น หรือชื่อ/แท็กในระบบเราพิมพ์ผิดจากของจริง |
| ค่าเกราะ (Light/Heavy) ดูสลับกับความเป็นจริง | `translateArmor()` ใน `lib/spectra/translate.ts` ใช้ threshold เดา (25/50) ต้องเทียบกับของจริงแล้วแก้ |
