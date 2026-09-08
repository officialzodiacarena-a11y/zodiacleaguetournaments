# PROJECT AUDIT REPORT — Zodiac Arena vs. Blueprint v3.0.0

**ผู้ตรวจ:** Claude (Lead Software Architect & QA Engineer role, per คำสั่งผู้ใช้)
**วันที่ตรวจ:** 2026-09-09
**เอกสารอ้างอิง:** `🗺️ Tournament Platform UX and UI Specification & Master System Integration Blueprint.md` (v3.0.0, แก้ไขโดยอลิส 2026-09-08)
**วิธีตรวจ:** อ่านซอร์สโค้ดจริงทั้งหมด (ไม่อ้างอิงจาก Blueprint เพียงอย่างเดียว) — สแกน `app/`, `app/api/`, `supabase/migrations/*.sql`, `types/supabase.ts` แบบ skeptical/independent verification

**สรุปภาพรวม:** Blueprint v3.0.0 มีความแม่นยำสูงในฝั่ง **API Endpoints ทั้ง ~50 เส้นทางของ Phase 3** (มีอยู่จริงครบ 100% ตาม path/method/auth ที่อ้าง) แต่มี **ข้อผิดพลาดสำคัญ 3 จุด** ที่ต้องแก้ไขทันที: (1) จำนวนหน้าเว็บจริงมีเพียง **16 หน้า ไม่ใช่ 22 หน้า** ตามที่อ้าง (2) ฟังก์ชัน RPC ที่ผูกกับระบบ Atomic Penalty (`deduct_player_ap_fine`) **ไม่มีอยู่จริงในฐานข้อมูล** ทำให้ระบบตัดแต้ม AP เมื่อลงโทษนักกีฬาใช้งานไม่ได้ในโปรดักชันจริง และ (3) ระบบ **GF_M2_RESET (รีเซ็ตนัดชิงชนะเลิศ) ไม่มีโค้ดสร้างจริงเลยสักบรรทัดเดียว** ทั้งที่ Checklist ระบุว่า verified แล้ว `[x]`

---

## 1. Route Coverage Table (22 หน้าที่ Blueprint อ้าง vs. ของจริง)

