# 📺 Stream Hub / Broadcast Control / Live Source — Handover for Kolt

**วันที่:** 26 กันยายน 2026
**ผู้จัดทำ:** โคลท์ (Kolt / Claude Code)
**ส่งมอบให้:** โคลท์ session ถัดไป / แอนดี้ / อลิส (QA)
**ผู้สั่งงาน:** 👑 พี่หยัด (CEO) — งาน ad-hoc นอก Master Spec (ต้องอธิบายให้อลิสทีหลัง)
**Branch:** `feat/stream-hub-toolbar-hotkeys` (แตกจาก `main` หลัง merge PR #50) — **PR #51**
**สถานะ:** ✅ พี่หยัดเทสบน localhost แล้ว — รอ QA อลิส ก่อน merge (โคลท์ห้าม merge main)

> อ่านเอกสารนี้ก่อนแตะ `app/stream-hub/*`, `app/spectator/control/*`, `components/stream-hub/*`, `lib/stream-hub/*`
> งาน Spectra / OCR / Round Tracker ก่อนหน้านี้อยู่ใน `SPECTRA_ADAPTER_KOLT_HANDOVER.md` ส่วนที่ 6

---

## 1. ภาพรวม — หน้าไหนทำอะไร (หลังงานนี้)

| หน้า | URL | หน้าที่ | ใครใช้ |
|---|---|---|---|
| **Stream Hub** | `/stream-hub` , `/stream-hub/[matchId]` | จอที่ OBS จับ (เฟรม 1920×1080) + แถบคุมด้านบน | คนคุม OBS |
| **Broadcast Control** (เดิมชื่อ Spectator HUD Control Center) | `/spectator/control/[match_id]` (URL เดิม) | รีโมตของ Stream Hub + ฉาก Overlay + สกอร์/แมพ + สถานะแมตช์ + Live Source | ผู้กำกับ / กรรมการ |
| **Live Sponsor Overlay** | `/stream-hub/sponsor-overlay?matchId=...` | ตั้งค่ากล่องรูปสปอนเซอร์หมุนวน (5.3) + โลโก้ลอย (ของเดิม) | ทีมสปอนเซอร์ |

ทุกหน้าคุยกันผ่าน Supabase Realtime ช่องเดียว: **`match-realtime-{matchId}`**

---

## 2. สิ่งที่ทำใน session นี้ (ตามลำดับที่พี่หยัดสั่ง)

### 2.1 Stream Hub — แถบคุม
- เลขแท็บ SYSTEM SCENES เรียงใหม่ **1–7** (แก้แค่ป้าย — เลขฉากภายใน 4/5/7/8/9/10 ที่ส่งไป Overlay **ไม่เปลี่ยน**)
- **ลบแท็บ BuyPhase HUD** (เดิมแท็บ 6) — Buy Phase เหลือแค่ปุ่มลัด + ไฟ `BUY ON/OFF` เล็กๆ ท้ายแถว
- **ลบแถว Round Scores** ทั้งแถว: ช่อง +/- (เป็นเลขหลอก ไม่ลง DB ไม่ส่ง Overlay), ปุ่ม Buy Phase, ปุ่ม HP (แก้แค่ state หน้าตัวเอง)
- **เพิ่ม** (แถวล่าง ซ้าย → ขวา):
  1. สกอร์ซีรีส์ `BO1 MWL2 0 - 0 FCC First to 1` — นับจาก `match_games.winner_team_id` จริง (เดิม `winsA/winsB` ถูกตั้งเป็น 0 ตลอด → ฉาก Intermission ก็ได้ค่าจริงไปด้วย)
  2. `NetworkStat` — ping ทุก 5 วิ + ความเร็วดาวน์โหลด 128 KB ทุก 20 วิ ผ่าน `GET /api/health/speed?kb=N` (หยุดวัดตอนแท็บซ่อน)
  3. ปุ่ม **Hotkeys** (ตั้งปุ่มลัดเองได้) · ปุ่ม **HUD Control** (เปิด Broadcast Control) · ไฟ `BUY ON/OFF`
- แถบเวลา: `[▶] [02:15] [↺] [เวลาด่วน ▾]` — ปุ่มเล่นอยู่หน้าเวลา แยกจากรีเซ็ต กันกดพลาด / ปุ่มตั้งเวลา 5 ปุ่มยุบเป็น dropdown (พื้นเข้ม)
- **Spectator Link** (แถว OPEN ชิดขวา) — ดูข้อ 2.3

### 2.2 Hotkeys (ผูกกับบัญชี)
- ไฟล์: `components/stream-hub/hotkeys.ts` (รายการคำสั่ง `HUB_TABS`, `HOTKEY_ACTIONS`, `DEFAULT_HOTKEYS`, hook `useStreamHubHotkeys`), `HotkeySettingsModal.tsx`
- ค่าเริ่มต้น: **Alt+1..Alt+7 = แท็บ 1..7**, **Alt+C = Buy Phase**
- เก็บใน **Supabase Auth `user_metadata.stream_hub_hotkeys`** (ไม่ต้องสร้างตาราง) — ไม่ล็อกอินเก็บ `localStorage` แทน
- id ผูกกับ "ฉาก" (`startingSoon`, `liveHud`, `cleanVeto`, …) ไม่ใช่ลำดับแท็บ — เพิ่ม/ลบแท็บทีหลัง ปุ่มลัดที่ผู้ใช้ตั้งไว้ไม่เพี้ยน
- ใช้ `e.code` → ทำงานได้แม้เปิดแป้นภาษาไทย / ต้องมี Alt/Ctrl/Shift ร่วม (ยกเว้น F1–F12) / ตั้งซ้ำ = ปลดคำสั่งเดิมอัตโนมัติ

### 2.3 Spectator Link (ย้ายมาจากหน้า Spectator Control)
- ไฟล์: `components/stream-hub/SpectatorLinkPanel.tsx`
- แถบย่อ: ไฟ telemetry (แหล่ง `OCR` ถ้ามี `raw_ocr_name` ไม่งั้น `BRIDGE` + กี่วินาทีก่อน) · รหัสห้อง · ปุ่ม **Setup**
- ลิ้นชัก Setup (วาดที่ `document.body` ผ่าน portal เพราะ header มี backdrop-blur): รหัสห้อง · Observer Token · **OCR Round & Roster Engine**
- ⚠️ ลิ้นชัก **ซ่อนด้วย CSS ไม่ unmount** — OCR จับภาพเฉพาะตอนแผง mount อยู่ ปิดลิ้นชักแล้ว OCR ต้องทำงานต่อ
- Stream Hub เป็นคนฟัง `stream_telemetry_relay` (ลงทะเบียน `.on()` ก่อน `subscribe()`) แล้วส่ง props ลงมา
- `key={matchId}` — สลับแมตช์ = แผงเริ่มใหม่ (token/OCR เก่าไม่ค้าง)

### 2.4 Broadcast Control (`/spectator/control/[match_id]`)
- เปลี่ยนชื่อหัวหน้า + ปุ่ม Hotkeys + ลิงก์ ↗ Stream Hub
- **Stream Hub Remote** (การ์ดบนสุดคอลัมน์กลาง): กดปุ่ม/ปุ่มลัด → ส่ง `hub_action {action}` → Stream Hub เรียก `runAction` ตัวเดียวกับปุ่มจริง / Stream Hub ส่ง `hub_scene_state {scene}` ตอนเปลี่ยน + ทุก 5 วิ → การ์ดไฮไลต์ถูก
- ลบ Match Room Config / Observer Bridge / OCR ออกจากหน้านี้ (ย้ายไป Spectator Link) — เหลือกล่องบอกทางไว้
- Stream Telemetry Status: เดิมโชว์ **60 FPS / 6 Mbps ปลอม** เมื่อไม่มีแถว `stream_sessions` → ตอนนี้โชว์ "ยังไม่มีข้อมูลสตรีม" แทน / `.single()` → `.maybeSingle()` (หยุด 406 ทุก 5 วิ)
- **Live Source** (การ์ดใหม่คอลัมน์ซ้าย) — ดูข้อ 2.5

### 2.5 Live Source (A / B / C)
- ไฟล์: `lib/stream-hub/live-source.ts`, `components/stream-hub/LiveFeedPlayer.tsx`, `LiveFeedScene.tsx`
- เก็บใน `matches.format_config.live_source = { mode: 'OFF'|'A'|'B'|'C', url }`
- บันทึกผ่าน **`PATCH /api/v1/matches/[id]/broadcast-config`** (ตรวจ `requireBroadcastRole`, merge format_config ฝั่งเซิร์ฟเวอร์)

| โหมด | ผลบน Stream Hub |
|---|---|
| OFF | ปกติ |
| **A** | คลิป/ไลฟ์จากเว็บโชว์ในกล่อง **5.1** (ซ้าย 64, บน 330, กว้าง 790, 16:9) ของฉาก 1. Starting Soon |
| **B** | แท็บ 2 กลายเป็น **"2. Live Feed (B)"** = ภาพจาก iframe เต็มจอ + scorebug ซีรีส์ของเรา · ปิด Spectator Link, Buy Phase (ปุ่มลัด + ไฟ), 7. Test Clutch |
| **C** | เหมือน B แต่เล่น **HLS `.m3u8`** ผ่าน `hls.js` (dynamic import) — RTMP ตรงๆ เบราว์เซอร์เล่นไม่ได้ ต้องมีตัวแปลง RTMP→HLS (รอคลาวด์ของพี่ไอซ์) |

- พรีวิวในห้องคุม `muted` เสมอ (YouTube `mute=1`, Twitch/Kick `muted=true`, video `muted`) — ตัวออกอากาศจริงบน Stream Hub เปิดเสียง
- เทสแล้ว: A (iframe ขึ้นกล่อง 5.1), B (แท็บ/ปิดระบบ/scorebug ถูก), C (hls.js เล่น test stream mux ได้)

### 2.6 Starting Soon — 5.2 / 5.3 + Sponsor Box
- คอลัมน์กลาง x 880–1210 (ระหว่างกล่อง 5.1 กับการ์ด Game): **5.2 ธง Title Sponsor** (Luminary Global — ข้อมูลเดียวกับ Overlay/หน้าเว็บ) + **5.3 กล่องรูปหมุนวน 330×186**
- ไฟล์: `lib/stream-hub/sponsor-box.ts`, `components/stream-hub/SponsorBox.tsx` (ตัววาด + ทรานซิชั่น), `SponsorBoxController.tsx` (แผงในหน้า sponsor-overlay)
- ตั้งค่า: เวลาโชว์ต่อรูป 2–30 วิ · ความเร็วทรานซิชั่น 0.2–3 วิ · ทรานซิชั่น Fade / Slide ซ้าย→ขวา / Slide ขวา→ซ้าย / 3D หมุนพลิก / Zoom · เรียง/ลบรูป · เปิด-ปิด
- การส่ง: `sponsor_box_state {settings, order}` + `sponsor_box_image {id,name,dataUrl}` (รูปย่อเป็น WebP ≤ 660×372) · Stream Hub ส่ง `sponsor_box_request` ตอนเพิ่งเชื่อม → แผงตอบทั้งหมด
- เก็บสำเนา `localStorage` ทั้งสองฝั่ง (`zodiac-sponsor-box-v1` / `zodiac-sponsor-box-cache-v1`) — Stream Hub รีเฟรชแล้วยังโชว์ได้แม้แผงปิด
- แก้ hydration error เดิมของหน้า sponsor-overlay (เดิมอ่าน `window.location` ตอน render → ตอนนี้ `use(searchParams)`)

---

## 3. Realtime events ในช่อง `match-realtime-{matchId}` (ของใหม่)

| event | ผู้ส่ง → ผู้รับ | payload |
|---|---|---|
| `hub_action` | Broadcast Control → Stream Hub | `{ action: 'startingSoon' \| 'liveHud' \| … \| 'testClutch' }` |
| `hub_scene_state` | Stream Hub → Broadcast Control | `{ scene: number }` |
| `toggle_buy_phase` | ทั้งสองทาง (เดิมมีอยู่แล้ว — Stream Hub ฟังเพิ่มเพื่อซิงก์ไฟ) | `{ enabled: boolean }` |
| `sponsor_box_state` / `sponsor_box_image` / `sponsor_box_request` | sponsor-overlay ↔ Stream Hub | ดูข้อ 2.6 |

---

## 4. ข้อควรระวัง / ของที่ยังค้าง (ต้องขออนุมัติก่อนทำ)

1. **RLS บล็อกเงียบ**: `supabase.from('matches').update(...)` จากเบราว์เซอร์ **ไม่ error แต่ไม่บันทึก** ถ้าไม่มีสิทธิ์ — หน้าจอเลยขึ้น "สำเร็จ" หลอก · แก้แล้วเฉพาะ Live Source + รหัสห้อง (ย้ายไป API) · **ยังเหลือ** ใน Broadcast Control: `updateMatchDatabaseStatus` (Pause/Awaiting/Complete) และ `updateExternalStreamFeed` (SET FEED) ที่ยังเขียนตรง
2. **Sponsor Box ยังไม่มีที่เก็บกลาง** — ไม่มี Storage bucket ในโปรเจกต์ (โคลท์สร้างเองไม่ได้ ต้องให้ทีมสร้างผ่าน dashboard) → ตอนนี้ Realtime + localStorage
3. **โลโก้ลอย (ของเดิม) ในหน้า sponsor-overlay ส่งไปช่อง `match:{id}:overlay` ที่ไม่มีใครฟัง** — ไม่เคยขึ้นจอ ตั้งแต่ก่อน session นี้ · ยังไม่แตะ
4. ฉาก Starting Soon ใช้ตำแหน่ง px ตายตัวสำหรับเฟรม 1920 — พรีวิวบนจอเล็กจะทับกัน (การ์ด Game ทับโลโก้อยู่แล้วแต่เดิม) · OBS 1920×1080 ปกติ
5. Game 2 (TEAM C vs TEAM D) ในการ์ด Starting Soon ยังเป็น mockup เดิม
6. ต้องอธิบายงานนี้ให้อลิสละเอียด (ad-hoc ของ CEO): แยกหน้า Spectator → Spectator Link + Broadcast Control, Live Source, API ใหม่ 2 ตัว

## 5. ไฟล์ที่เพิ่ม / แก้

**ใหม่:** `app/api/health/speed/route.ts`, `app/api/v1/matches/[id]/broadcast-config/route.ts`, `components/stream-hub/{hotkeys.ts, HotkeySettingsModal.tsx, NetworkStat.tsx, SpectatorLinkPanel.tsx, LiveFeedPlayer.tsx, LiveFeedScene.tsx, SponsorBox.tsx, SponsorBoxController.tsx}`, `lib/stream-hub/{live-source.ts, sponsor-box.ts}`
**แก้:** `app/stream-hub/page.tsx`, `app/spectator/control/[match_id]/page.tsx`, `app/stream-hub/sponsor-overlay/page.tsx`, `package.json` (+`hls.js`)

## 6. วิธีเทส (localhost)
1. `npm run dev` → **ล็อกอินก่อน** (Google Login) — ไม่งั้น API ตั้งค่าจะตอบ 401
2. เปิด `/stream-hub/<matchId>` + `/spectator/control/<matchId>` คนละแท็บ → กด Alt+3 ที่ Broadcast Control → Stream Hub สลับฉาก
3. Live Source: เลือกโหมด → ใส่ลิงก์ → "ใช้โหมดนี้" → Stream Hub เปลี่ยนภายใน ~3 วิ (โพล) · **เทสเสร็จตั้งกลับเป็น "ปกติ"**
4. Sponsor Box: เปิด `/stream-hub/sponsor-overlay?matchId=<matchId>` → อัปโหลดรูป → ดูฉาก 1. Starting Soon
5. ⚠️ Playwright รันบนเครื่องพี่หยัด — เทสคลิป/เสียงแล้วต้องปิดแท็บทันที

---

## 📝 Change Log

| วันที่ | ผู้แก้ | สิ่งที่แก้ | เหตุผลที่แก้ |
|---|---|---|---|
| 2026-09-26 | โคลท์ | สร้างเอกสาร | ส่งต่องาน Stream Hub / Broadcast Control / Live Source ให้ session ถัดไปทำต่อได้ทันที |
| 2026-09-26 | โคลท์ | ใส่เลข PR #51 ที่หัวเอกสาร | เปิด PR หลังเขียนเอกสารฉบับแรก — กันหัวข้อ PR ไม่ตรงแบบที่เคยเกิดกับ handover ของ Spectra |
