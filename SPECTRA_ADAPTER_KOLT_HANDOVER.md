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

---

## 🔁 6. อัปเดตจากโคลท์ — 25 ก.ย. 2026 (session ต่อจากแอนดี้) — PR #49 + PR #50 `feat/round-tracker-veto-strip`

> ส่วนนี้เพิ่มต่อท้าย ไม่ได้แก้ส่วนที่ 1-5 ของแอนดี้ อ่านส่วนนี้ก่อนแตะโค้ด Spectra / OCR / Round Tracker

### 6.1 กติกา "ใครเป็นเจ้าของข้อมูลอะไร" (พี่หยัดกำหนด — ห้ามทำงานทับกัน)
| ข้อมูล | เจ้าของหลัก | สำรอง | ห้าม |
|---|---|---|---|
| ผลแพ้ชนะรายรอบ (`match_rounds`) | **Spectra** (บันทึกก่อนเสมอ) | **OCR** เขียนเฉพาะรอบที่ Spectra ไม่ได้บันทึก/ช่องว่าง | ห้ามลบ OCR round logic — พี่หยัด revert แล้ว (commit `c064120`) |
| HP ระหว่างรอบ (คนยังรอด) | **OCR** (อ่านหลอดเลือดจริง) | — | Spectra ห้ามส่ง HP ตอนผู้เล่นยังรอดกลางรอบ |
| HP = 0 (ตาย) / HP = 100 (buy phase) | **Spectra** | — | — |
| ชื่อผู้เล่นในแต่ละช่อง (OCR) | ล็อกตอนเริ่มเกม/เริ่มรอบ ไม่เปลี่ยนจนจบรอบ | — | — |

### 6.2 สิ่งที่ทำใน session นี้ (commit ตามลำดับ)
- `bd22ebd` Buy Phase Round Tracker แบบ VCT (`components/overlay/RoundTimeline.tsx`), HP sidebar หลบอัตโนมัติตอน Buy Phase, Scene 9 = Ingame Map Veto strip, types ของ `match_rounds` / `win_condition_enum` / RPC ให้ตรง DB จริง
- `50bbe76` ตัดปุ่มกรอกผลรอบมือใน Stream Hub + API `rounds/record` (พี่หยัดสั่ง — กัน human error)
- `57c7b6e` → `c064120` ลบ OCR round logic แล้ว **revert กลับ** (การลบเป็นการเปลี่ยนสเปค ไม่ใช่ hotfix — ผิดช่องทาง)
- `2cb78f7` **Hotfix HP กระพริบ**: Spectra เคยส่ง `hp: isAlive ? 100 : 0` ทับค่าเลือดจริงของ OCR (Overlay ใช้ค่าล่าสุด `app/overlay/match/[id]/page.tsx` ~บรรทัด 473) → แก้ `lib/spectra/translate.ts` ให้ส่ง HP เฉพาะตาย=0 / buy phase=100 + เทสใหม่ (76/76 ผ่าน)

### 6.3 ยังไม่ได้ทำ — ตรงกับที่พี่หยัดวางไว้ แต่โค้ดยังไม่เป็นแบบนั้น (ต้องขออนุมัติก่อนแก้)
1. **OCR ต้องรอ Spectra ก่อนบันทึกผลรอบ** — ตอนนี้ RPC `record_match_round_event` เป็น "ใครถึงก่อนได้บันทึก" และ OCR บันทึก 10 วิหลังเห็นป้ายจบรอบ ซึ่ง**มักถึงก่อน Spectra** (Spectra บันทึกตอน phase เปลี่ยนเป็น `shopping`) → ต้องให้ OCR รอแล้วเช็คว่ารอบนั้นมีแถวแล้วหรือยังก่อนเขียน (`components/observer/OcrObserverBridgePanel.tsx` `commitRound`)
2. **OCR อ่านชื่อทุก 1 วินาที** (`runCaptureCycle`) — ควรล็อกตอนเริ่มรอบครั้งเดียว: HP นิ่งขึ้น + เครื่องนักพากย์เบาลงมาก (Tesseract 10 ครั้ง/วินาทีหายไป)
3. OCR เดาผู้ชนะด้วย "นับชื่อที่อ่านได้" (บรรทัด ~311-313) — ต่อให้อ่านชื่อได้ 100% รอบที่จบด้วยระเบิด/หมดเวลาจะผิดเมื่อทีมชนะรอดน้อยกว่า (ผลเทสในแชท) → ยอมรับได้เพราะ OCR เป็นแค่สำรอง

### 6.4 ช่องโหว่ Spectra ที่พบจากการอ่านโค้ด (ยังไม่ได้ verify กับเกมจริง)
1. ผู้เล่นไม่ได้ผูก Riot ID → `resolveWinner` คืน null → **รอบนั้นหายเงียบ** (translate.ts ~123, ~194)
2. รอบสุดท้ายของแมพ (`game_end`) — adapter ส่ง `roundNum - 1` อาจชนกับรอบที่ส่งไปแล้ว → รอบสุดท้ายอาจหาย (adapter ~157-164) *น่าจะเกิด ยังไม่ยืนยัน*
3. หลุดแล้วต่อใหม่ → baseline ใหม่ → รอบที่จบระหว่างหลุดหาย (adapter ~127)
4. เปลี่ยนแมพต้องรันใหม่พร้อม `--game` เลขใหม่เอง (human error)
5. Spectra ไม่บวก `rounds_won_a/b` บน scoreboard — ยังต้องกรอกใน Spectator Control
6. แยก `time_expire` กับ `elimination` ไม่ได้ (known limitation เดิม)

### 6.5 สถานะเครื่องมือ
- พี่หยัด**ติดตั้ง Docker Desktop ไว้แล้ว** (25 ก.ย.) — พร้อมรัน `spectra-vps/docker-compose.yml` / mock server
- ต้องลองติดตั้ง Spectra-Client (.exe จาก GitHub) บนเครื่อง Observer เพื่อตอบว่าต้องลงแอป Overwolf แยกหรือไม่
- `observer-bridge/` = แอป Overwolf ของเราที่โดนปฏิเสธ (เมล 23 ก.ย.) ไม่มีใครเรียกใช้แล้ว ยังไม่ลบ (รอพี่หยัดสั่ง)
- ไม่ต้องอ้างเอกสาร Vault เก่าอีก — ใช้โค้ดจริง + git + GitHub PR เป็นหลัก

> งาน Stream Hub / Broadcast Control / Live Source ที่ทำต่อจากนี้ (26 ก.ย.) อยู่ใน `STREAM_HUB_KOLT_HANDOVER.md`

---

## 📝 Change Log

| วันที่ | ผู้แก้ | สิ่งที่แก้ | เหตุผลที่แก้ |
|---|---|---|---|
| 2026-09-25 | แอนดี้ | สร้างเอกสาร ส่วนที่ 1–5 | ส่งต่องาน Spectra Adapter ให้โคลท์ |
| 2026-09-25 | โคลท์ | เพิ่มส่วนที่ 6 | สรุปงาน round tracker / hotfix HP / กติกาเจ้าของข้อมูล |
| 2026-09-26 | โคลท์ | หัวข้อส่วนที่ 6: "PR #49" → "PR #49 + PR #50" และเพิ่มลิงก์ไป `STREAM_HUB_KOLT_HANDOVER.md` | commit ชุดหลังของส่วนที่ 6 (`50bbe76` ถึง `97be949`) เข้า main ผ่าน PR #50 ไม่ใช่ #49 — session ก่อนแจ้งไว้ว่าหัวข้อยังไม่ตรง |