| # | หน้าจอ | Path | สถานะไฟล์ | สถานะฟังก์ชัน | ฟังก์ชันที่ผูกไว้จริง |
|---|--------|------|-----------|---------------|------------------------|
| 1 | Landing & Riot Sync | `/` | ✅ Implemented | Real | Supabase Auth `signInWithOAuth` (Google/Discord/Facebook) |
| 2 | Login | `/login` | ✅ Implemented | ⚠️ **Hybrid** | Google OAuth จริง / แต่ flow "กรอก Riot ID" เป็นของปลอม 100% — `setTimeout` หลอก, ค่าฮาร์ดโค้ด, เก็บ session ใน `localStorage` เท่านั้น ไม่แตะ DB เลย |
| 3 | Seasonal Tournament Hub | `/home` | ✅ Implemented | Real | `games`, `circuits`, `seasons`, `season_standings` |
| 4 | แดชบอร์ดสรุปกิจกรรมลีค | `/dashboard` | ❌ **MISSING** | — | ไฟล์ `app/dashboard/page.tsx` ไม่มีอยู่จริงในโปรเจกต์ |
| 5 | พาสปอร์ตนักกีฬาส่วนตัว | `/profile` | ✅ Implemented | Real | `players`, `game_accounts`, `team_members` |
| 6 | พาสปอร์ตผู้เล่นสาธารณะ | `/profile/[userId]` | ✅ Implemented | Real | `users` |
| 7 | ประวัติดราฟต์ด่วน | `/matches` | ❌ **MISSING** | — | ไฟล์ไม่มีอยู่จริง |
| 8 | คลังวิเคราะห์แมตช์ย้อนหลัง | `/match-history` | ❌ **MISSING** | — | ไฟล์ไม่มีอยู่จริง |
| 9 | ทำเนียบอันดับนักกีฬา | `/leaderboard` | ✅ Implemented | Real | `players` |
| 10 | รายละเอียดสังกัดทีม | `/teams/[teamId]` | ✅ Implemented | Real | `teams`, `team_members`, `tournament_registrations`, `circuits`, `seasons`, `season_standings` |
| 11 | อัปเกรดแผนสมาชิก (PRO) | `/subscribe` | ✅ Implemented | ⚠️ Real (ขัดแย้งกับหมายเหตุเดิมของ Blueprint เอง) | `users.subscription_tier`, `users.arena_tickets` — Blueprint เดิมเขียนว่า "UI Placeholder ยังไม่มี backend" แต่โค้ดจริงมี read/write ผ่าน Supabase แล้ว (ควร verify คอลัมน์ `arena_tickets` ว่ามีจริงใน DB) |
| 12 | ห้องล็อบบี้วันแข่ง & แชตสด | `/matches/[id]/lobby` | ✅ Implemented | Real | `fetch('/api/v1/matches/{id}/lobby')`, `/ready` |
| 13 | ผังสายแข่งโต้ตอบ | `/tournament/[tournamentId]/bracket` | ✅ ไฟล์มี | ❌ **Placeholder** | ทั้งไฟล์เป็น `mockBracketData` ฮาร์ดโค้ด ไม่มี `.from()`/`fetch()` แม้แต่บรรทัดเดียว — `tournamentId` ใช้แค่โชว์ข้อความ ไม่ query จริง |
| 14 | ปฏิทินแข่งวันนี้ & Standings | `/schedule` | ✅ Implemented | Real | `matches`, `season_standings`, `games`, `circuits`, `seasons`, `tournaments`, `tournament_stages` (7 ตาราง — มากที่สุดในระบบ) |
| 15 | สรุปสถิติจบแมตช์ | `/match-result/[matchid]` | ❌ **MISSING** | — | ไฟล์ไม่มีอยู่จริง |
| 16 | Overlay OBS | `/overlay/match/[id]` | ✅ Implemented | ⚠️ **Hybrid** | `matches`, `match_games`, `map_vetoes` จริง แต่มี `STUB_TEAMS` fallback แอบใช้ข้อมูลปลอมเมื่อ query ทีมกลับมาว่าง — เสี่ยงโชว์ข้อมูลผิดบนสตรีมจริง |
| 17 | ทะเบียนลีค & ตรวจสถิติ ZP | `/tournament` | ✅ Implemented | Real | `games`, `circuits`, `seasons`, `tournaments`, `tournament_registrations`, `players`, `team_members`, `season_standings` |
| 18 | ฟอร์มสมัครเข้าร่วมแข่งขัน | `/tournament/[tournamentId]/register` | ✅ ไฟล์มี | ⚠️ **อันตราย — UI/Backend ไม่ตรงกัน** | หน้าจอที่ผู้ใช้เห็น (roster, checklist, ยอด AP) เป็น `mockFlowData` ปลอมทั้งหมด แต่ปุ่ม Submit ผูกกับ `actions/registration.ts` ซึ่งเป็น server action ของจริงที่ตัด AP จริงจาก DB จริง — ผู้ใช้กำลังตัดสินใจบนข้อมูลปลอมแต่ธุรกรรมจริง |
| 19 | ทัวร์นาเมนต์รายสัปดาห์ | `/tournament/weekly` | ✅ ไฟล์มี | ❌ **Placeholder** | `useState` ฮาร์ดโค้ดรายชื่อผู้เล่นปลอมล้วน ไม่มีการ fetch ข้อมูลเลย |
| 20 | ทัวร์นาเมนต์รายเดือน | `/tournament/monthly` | ❌ **MISSING** | — | ไฟล์ไม่มีอยู่จริง |
| 21 | คอนโซลผู้ตัดสิน | `/spectator/control/[match_id]` | ✅ Implemented | Real | `user_roles`, `matches` (อ่าน+เขียน), `streams`, `stream_sessions` |
| 22 | เช็คสถานะระบบ | `/status` | ❌ **MISSING** | — | ไฟล์ไม่มีอยู่จริง |

