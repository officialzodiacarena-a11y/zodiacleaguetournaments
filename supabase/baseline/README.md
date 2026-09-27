# Baseline Schema — `public` (2026-09-27)

## คืออะไร
โครงสร้าง schema `public` ทั้งหมดของฐานข้อมูล live ณ เวลา 2026-09-27 17:00 (หลัง migration
`20260927040000_fix_match_ffxi_athlete_bid_team_and_outbid.sql`) ถ่ายด้วย `pg_dump 17.6
--schema-only` ผ่าน role อ่านอย่างเดียว (`alis_readonly`)

## ใช้เมื่อไหร่
สร้างโปรเจกต์ Supabase ใหม่จากศูนย์เท่านั้น — **ห้ามรันไฟล์นี้บน live**
(object ทุกตัวในไฟล์นี้มีอยู่แล้วบน live ปัจจุบัน)

## วิธีใช้
1. เปิด extension `citext` ใน schema `public` ก่อน
2. รัน:
   ```sh
   psql "<connection string>" -v ON_ERROR_STOP=1 -f supabase/baseline/20260927_baseline_public.sql
   ```
3. จากนั้นรันเฉพาะ migration ใน `supabase/migrations/` ที่มีเวลาใหม่กว่า `20260927040000`

## ไม่รวม
- trigger บน `auth.users`
- pg_cron jobs
- storage
- vault
- ข้อมูลในตาราง (schema-only)

## ตรวจแล้ว
สร้าง DB ใหม่บน PostgreSQL 17.6 จากไฟล์นี้ไม่มี error และจำนวน object ตรงกับ live ทุกตัว:
ตาราง 86 · ฟังก์ชัน 126 · RLS policy 150 · trigger 28 · index 303 · enum 42
(อ้างอิง `03_QA_RESULTS/HOTFIX-2_RPC_Grants_SQL_2026-09-26.md` หมวด 12)

sha256 ของ `20260927_baseline_public.sql`:
`b128bef35bdaf25be0a2ba132d3cfff5f642df19801d0272c6097e04b673bf24`

## อัปเดตยังไง
อลิสถ่ายใหม่ผ่าน `alis_readonly` แล้วออกใบงานให้โคลท์ใส่ repo — ห้าม agent แก้ไฟล์ dump นี้เอง
