// app/login/page.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const SPRING_CHAMPIONS = {
  teamName: 'ZODIAC APEX',
  record: '64W - 41L (61% WR)',
  players: [
    { name: 'VIPER_99', role: 'Duelist', agent: 'Jett', kda: '1.42', adr: 172.4, hs: '34%' },
    { name: 'SHADOW_K', role: 'Initiator', agent: 'Sova', kda: '1.28', adr: 154.2, hs: '28%' },
    { name: 'PHOENIX_A', role: 'Duelist', agent: 'Reyna', kda: '1.35', adr: 168.0, hs: '36%' },
    { name: 'VALK_01', role: 'Controller', agent: 'Omen', kda: '1.15', adr: 138.5, hs: '24%' },
    { name: 'CYBER_X', role: 'Sentinel', agent: 'Killjoy', kda: '1.18', adr: 142.1, hs: '26%' },
  ],
};

export default function LoginPage() {
  const [loading, setLoading] = useState<'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  // Google OAuth ผ่าน Supabase — ทางเดียวที่ล็อกอินเข้าระบบได้จริง
  // Fix (2026-09-09): เดิมมีปุ่ม "LOGIN WITH RIOT ID" ที่ปลอมทั้งหมด (setTimeout
  // จำลอง delay + เขียน session ลง localStorage เท่านั้น ไม่แตะ DB จริงเลย) ตัดออก
  // เพราะการผูก Riot ID จริงมีระบบ Manual Athlete Verification (T4.0) อยู่แล้วที่
  // /profile ผ่าน GameAccountModal.tsx ซึ่งเขียนลงตาราง game_accounts จริง —
  // ผู้ใช้ต้อง login ผ่าน Google ก่อน แล้วค่อยไปผูก Riot ID ที่หน้าโปรไฟล์
  async function handleGoogleLogin() {
    setLoading('google');
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center p-3 lg:p-6 font-mono relative overflow-x-hidden selection:bg-amber-500 selection:text-black">
      {/* Background Faceoff Image & Cyber Grid */}
      <div className="fixed inset-0 -z-20 opacity-30 pointer-events-none">
        <Image
          src="/images/seasons/BG.png"
          alt="Zodiac Arena Faceoff"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
      </div>
      <div
        className="pointer-events-none fixed inset-0 opacity-25 -z-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(245, 197, 66, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      <div className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-amber-500/15 via-rose-500/5 to-transparent rounded-full blur-[140px]" />

      {/* Header Banner */}
      <header className="relative z-10 text-center mb-6 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/50 bg-amber-500/10 text-amber-300 text-[11px] font-bold tracking-widest uppercase mb-2 shadow-[0_0_15px_rgba(245,197,66,0.3)]">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          VALORANT YEAR LEAGUE 2026
        </div>
        <h1
          className="text-3xl md:text-5xl font-black tracking-wider uppercase drop-shadow-[0_0_25px_rgba(245,197,66,0.5)]"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          ZODIAC <span className="text-[#F5C542]">ARENA</span>
        </h1>
        <p className="text-xs md:text-sm text-zinc-300 mt-1 tracking-widest font-semibold drop-shadow">
          1 ปี = 4 SEASONS • แข่งขันต่อเนื่องตลอดทั้งปี • สะสมคะแนนลุ้นแชมป์ประจำปี
        </p>
      </header>

      {/* 5-Card Grid Showcase */}
      <div className="relative z-10 w-full max-w-[1520px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5 items-center mb-6">
        
        {/* CARD 1: ZODIAC LEAGUE */}
        <div 
          className="relative h-[550px] rounded-2xl overflow-hidden border-2 border-purple-500/80 bg-zinc-950/40 flex flex-col justify-between p-4 transition-transform duration-300 hover:scale-[1.03] hover:border-purple-400"
          style={{
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.9), 0 0 30px rgba(168,85,247,0.35)',
          }}
        >
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/seasons/zodiacT1Y.jpg"
              alt="Zodiac Tournament Grand Finals"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
              className="object-cover"
              priority
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-purple-200 bg-purple-950/90 border border-purple-400/60 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(168,85,247,0.4)]">
              ANNUAL FINALS
            </span>
            <span className="text-[10px] text-amber-300 font-bold bg-black/60 px-2 py-0.5 rounded border border-amber-400/40">
              TOP 12 CLASH
            </span>
          </div>
          
          <div className="text-center my-auto w-full px-1">
            <span className="text-[10px] text-amber-300 tracking-[0.25em] uppercase font-black block mb-1 drop-shadow-[0_0_8px_rgba(245,197,66,0.8)]">
              GRAND CHAMPIONSHIP
            </span>
            <h2 
              className="w-full text-center text-3xl sm:text-4xl lg:text-[2.6rem] font-black text-white tracking-tighter leading-none drop-shadow-[0_0_20px_rgba(168,85,247,0.95)]"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              ZODIAC <span className="text-purple-400">LEAGUE</span>
            </h2>
            <p className="text-[11px] text-zinc-200 mt-2 font-bold drop-shadow">มหาศึกรวม 12 ราศีส่งท้ายปี</p>
          </div>

          <div className="bg-black/80 backdrop-blur-md rounded-xl p-3 border border-purple-500/40 text-center shadow-lg">
            <span className="text-[9px] text-zinc-300 block">TOTAL PRIZE POOL</span>
            <span className="text-sm font-black text-amber-400 tracking-wider drop-shadow">ANNUAL GLORY</span>
          </div>
        </div>

        {/* CARD 2: SPRING (ไร้กรอบสี่เหลี่ยม + ขอบดำเฟดจาง) */}
        <div 
          className="relative h-[550px] rounded-2xl overflow-hidden border-2 border-emerald-500/80 bg-zinc-950/50 flex flex-col justify-between p-3.5 transition-transform duration-300 hover:scale-[1.03] hover:border-emerald-400"
          style={{
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.9), 0 0 30px rgba(34,197,94,0.35)',
          }}
        >
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/seasons/Spring.jpg"
              alt="Spring Season"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
              className="object-cover"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/90 border border-emerald-400/60 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(34,197,94,0.4)]">
              SEASON 1 • JAN-MAR
            </span>
            <div className="flex items-center gap-1 text-amber-300 bg-black/70 px-2 py-0.5 rounded border border-amber-400/40 shadow-sm">
              <CrownIcon />
              <span className="text-[10px] font-black tracking-wider text-amber-400">CHAMPION</span>
            </div>
          </div>

          {/* Title Area: SPRING แบบไร้กรอบ พร้อมขอบดำเฟดเข้ม */}
          <div className="my-auto w-full text-center py-2">
            <h2 
              className="w-full text-center text-4xl sm:text-5xl font-black text-emerald-300 tracking-tight leading-none"
              style={{
                textShadow: '0 0 15px #10B981, 0 0 30px #059669, 0 4px 14px rgba(0,0,0,0.98), 0 0 40px rgba(0,0,0,0.95), 0 0 2px #000000',
              }}
            >
              SPRING
            </h2>
            <p 
              className="text-[10px] text-zinc-200 uppercase tracking-widest font-black mt-2"
              style={{
                textShadow: '0 2px 10px rgba(0,0,0,0.98), 0 0 20px rgba(0,0,0,0.95), 0 0 4px #000000',
              }}
            >
              CONCLUDED • {SPRING_CHAMPIONS.record}
            </p>
          </div>

          {/* Champion Roster Matrix */}
          <div className="bg-black/90 backdrop-blur-md rounded-xl p-2.5 border border-emerald-500/40 shadow-xl space-y-1.5">
            <div className="text-[10px] font-black text-amber-400 flex items-center justify-between border-b border-white/10 pb-1">
              <span>🏆 {SPRING_CHAMPIONS.teamName}</span>
              <span className="text-[9px] text-emerald-400 bg-emerald-950/80 px-1.5 rounded border border-emerald-500/30">
                1st SEED
              </span>
            </div>

            <div className="space-y-1">
              {SPRING_CHAMPIONS.players.map((p, idx) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between bg-white/[0.04] hover:bg-white/[0.08] px-2 py-1 rounded border border-white/5 text-[10px]"
                >
                  <div className="flex items-center gap-1.5 truncate max-w-[125px]">
                    <span className="font-bold text-emerald-400 text-[9px]">#{idx + 1}</span>
                    <span className="font-black text-zinc-100 truncate">{p.name}</span>
                    <span className="text-[8px] text-zinc-400 bg-zinc-800/80 px-1 rounded">
                      {p.agent}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[9px]">
                    <span className="text-zinc-300 font-bold">{p.kda}</span>
                    <span className="text-amber-300 font-bold">{p.adr}</span>
                    <span className="text-emerald-400 font-bold">{p.hs}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CARD 3: SUMMER (LIVE สตรีมมิ่งมุมขวา + Logo ตรงกลางแทน NOW + ไร้กรอบ) */}
        <div 
          className="relative h-[600px] lg:-mt-5 rounded-2xl overflow-hidden border-[3px] border-amber-400 bg-zinc-950/40 flex flex-col justify-between p-4 z-20 transition-transform duration-300 hover:scale-[1.04]"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.95), 0 0 45px rgba(245,197,66,0.65)',
          }}
        >
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/seasons/Summer.jpg"
              alt="Summer Season"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
              className="object-cover"
              priority
            />
          </div>
          
          {/* Header Bar with Glowing LIVE Red Light */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-amber-300 bg-amber-950/90 border border-amber-400/60 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(245,197,66,0.5)]">
              SEASON 2 • APR-JUN
            </span>
            
            {/* LIVE Streaming Badge สีแดงสดเรืองแสง */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/90 border border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.9)] animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff] animate-ping" />
              <span className="text-[10px] font-black tracking-widest uppercase">
                LIVE
              </span>
            </div>
          </div>

          {/* SUMMER + Logo Zone (ไร้กรอบสี่เหลี่ยมดำ พร้อมขอบเงาดำเฟด) */}
          <div className="my-auto w-full flex flex-col items-center justify-center py-2">
            <h2 
              className="w-full text-center text-4xl sm:text-5xl font-black tracking-tight leading-none text-[#FFF4CC] mb-2"
              style={{
                textShadow: '0 0 15px #F5C542, 0 0 30px #E67E22, 0 4px 16px rgba(0,0,0,0.98), 0 0 35px rgba(0,0,0,0.95), 0 0 2px #000000',
              }}
            >
              SUMMER
            </h2>

            {/* Logo กลางการ์ด SUMMER (ตัดพื้นขาวออกด้วย mix-blend-multiply) */}