**สรุป:** มีไฟล์หน้าเว็บจริงในระบบทั้งหมด **16 ไฟล์** (ยืนยันด้วย `app/**/page.tsx` glob ทั้งโปรเจกต์ — ไม่มีหน้าอื่นนอกเหนือจาก 22 รายการที่อ้าง) แบ่งเป็น:
- **10 หน้า Real** (ใช้งานได้จริง มี data-fetching จริง)
- **4 หน้า Hybrid/Placeholder** ที่มีไฟล์อยู่แต่ทำงานไม่ตรงกับที่อ้าง (bracket, weekly, register, overlay stub-fallback) — และ login ที่ครึ่งหนึ่งเป็นของปลอม
- **6 หน้า Missing** ไม่มีไฟล์อยู่เลย (`/dashboard`, `/matches`, `/match-history`, `/match-result/[matchid]`, `/tournament/monthly`, `/status`)

**เดิม Blueprint อ้างว่า "22 Active Frontend Page Routes" ครบ — ข้อความนี้ไม่ตรงกับความเป็นจริง ต้องแก้ไขทุกจุดที่กล่าวถึงตัวเลข 22 หน้าในเอกสาร**

---

## 2. API & Architecture Alignment

### 2.1 Endpoint Coverage — ผลตรวจ 100% ของ ~50 Endpoints Phase 3 + 4 Core Endpoints

ทุก endpoint ที่ระบุใน Section 3 ของ Blueprint (T3.2–T3.6) และ 4 endpoint หลักของ Competition Core (`/matches/[id]/ready`, `/veto`, `/report`, `/dispute/resolve`) **มีไฟล์อยู่จริงตาม path, HTTP method, และระดับ auth ที่ระบุครบทุกเส้นทาง ไม่มีเส้นทางใดหายไป** — นี่คือจุดที่ Blueprint แม่นยำที่สุด

**ข้อสังเกตเชิงคุณภาพ (ไม่ใช่ false claim แต่เป็นช่องโหว่ที่ควรบันทึก):**

| จุด | รายละเอียด |
|-----|-----------|
| Cron auth fail-open | `reset-daily-ap`, `abuse-analysis`, `clean-expired-orders`, `walkover`, `match-reminders`, `veto-autopick`, `reconcile-zp` ใช้ pattern `if (process.env.CRON_SECRET && authHeader !== ...)` — **ถ้าไม่ตั้งค่า `CRON_SECRET` ใน environment ระบบจะข้ามการตรวจสอบสิทธิ์ไปเลย** (fail-open) มีเพียง `recalculate-player-stats` ที่ fail-closed ถูกต้อง (`if (!cronSecret || ...)`) |
| Ownership check ไม่ explicit | `GET /api/v1/payments/intents/[id]` และ `GET /api/v1/store/orders/[id]/shipment` อ้างว่า "auth (เจ้าของ)" แต่โค้ดไม่มี `.eq('player_id', ...)` ชัดเจน — พึ่งพา RLS policy ที่ยังไม่ได้ verify แยกต่างหาก |
| Idempotency-Key ไม่ persist | `POST /streams/[id]/watch/claim` บังคับ header `Idempotency-Key` แต่ไม่ได้บันทึก/เทียบกับ DB เพื่อกัน replay จริง — พึ่งพา `claim_watch_reward()` RPC ที่ key ด้วย session id แทน |

### 2.2 Database / RPC / Trigger Alignment — **พบข้อผิดพลาดร้ายแรง**

