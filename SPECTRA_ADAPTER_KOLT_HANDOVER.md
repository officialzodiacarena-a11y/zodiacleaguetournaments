# 🛰️ Spectra Adapter & Telemetry Pipeline — Handover Report for Kolt
**วันที่:** 25 กันยายน 2026  
**ผู้จัดทำ:** แอนดี้ (Andy / Antigravity Execution Companion)  
**ส่งมอบให้:** โคลท์ (Kolt / Claude Code CLI — Git Gatekeeper)  
**ผู้อนุมัติ:** 🏛️ พี่ศิลา (CPO) & 👑 พี่หยัด (CEO)  
**สถานะ:** ✅ ผ่านการทดสอบ Pipeline ขั้นพื้นฐาน พร้อมส่งต่อเพื่อพัฒนาต่อยอด  

---

## 📌 1. สรุปภาพรวมและวัตถุประสงค์ (Executive Summary)
เอกสารฉบับนี้สรุปผลการทดสอบ, จุดบกพร่องที่พบ (และแก้ไขแล้ว), รวมถึงเครื่องมือจำลอง (Mock Server) สำหรับระบบ **Spectra-Server + Adapter Pipeline** เพื่อให้ Kolt สามารถนำข้อมูลและโค้ดที่ผ่านการทดสอบจริงไปพัฒนาต่อและนำขึ้น Cloud VPS ได้อย่างราบรื่นโดยไม่เสียเวลาซ้ำซ้อน

---

## 🔍 2. ข้อเท็จจริงและจุดที่แก้ไขในโค้ด (Technical Discoveries & Fixes)

### 2.1. ปัญหา Row Level Security (RLS) ของ Supabase
* **ปัญหาที่พบ:** สคริปต์ `scripts/spectra-adapter.ts` เดิมใช้ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ในการดึงรายชื่อผู้เล่นจากตาราง `game_accounts` แต่เนื่องจากตารางมี RLS คุ้มกันอยู่ Supabase จึงคืนค่าเป็น `0 แถว` โดยไม่ฟ้อง Error ทำให้ Adapter หา Riot ID ของนักแข่งไม่พบ
* **การแก้ไข:** ปรับปรุง `spectra-adapter.ts` ให้เรียกใช้ `SUPABASE_SERVICE_ROLE_KEY` (Master Key ที่มีใน `.env.local`) เป็นอันดับแรก เพื่อให้ Adapter ที่ทำงานเป็น Background Daemon สามารถอ่านข้อมูลบัญชีผู้เล่นได้อย่างถูกต้อง

### 2.2. แก้ไข Schema Drift (คอลัมน์ `puuid`)
* **ปัญหาที่พบ:** ในโค้ดเดิมมีการ `.select('player_id, puuid, game_name, tag_line')` จากตาราง `game_accounts` แต่ใน Schema จริงไม่มีคอลัมน์ `puuid` แล้ว ทำให้ Supabase โยน Error `column game_accounts.puuid does not exist`
* **การแก้ไข:** ตัดการเรียก `puuid` ออกจาก query และใช้การจับคู่ผ่านฟังก์ชัน `riotIdKey(game_name, tag_line)` เป็นหลักแทน

### 2.3. ระบบ Whitelist & Player Filtering
* **การทำงานที่พิสูจน์แล้ว:** Adapter จะดึงเฉพาะผู้เล่นที่ลงทะเบียนใน `match_participants` ของ `match_id` นั้นๆ หาก Spectra ส่งข้อมูลผู้เล่นที่ไม่ได้อยู่ในแมตช์ (เช่น ชื่อไม่ตรง/ตัวสำรองนอกระบบ) Adapter จะคัดกรองข้าม (Drop) ทันที และไม่ยิงข้อมูลขยะเข้า Vercel API

