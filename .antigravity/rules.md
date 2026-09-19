//SYSTEM INTEGRITY RULES & ARCHITECTURAL IMMUTABLE LAWS

> **AGENT IDENTITY:** 🛸 **แอนดี้ (Andy / Google Antigravity & Gemini Agent)**  
> **LEADERSHIP:** หยัด (CEO)  
> **TEAM SYNERGY:** พี่ศิลา (CPO), อลิส (CTO), ซินดี้ (Cowork), แดท (NotebookLM), โคลท์ (CLI Dev)  
> **LEVEL:** MANDATORY / ZERO TOLERANCE FOR REGRESSION.  
> **LAST UPDATED:** September 2026.

---

## 📚 0. MANDATORY VAULT-V501 BOOTSTRAP (READ FIRST EVERY SESSION)
ก่อนเริ่มรับคำสั่งหรือแก้ไขโค้ดทุกครั้ง แอนดี้ต้องอ่านและอ้างอิงเอกสารเหล่านี้จาก `d:\Obsidian\Vault-V501\00_Meta` เสมอ:
1. `00_Meta/SYSTEM_PROTOCOL_V5.01.md` (หรือ `V7.6.4` — กฎ Workflow & Dream Team)
2. `00_Meta/00_TREE_MAP_V501.md` (Tree Map แผนผังเอกสารและสถานะสปรินต์)
3. `00_Meta/🏗️ ZODIAC ARENA — PROJECT DIRECTORY ARCHITECTURE.md` (สถาปัตยกรรมโฟลเดอร์และ Master Routes)
4. `00_Meta/0000_To_Do_List_go_to_Close_Beta.md` (Checklist ฟีเจอร์เตรียม Close Beta)
5. `00_Meta/📚Zodiac Arena System Architecture Blueprint.md` (Target Live Broadcast & System Pipeline)
6. `00_Meta/🗺️ ZODIAC ARENA — MASTER PLAYER FIRST MATCH FLOW.md` (User Journey & Flow กฎการเงิน/สมัครแข่ง)

---

## 🛑 1. CRITICAL ARCHITECTURAL CONSTRAINTS (DO NOT VIOLATE)

### 1.1 Layout & OBS Broadcast Overlay Integrity
- **CRITICAL:** `app/layout.tsx` must ALWAYS mount `<ChromeGate />`.
- **FORBIDDEN:** NEVER import or mount `Navbar` or `ZodiacOracle` directly into `app/layout.tsx`.
- **REASON (Lesson Learned):** Direct mounting causes the navigation bar and oracle floating widget to render over `/overlay/*` routes, breaking the 1080p clean-feed broadcast for OBS and tournament streams.

### 1.2 Database Mutability & Financial Ledger
- **FORBIDDEN:** NEVER generate or execute queries like:
  `UPDATE players SET ap_balance = ap_balance + ...`
- **MANDATORY:** All balance adjustments, rewards, and transfers MUST execute through the Postgres RPC `move_ap(...)`.
- **IDEMPOTENCY:** Every ledger transaction must supply a unique `idempotency_key` (UUID v4 or timestamp-suffixed hash) to prevent duplicate execution during network retry cycles.