<div className="relative w-40 h-28 my-1 flex items-center justify-center filter drop-shadow-[0_0_20px_rgba(245,197,66,0.6)]">
  <Image
    src="/images/seasons/logo.png"
    alt="Zodiac Arena Logo"
    fill
    sizes="(max-width: 768px) 160px, 180px"
    className="object-contain mix-blend-multiply"
    priority
  />
</div>

            <span 
              className="text-[9px] text-amber-300 uppercase tracking-widest font-black block mt-1"
              style={{
                textShadow: '0 2px 10px rgba(0,0,0,0.98), 0 0 20px rgba(0,0,0,0.95), 0 0 3px #000000',
              }}
            >
              LIVE TOURNAMENT PHASE
            </span>
          </div>

          {/* Integrated Login Options */}
          <div className="bg-black/90 backdrop-blur-md rounded-xl p-3.5 border border-amber-400/60 space-y-2.5 shadow-2xl">
            <div className="text-center mb-0.5">
              <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider block">
                ATHLETE ACCESS
              </span>
              <span className="text-[9px] text-zinc-400">เข้าสู่ระบบเพื่อสะสมคะแนน ZP</span>
            </div>

            {error && (
              <div className="rounded p-1.5 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 text-center">
                {error}
              </div>
            )}

            {/* ปุ่ม Google Auth ผ่าน Supabase */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-[10px] font-semibold tracking-wider text-zinc-200 bg-white/10 hover:bg-white/20 border border-white/20 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading === 'google' ? <Spinner /> : <GoogleIcon />}
              <span>GOOGLE LOGIN</span>
            </button>
          </div>
        </div>

        {/* CARD 4: FALL */}
        <div 
          className="relative h-[550px] rounded-2xl overflow-hidden border-2 border-orange-500/80 bg-zinc-950/40 flex flex-col justify-between p-4 transition-transform duration-300 hover:scale-[1.03] hover:border-orange-400"
          style={{
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.9), 0 0 30px rgba(249,115,22,0.35)',
          }}
        >
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/seasons/Fall.jpg"
              alt="Fall Season"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
              className="object-cover"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-orange-300 bg-orange-950/90 border border-orange-400/60 px-2 py-0.5 rounded">
              SEASON 3 • JUL-SEP
            </span>
            <span className="text-[10px] text-orange-300 font-bold bg-black/60 px-2 py-0.5 rounded border border-orange-400/40">
              NEXT SEASON
            </span>
          </div>

          <div className="text-center my-auto w-full px-1">
            <h2 className="w-full text-center text-4xl sm:text-5xl font-black text-orange-400 tracking-tight leading-none">
              FALL
            </h2>
            <p className="text-[11px] text-zinc-100 tracking-widest uppercase font-black mt-1.5">UPCOMING CIRCUIT</p>
          </div>

          <div className="bg-black/80 backdrop-blur-md rounded-xl p-3 border border-orange-500/40 text-center shadow-lg">
            <span className="text-[10px] text-zinc-300 block mb-1">REGISTRATION OPENS</span>
            <span className="text-xs font-black text-orange-400">JULY 2026</span>
          </div>
        </div>

        {/* CARD 5: WINTER */}
        <div 
          className="relative h-[550px] rounded-2xl overflow-hidden border-2 border-cyan-500/80 bg-zinc-950/40 flex flex-col justify-between p-4 transition-transform duration-300 hover:scale-[1.03] hover:border-cyan-400"
          style={{
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.9), 0 0 30px rgba(14,165,233,0.35)',
          }}
        >
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/seasons/Winter.jpg"
              alt="Winter Season"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
              className="object-cover"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-cyan-300 bg-cyan-950/90 border border-cyan-400/60 px-2 py-0.5 rounded">
              SEASON 4 • OCT-DEC
            </span>
            <span className="text-[10px] text-cyan-300 font-bold bg-black/60 px-2 py-0.5 rounded border border-cyan-400/40">
              LOCKED
            </span>
          </div>

          <div className="text-center my-auto w-full px-1">
            <h2 className="w-full text-center text-4xl sm:text-5xl font-black text-cyan-300 tracking-tight leading-none">
              WINTER
            </h2>
            <p className="text-[11px] text-zinc-100 tracking-widest uppercase font-black mt-1.5">FINAL QUALIFIER</p>
          </div>

          <div className="bg-black/80 backdrop-blur-md rounded-xl p-3 border border-cyan-500/40 text-center shadow-lg">
            <span className="text-[10px] text-zinc-300 block mb-1">LAST CHANCE POINTS</span>
            <span className="text-xs font-black text-cyan-300">OCTOBER 2026</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-zinc-400">
        การเข้าสู่ระบบถือว่ายอมรับ{' '}
        <button
          type="button"
          onClick={() => router.push('/terms')}
          className="text-zinc-300 hover:text-amber-400 underline transition-colors cursor-pointer"
        >
          ข้อกำหนดและกติกาการแข่งขัน ZODIAC ARENA
        </button>
      </footer>
    </main>
  );
}

function CrownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">
      <path d="M2 19h20v2H2v-2zM2 5l5 3.5L12 3l5 5.5L22 5v12H2V5z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