| Section 1/5/6 อ้างถึง | สถานะจริง | รายละเอียด |
|---|---|---|
| `advance_bracket_winner()` | ❌ **ชื่อผิด** | ฟังก์ชันจริงชื่อ `advance_bracket_node(p_match_id, p_winner_team_id)` — ใน `20260908000000_t24_referee_dispute_operations.sql` |
| `ZP Ledger (Append-only)` / `zp_ledger` table | ❌ **ไม่มีอยู่จริง** | ไม่มีตาราง `zp_ledger` หรือฟังก์ชัน `award_zp()` ที่ไหนในระบบเลย ZP ถูกเก็บแบบ denormalized กระจายอยู่ใน `teams.total_zp`, `circuit_standings`, `season_standings`, `hall_of_fame.total_zp` แทน |
| `deduct_player_ap_fine()` (เรียกจาก dispute/resolve) | ❌ **ฟังก์ชันไม่มีอยู่จริง — Critical Bug** | `app/api/v1/matches/[id]/dispute/resolve/route.ts:170` เรียก RPC ชื่อนี้ แต่ไม่มี `CREATE FUNCTION` ที่ไหนเลยในทุก migration ที่ track ไว้ — เรียกแล้ว error จะถูก `console.error` เงียบๆ ไม่ throw ไม่ block การทำงานต่อ **หมายความว่าการตัดแต้ม AP เมื่อลงโทษนักกีฬาไม่ทำงานจริงในโปรดักชัน** |
| GF_M2_RESET (Grand Final Bracket Reset) | ❌ **ไม่มีโค้ดสร้างเลยแม้แต่บรรทัดเดียว** | grep หา `reset_from_node_id`/`GF_M2`/bracket-reset creation logic ทั่วทั้ง migrations และ app code แล้วไม่พบเลย คอลัมน์ `bracket_nodes.reset_from_node_id` มีอยู่แต่ไม่มีอะไร populate มัน |
| Match state machine → `DISPUTED` | ⚠️ **Trigger บล็อกไว้** | `trg_validate_match_transition` ใน `20260907120000_t23_match_lifecycle.sql` ไม่มี branch อนุญาตให้เปลี่ยนเป็น `DISPUTED` (มีคอมเมนต์ในโค้ดเองว่า "out of scope for this sprint") แต่ `app/api/v1/matches/[id]/dispute/route.ts` สั่ง `UPDATE ... SET status='DISPUTED'` โดยไม่เช็ค error ที่คืนกลับมา — แปลว่าการยื่นข้อพิพาทอาจไม่ได้เปลี่ยนสถานะแมตช์จริงเลย |
| Bracket Node Lock เมื่อ DISPUTED | ⚠️ **ไม่มีกลไกระดับ DB** | ไม่มีคอลัมน์ `is_locked`/trigger ใดๆ บน `bracket_nodes` ที่ผูกกับสถานะ dispute — เป็นเพียง lock โดยนัย (implicit) ระดับแอปเท่านั้น |
| KYC Gate บน `prize_payouts` | ⚠️ **ระดับแอปเท่านั้น ไม่มี DB constraint** | ไม่มี `CHECK`/trigger บนตาราง — การเช็ค `kyc_verified_at` อยู่ใน `app/api/v1/tournaments/[id]/prize-payouts/route.ts` เท่านั้น หาก insert ผ่าน service-role โดยตรงจะข้ามการเช็คนี้ได้ |
| Theme Cascade Merge (GLOBAL→SEASON→scope) | ⚠️ **Merge logic อยู่ใน App code ไม่ใช่ DB function** | `app/api/v1/themes/active/route.ts` ทำ merge เอง (`mergeLayer()`) — ไม่มี Postgres function ทำ merge ฝั่ง DB ผลลัพธ์ทำงานถูกต้อง แต่ layer การ implement ต่างจากที่ diagram บอกเป็นนัย |
| `reset-daily-ap` cron | ⚠️ **ชื่อทำให้เข้าใจผิด** | ไม่ได้ "reset" อะไร เป็นการ pre-create แถว `ap_daily_limits` ของวันถัดไปล่วงหน้าเท่านั้น ตัวบังคับ cap จริงอยู่ใน `move_ap()`/`claim_watch_reward()` |