### 2.4. เพิ่มกลไกความปลอดภัยและลดภาระเซิร์ฟเวอร์ (Hardening)
1. **Debounce Logic:** ตรวจสอบความเปลี่ยนแปลงของสถานะผู้เล่น (`JSON.stringify(payload.players)`) หากไม่มีอะไรเปลี่ยนแปลงและไม่มีเหตุการณ์จบเกม (`round_event`) ระบบจะไม่ยิง POST ซ้ำ เพื่อประหยัด API quota ของ Vercel
2. **401/403 Kill-Switch:** หาก Vercel ตอบกลับมาเป็น `HTTP 401/403 Unauthorized` ติดต่อกัน **3 ครั้ง** ระบบจะตัดการทำงานและหยุดโปรเซสตัวเองทันที เพื่อป้องกันการโดนบล็อก IP จาก Rate Limit
3. **Client-Side Idempotency:** ป้องกันการส่งผลแพ้ชนะของรอบเดิมซ้ำซ้อน (`lastSentRoundOutcome`)

---

## 🧪 3. เครื่องมือทดสอบสำหรับพัฒนา (Local Mock Testing)

เพื่อแก้ปัญหาการทดสอบที่ต้องพึ่งพาตัวเกม Valorant ขนาด 24GB แอนดี้ได้สร้าง **Mock Server** ขึ้นมา:
* **ไฟล์:** `spectra-vps/mock-server.mjs`
* **พอร์ต:** `5200` (Socket.io)
* **ความสามารถ:**
  - จำลองการรับส่ง WebSocket handshake (`logon` / `logon_success`) ตามโปรโตคอลของ Spectra-Server
  - ส่ง `match_data` จำลอง (เงิน, ปืน, อัลติ, เกราะ, สถานะรอด/ตาย) ทุกๆ 3 วินาที
  - ใส่ข้อมูลผู้เล่นจริงจากฐานข้อมูลเพื่อใช้ทดสอบการจับคู่ (เช่น `MooDeng#00700`, `Besuto#1506`)

**วิธีรันเพื่อทดสอบ:**
```bash
# Terminal 1 (Mock Server):
node spectra-vps/mock-server.mjs

# Terminal 2 (Adapter):
npx tsx scripts/spectra-adapter.ts --match "<MATCH_ID>" --token "<OBSERVER_TOKEN>" --group-code 1234
```

---

## 📁 4. สรุปสถานะไฟล์ในปัจจุบัน (Current File State)

| ไฟล์ | การเปลี่ยนแปลง | สถานะ |
|---|---|---|
| `scripts/spectra-adapter.ts` | แก้ไข RLS Key, เอา `puuid` ออก, เพิ่ม Debounce + 401 Kill-switch, คลีน log เรียบร้อย | ✅ พร้อมใช้งาน |
| `spectra-vps/mock-server.mjs` | เครื่องมือ Mock Spectra-Server สำหรับทดสอบ offline | ✅ พร้อมใช้งาน |
| `spectra-vps/docker-compose.yml` | ไฟล์ Docker Compose สำหรับรัน Spectra-Server + Adapter บน VPS | ✅ พร้อมใช้งาน |
| `spectra-vps/Dockerfile.adapter` | Dockerfile สำหรับ Build Adapter บน VPS | ✅ พร้อมใช้งาน |
| `scripts/debug-db*.ts`, `test-*.ts` | สคริปต์ขยะชั่วคราว | 🗑️ ลบออกหมดแล้ว (Clean) |

---

## 🎯 5. สิ่งที่ส่งมอบให้ Kolt ดำเนินการต่อ (Next Steps for Kolt)

1. **End-to-End API Verification:**
   - ทดสอบรัน Adapter ร่วมกับ `OBSERVER_TOKEN` ที่สร้างขึ้นใหม่จริงจากหน้า Admin เพื่อยืนยันการตอบกลับ `HTTP 200 OK` จาก Vercel Telemetry Endpoint (`/api/v1/matches/[id]/telemetry`)
2. **Cloud VPS Deployment:**
   - นำไฟล์ในโฟลเดอร์ `spectra-vps/` ขึ้นทดสอบบน Cloud VPS จริง (เช่น DigitalOcean / Ubuntu VPS)
   - ตั้งค่า Reverse Proxy / SSL (Nginx หรือ Caddy) ให้กับ Port `5100` (สำหรับรับ Spectra-Client จากเครื่อง Caster)

---
*เอกสารนี้จัดทำขึ้นตามกรอบ 4 เสา (ถูกต้อง, ข้อมูลครบ, มีเหตุผล, สอดคล้องกับ OKR) เพื่อส่งมอบงานที่มีคุณภาพสูงสุดให้ทีม*
