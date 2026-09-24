# Spectra Adapter — เงิน/อาวุธ/เกราะ/อัลติแบบ Real-time ผ่าน Overwolf

แทนที่การอ่านชื่อ/อาวุธ/เงินด้วย OCR (ซึ่งกินซีพียูมากและต้องกด Tab ค้าง) ด้วย **Spectra**
(https://github.com/ValoSpectra) — แอป Overwolf ที่อ่านค่าเหล่านี้จากหน่วยความจำเกมตรง ๆ ผ่าน
Game Events Provider (GEP) ทำงานต่อเนื่องทุกวินาทีโดยไม่ต้องกด Tab และไม่ต้องแชร์จอ+ประมวลผลภาพเลย

**HP ยังต้องใช้ OCR ตัวเดิม (`lib/ocr/hp-bar.ts`) เหมือนเดิม** เพราะ Overwolf ไม่มีข้อมูล HP ของศัตรู
สองระบบนี้ส่งเข้า endpoint เดียวกัน (`/telemetry`) และ Overlay จับคู่ข้อมูลด้วยชื่อผู้เล่นให้เอง ไม่ชนกัน

## ⚠️ ยังไม่เคยทดสอบกับ Spectra-Server จริง

เขียนจากเอกสาร Spectra ล้วน ๆ (ไม่มี Overwolf/Spectra ให้ทดสอบตอนเขียน) **ต้องทดสอบกับบัญชี/แมตช์สำรอง
ก่อนใช้งานจริงเสมอ** ตามเงื่อนไขเดิมของ ADR-004 (Overwolf ใช้ได้เฉพาะเครื่อง Observer ห้ามผู้เล่นติดตั้ง)

## สถาปัตยกรรม (Cloud VPS)

เพื่อลดภาระของเครื่อง Caster (Observer) ระบบ Spectra-Server และ Adapter ของเราจะไปทำงานบน Cloud VPS แบบเบื้องหลัง:

```
เครื่อง Observer (แคสเตอร์)
  └─ Spectra-Client (แอป Overwolf) ── อ่านเงิน/อาวุธ/เกราะ/อัลติ/Riot ID ของ 10 คน
        │ ยิงผ่าน Internet (WebSocket พอร์ต 5100)
        ▼
Cloud VPS (รัน Docker 2 ตัวตลอดเวลา)
  ├─ 1. Spectra-Server (เปิดพอร์ต 5100 รับข้อมูลจาก Caster)
  │     │ ส่งข้อมูลผ่าน Docker Network (WebSocket พอร์ต 5200)
  │     ▼
  └─ 2. spectra-adapter (โค้ดของเรา - scripts/spectra-adapter.ts)
        │ จับคู่ Riot ID กับ game_accounts ในระบบเรา
        │ POST /api/v1/matches/[id]/telemetry ไปยังเว็บ Zodiac
        ▼
Vercel + Supabase (Zodiac League Web)
  └─ Overlay ของ Zodiac ดึงข้อมูลไปแสดงผล
```

## คู่มือสำหรับผู้ดูแลระบบ (การติดตั้งบน Cloud VPS)

1. คัดลอกโฟลเดอร์ `spectra-vps/` จากโค้ดต้นฉบับขึ้นไปบน VPS (ต้องมีโค้ดส่วน `scripts/` และ `lib/` ไปด้วย)
2. บน VPS เข้าไปที่โฟลเดอร์โปรเจกต์ และสร้างไฟล์ `spectra-vps/.env` จากไฟล์ตัวอย่าง `spectra-vps/.env.example`
3. ก่อนเริ่มแมตช์ ให้แอดมินเข้าไปอัปเดตไฟล์ `spectra-vps/.env` ให้เป็นค่าของแมตช์นั้น:
   - `MATCH_ID`: ดึงจากหน้า Dashboard
   - `OBSERVER_TOKEN`: กด ROTATE TOKEN จากหน้า Dashboard
   - `GROUP_CODE`: รหัสอะไรก็ได้ (บอกให้ Caster เอาไปใส่)
4. สั่งรัน Docker บน VPS:
   ```bash
   cd spectra-vps
   docker compose up -d --build
   ```

## คู่มือสำหรับ Caster (ทำที่เครื่องหน้างาน)

ระบบทุกอย่างถูกโยกไปบน VPS แล้ว สิ่งที่ Caster ต้องทำจึงมีแค่ **3 อย่าง**:
1. ติดตั้ง/เปิดแอป **Spectra-Client** ใน Overwolf บนเครื่องที่ใช้เข้าเกมเป็น Observer
2. ตั้งค่าการเชื่อมต่อใน Spectra-Client:
   - **IP/Hostname**: กรอก IP ของ VPS
   - **Port**: `5100`
   - **Group Code**: นำรหัสที่แอดมินบอกมากรอก
3. เปิด OBS Studio ตามปกติ (ตัว Overlay จะดึงข้อมูลมาเองโดยไม่ต้องรันอะไรเพิ่ม)

## ข้อควรระวังในการเตรียมแมตช์

1. **ล็อกรายชื่อผู้เล่น (Pre-Map Roster Lock)** ในหน้า Observer Control ก่อนเสมอ — สคริปต์บน VPS ต้องมีรายชื่อที่ล็อกไว้แล้วถึงจะโหลด Riot ID ได้
2. **ต้องผูก Riot ID ให้ผู้เล่นไว้ก่อน** (ตาราง `game_accounts`) ถ้าใครไม่มี Riot ID ผูกไว้ สคริปต์จะข้ามคนนั้นไปเงียบ ๆ (ไม่ error) แต่จะไม่มีข้อมูลเงิน/อาวุธของคนนั้นขึ้น Overlay

## ปัญหาที่คาดไว้ล่วงหน้า (ยังไม่เคยเจอจริง)

| อาการ | สาเหตุที่เป็นไปได้ |
| --- | --- |
| `เชื่อมต่อ Spectra-Server ไม่ได้` ค้างวนซ้ำ (บน VPS) | Spectra-Server ยังไม่รัน หรือตั้งค่าใน `docker-compose.yml` ผิด |
| ฝั่ง Caster เชื่อมต่อไม่สำเร็จ | กรอก IP หรือพอร์ต 5100 ผิด หรือ VPS ไม่ได้เปิด Firewall พอร์ต 5100 |
| เชื่อมต่อได้แต่ไม่มีข้อมูลขึ้น (ใน Log VPS) | Group Code ไม่ตรงกัน หรือเกมยังไม่เริ่ม |
| ส่ง telemetry ได้ HTTP 401 | Observer Token หมดอายุ — แอดมินต้องไปกดเอา Token ใหม่มาแก้ไฟล์ .env แล้ว restart docker |
| ค่าเกราะ (Light/Heavy) สลับกัน | `translateArmor()` ใน `lib/spectra/translate.ts` ใช้เกณฑ์เดาที่ 25 ต้องดูเทียบในเกม |