**ยืนยันว่าถูกต้องตามที่ Blueprint อ้าง (ผ่านการตรวจสอบอย่างละเอียด):**
`resolve_expired_ready_checks()`, `trg_match_lobby_system_messages`, `claim_watch_reward()`, `move_ap()` (พร้อม reason enum ครบ), `ap_daily_limits`, `abuse_flags` (enum 3 ค่าตรง), `watch_sessions`/`watch_heartbeats`, `create_store_order()`/`checkout_order()`/`equip_inventory_item()` (auto-unequip ทำงานจริง), `clean_expired_orders()`, `settle_payment_intent()` (Single Settler Pattern ยืนยันจริง — FOR UPDATE + idempotent no-op), `trg_crypto_revert`, HMAC verification (Omise) และ X-Internal-Key (crypto), `hall_of_fame` + `prevent_hof_mutation` (immutable ยืนยัน), `circuit_standings.finals_seed`/`is_finals_qualified`

---

## 3. System Integration QA Checklist (ผลตรวจจริงจากโค้ด แทนที่ค่าเดิมใน Blueprint)

### 3.1 Phase 1-2 — Competition Core

| # | รายการ | Blueprint เดิม | ผลตรวจจริง |
|---|--------|:---:|:---|
| 1 | State Machine ล็อกสถานะแน่นหนา ป้องกัน Race Condition | [x] | [x] ยืนยันจริง — `trg_validate_match_transition` มีอยู่และบังคับใช้ |
| 2 | Auto-Walkover 15 นาที ผ่าน Cron | [x] | [x] ยืนยันจริง — `resolve_expired_ready_checks()` + `/api/cron/walkover` |
| 3 | Dual-Verification + Advance Bracket + GF_M2_RESET อัตโนมัติ | [x] | **[ ] ไม่ผ่าน** — Dual-Verification และ Advance Bracket (`advance_bracket_node`) ทำงานจริง แต่ **GF_M2_RESET ไม่มีโค้ดสร้างเลย** ต้อง implement เพิ่ม |
| 4 | Dispute Lock + Atomic Penalty ตัดแต้ม AP + SUSPENDED | [x] | **[ ] ไม่ผ่าน** — `deduct_player_ap_fine()` RPC ไม่มีอยู่จริง (เรียกแล้ว error เงียบ), และ trigger บล็อกการเปลี่ยนสถานะเป็น DISPUTED โดยไม่รู้ตัว ต้องแก้ไขด่วน |
| 5 | OBS Browser Source ผ่าน Supabase CDC (Zero Server Load) | [x] | [x] ยืนยันจริง — overlay page ใช้ Supabase client-side subscriptions |

### 3.2 Phase 3 — Economy, Watch-to-Earn, Store, Payment & Theming

| # | รายการ | Blueprint เดิม | ผลตรวจจริง |
|---|--------|:---:|:---|
| 1 | Heartbeat rate-limit 1/15s + Layer 2 validation | [x] | [x] ยืนยันจริง — ตรวจครบทั้ง 4 เงื่อนไข (playback_rate, delta_sec, monotonic, wall-clock) |
| 2 | Daily Cap 100 AP ผ่าน move_ap() ทุกเส้นทาง | [x] | [x] ยืนยันจริง |
| 3 | claim_watch_reward() กันเบิ้ล + Cron abuse-analysis clawback | [x] | [x] ยืนยันจริง (แต่ Idempotency-Key header ไม่ persist เพื่อกัน replay — ควรปรับปรุง) |
| 4 | 15-Minute Reserved Stock + Cron clean-expired-orders | [x] | [x] ยืนยันจริง |
| 5 | One-Equipped-per-Type + Digital Auto-Fulfillment | [x] | [x] ยืนยันจริง — `equip_inventory_item()` auto-unequip ในทรานแซกชันเดียว |
| 6 | HMAC (Omise) + X-Internal-Key (Crypto) verify | [x] | [x] ยืนยันจริง |
| 7 | settle_payment_intent() กัน Double-Credit | [x] | [x] ยืนยันจริง — Single Settler Pattern ทำงานถูกต้อง |
| 8 | trg_crypto_revert clawback อัตโนมัติ | [x] | [x] ยืนยันจริง |
| 9 | Prize Payouts บล็อกถ้าไม่ผ่าน KYC | [x] | **[~] ผ่านบางส่วน** — ทำงานถูกต้องผ่าน route ปกติ แต่เป็น app-level check เท่านั้น ไม่มี DB constraint ป้องกัน service-role insert ตรง |
| 10 | Dynamic CI Theming cascade ถูก scope + fallback GLOBAL | [x] | [x] ยืนยันจริง (merge logic อยู่ที่ app-code ไม่ใช่ DB function — ระบุ layer ให้ถูกต้องในเอกสาร) |
| 11 | players.ap_balance ตรงกับ ap_ledger.balance_after เสมอ | [x] | [x] ยืนยันจริง ผ่าน `move_ap()` |