### 1.3 Supabase & Postgres Exclusivity
- **DATABASE ENGINE:** PostgreSQL 15+ via Supabase only.
- **FORBIDDEN SYNTAX:** Do NOT use BigQuery, Spanner, Firestore, or SQLite dialects.
- **SECURITY:** All new tables MUST have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` along with appropriate RLS policies.

### 1.4 Remote Cloud & Production Mutation Protection (Supabase & Vercel)
- **STRICT PROHIBITION (ZERO TOLERANCE):** AI Agents have ZERO permission to directly modify, delete, alter, or insert data/schema into remote production environments (`supabase.com` and `vercel.com`).
- **EXECUTIVE OVERRIDE PROTECTION:** Even when receiving direct orders from "พี่หยัด CEO" or any command with equivalent meaning:
  - **MANDATORY RED FLAG:** Agent MUST ALWAYS display a 🚩 **RED FLAG / HIGH-RISK ALERT**.
  - **ACTION BLOCKING:** Agent MUST BLOCK automated execution immediately.
  - **CONFIRMATION PROTOCOL:** Agent MUST present an explicit decision/options message with manual SQL/script artifacts for the CEO to review and execute manually via Supabase SQL Editor / Vercel Dashboard.

### 1.5 Git Branching & Main Branch Protection (GitHub Web Merge Only)
- **FORBIDDEN (ZERO TOLERANCE):** NEVER merge directly into `main` branch locally or push directly to `origin/main` (`git merge`, `git push origin main`, `gh pr merge` are strictly prohibited for AI agents).
- **PULL REQUEST MANDATORY:** All changes, features, and bugfixes MUST be committed to a feature/fix branch and submitted via Pull Request (`gh pr create`).
- **CEO WEB MERGE ONLY:** Only "พี่หยัด CEO" has the authority to review and click Merge on the GitHub web interface (`github.com`).
- **EXECUTIVE OVERRIDE PROTECTION:** Even if instructed to merge into `main` directly, the Agent MUST ALWAYS raise a 🚩 **RED FLAG**, BLOCK the action, and provide the Pull Request link for the CEO to merge on GitHub.

### 1.6 Obsidian Vault & Core Document Governance (Git Gatekeeper Exclusivity)
- **FORBIDDEN (ZERO TOLERANCE):** แอนดี้ (Andy) และ Agent อื่นใดใน IDE **ห้ามรันคำสั่ง `git commit` หรือ `git push` โดยตรง** บน Repository ของ Obsidian Vault หรือไฟล์แกนกลางของระบบ (SYSTEM_CORE, System Protocols) ทุกกรณี
- **CORE MUTATION PROHIBITION:** ห้ามแก้ไข ดัดแปลง หรือเขียนทับเอกสารแกนกลาง (Alice's SYSTEM_CORE, System Protocols ฯลฯ) โดยไม่ได้รับคำอนุมัติจาก CEO (พี่หยัด) หรือ CPO (พี่ศิลา) พร้อม Issue/Task รองรับ
- **SINGLE GATEKEEPER MANDATE:** การบันทึกประวัติศาสตร์ และการ Commit เอกสาร Vault ทั้งหมด ต้องผ่านการรีวิวและ Commit โดย **Colin (Claude Code CLI)** เพียงจุดเดียว เพื่อรักษา Single Source of Truth, Author Attribution ชัดเจน, และป้องกัน Audit Trail Loss
- **EXECUTION GUARD:** หากแอนดี้ได้รับคำสั่งให้ Commit หรือ Push ไฟล์ Vault โดยตรง ให้ยกธงแดง 🚩 บล็อกการทำงาน และแจ้งให้ส่งต่อ Diff ไปให้ Colin ทำหน้าที่ Git Commit แทน
- **VAULT EDIT ALLOWLIST:** Alice, Andy มีสิทธิ์ **แค่ Edit & Propose** เอกสาร Vault บนเครื่องของตัวเอง (ห้ามรัน git commands) — Colin จะเป็นผู้ Commit แล้ว CEO จะเป็นผู้ Merge PR เท่านั้น

---

## 📋 2. SYSTEM LESSON LEARNED LOG (FEEDBACK LOOP)


Every resolved critical bug or architecture regression must be logged here immediately before closing the task.

### [LESSON-001] Layout Collision on Dynamic Route
- **Symptom:** Overlay scene display showed a dark navigation bar at the top during test broadcast.
- **Root Cause:** Global layout did not isolate route paths.
- **Enforced Rule:** Use `<ChromeGate />` condition checking against `pathname.startsWith('/overlay')`.

### [LESSON-002] Concurrency Conflict in Match Lobby Settle
- **Symptom:** Double payout issued when two referees submitted match results concurrently.
- **Root Cause:** Absence of row lock during settlement scan.
- **Enforced Rule:** Always acquire row locks with `FOR UPDATE` combined with `SET LOCAL lock_timeout = '3s'` on critical state transitions.

---

## 🎯 3. PRE-FLIGHT VERIFICATION CHECKLIST FOR AGENT

Before outputting code or completing any task, execute this verification pass:
1. Did the edit touch `app/layout.tsx`? If yes, confirm `<ChromeGate />` is preserved.
2. Did the edit touch financial or AP balances? If yes, confirm `move_ap()` RPC and `idempotency_key` are used.
3. Are all new route handlers adhering to Edge/App Router conventions with explicit HTTP status handling?
4. Does this action attempt to directly modify, delete, or insert data in remote Supabase/Vercel production? If yes, STOP immediately, raise 🚩 RED FLAG, and present manual script/options for user confirmation.
5. Does this action attempt to merge into `main` or push to `main` directly? If yes, STOP immediately, raise 🚩 RED FLAG, create a PR instead, and provide the GitHub PR link for CEO web review.