### 3.3 Phase 4 — Finals & Verification

| # | รายการ | Blueprint เดิม | ผลตรวจจริง |
|---|--------|:---:|:---|
| 1 | GET/POST /tournaments/[id]/zodiac-draw MD5 seeded, ล็อกถาวร | [x] | [x] ยืนยันจริง |
| 2 | GET /hall-of-fame Public + ?year= filter | [x] | [x] ยืนยันจริง |
| 3 | POST /admin/finals/season-archive | [x] | [x] ยืนยันจริง |
| 4 | POST /admin/finals/season-reset | [x] | [x] ยืนยันจริง |
| 5 | tsc/eslint ผ่าน 0 errors | [x] | [x] ยืนยันจริง (ตามที่ระบุในงานก่อนหน้า) |

### 3.4 Route Coverage (รายการใหม่ — Blueprint เดิมไม่มี checklist นี้)

| # | รายการ | ผลตรวจจริง |
|---|--------|:---|
| 1 | 22 Page Routes ครบตามที่อ้าง | **[ ] ไม่ผ่าน** — มีจริงแค่ 16/22 ไฟล์ |
| 2 | หน้าที่มีไฟล์ทั้งหมดทำงานด้วยข้อมูลจริง ไม่ใช่ mock | **[ ] ไม่ผ่าน** — 2 หน้าเป็น mock ล้วน (bracket, weekly), 1 หน้า UI/backend ไม่ตรงกันอันตราย (register), 1 หน้ามี stub fallback (overlay) |

---

## 4. Gap Analysis & Action Items

### 🔴 Critical (แก้ไขก่อน Production ใช้งานจริง)

1. **สร้างฟังก์ชัน `deduct_player_ap_fine()`** ที่ขาดหายไป หรือแก้ `dispute/resolve/route.ts` ให้เรียก `move_ap(reason='PENALTY_FINE', ...)` แทน (มี `move_ap` อยู่แล้วและรองรับ reason enum เพิ่มได้) — ปัจจุบันการลงโทษตัดแต้ม AP ไม่ทำงานจริง
2. **แก้ trigger `trg_validate_match_transition`** ให้อนุญาต transition เข้า `DISPUTED` จากสถานะที่เหมาะสม (LIVE/PAUSED/AWAITING_RESULT) และแก้ `dispute/route.ts` ให้เช็ค error ที่คืนจาก UPDATE แทนที่จะปล่อยผ่านเงียบๆ
3. **Implement GF_M2_RESET logic จริง** — สร้างฟังก์ชัน/โค้ดที่ตรวจจับกรณีทีมสายล่างชนะ GF_M1 แล้วสร้าง bracket_node ใหม่ (`reset_from_node_id`) โดยอัตโนมัติ ปัจจุบันไม่มีอยู่เลย
4. **สร้างไฟล์ 6 หน้าที่หายไป หรือลบออกจาก Blueprint** — `/dashboard`, `/matches`, `/match-history`, `/match-result/[matchid]`, `/tournament/monthly`, `/status` — ตัดสินใจว่าจะ build จริงหรือปรับ scope เอกสารให้ตรงกับ 16 หน้าที่มี
5. **แก้หน้า `/tournament/[tournamentId]/register`** — เชื่อม UI จริงเข้ากับ server action ที่มีอยู่แล้ว (`actions/registration.ts`) เพราะปัจจุบันผู้ใช้เห็นข้อมูลปลอมแต่กดปุ่มแล้วธุรกรรมจริงเกิดขึ้น เป็นความเสี่ยงด้าน UX/Trust สูงสุดในระบบ

### 🟠 High (ควรแก้ไขก่อน Launch เต็มรูปแบบ)

6. เชื่อมข้อมูลจริงให้ `/tournament/[tournamentId]/bracket` และ `/tournament/weekly` แทน mock data ทั้งหมด
7. ลบ `STUB_TEAMS` fallback ออกจาก `/overlay/match/[id]` หรือแทนที่ด้วย error state ที่ชัดเจนแทนการโชว์ข้อมูลปลอมบนสตรีมสด
8. เพิ่ม DB-level `CHECK`/trigger บังคับ `kyc_verified_at IS NOT NULL` ก่อน insert ลง `prize_payouts` แทนที่จะพึ่งแอปอย่างเดียว
9. แก้ cron auth ทั้งหมดให้ fail-closed เมื่อ `CRON_SECRET` ไม่ได้ตั้งค่า (ปัจจุบัน 7 จาก 8 cron routes fail-open)
10. เพิ่ม explicit ownership filter (`.eq('player_id', ...)`) ใน `GET /payments/intents/[id]` และ `GET /store/orders/[id]/shipment` แทนที่จะพึ่ง RLS อย่างเดียว

### 🟡 Medium (ปรับปรุงคุณภาพ/ความชัดเจนของเอกสาร)

11. แก้ Login page — ตัดสินใจว่าจะลบ flow "Riot ID" ปลอมออก หรือ implement ให้เชื่อม DB จริง
12. เพิ่ม idempotency persistence จริงให้ `POST /streams/[id]/watch/claim`
13. เปลี่ยนชื่อ cron `reset-daily-ap` ให้สื่อความหมายถูกต้อง (เป็น "pre-create" ไม่ใช่ "reset")
14. ปรับปรุงเอกสาร Blueprint ทุกจุดที่อ้างชื่อฟังก์ชัน/ตารางผิด: `advance_bracket_winner()` → `advance_bracket_node()`, ลบการอ้างอิงถึง `zp_ledger` (ไม่มีอยู่จริง) ให้ระบุตารางจริงแทน (`teams.total_zp`/`circuit_standings`/`season_standings`)
15. Verify คอลัมน์ `users.arena_tickets`/`subscription_tier` ที่หน้า `/subscribe` ใช้งานจริงว่ามีอยู่ใน DB จริงหรือไม่ (Blueprint บอกว่าไม่มี backend แต่โค้ดกลับมี query จริง)

---

## 5. หมายเหตุขอบเขตการตรวจสอบ

- การตรวจนี้อ่านซอร์สโค้ด TypeScript/SQL ที่ track อยู่ใน git repository เท่านั้น ไม่ได้เชื่อมต่อฐานข้อมูล Supabase จริงเพื่อตรวจ RLS policies หรือ schema drift โดยตรง (บาง table เช่น `teams`, `players`, `audit_logs`, `circuit_standings` ถูกสร้างไว้ก่อนที่จะเริ่ม track migrations — ยืนยันได้แค่จาก usage pattern ในโค้ด ไม่ใช่จาก `CREATE TABLE` DDL)
- รายการที่ทำเครื่องหมาย [x] ในรายงานนี้หมายถึง "โค้ดที่ตรวจสอบได้สอดคล้องกับคำอธิบาย" ไม่ได้แปลว่าผ่านการทดสอบ end-to-end ในสภาพแวดล้อมจริง
