'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Provider } from '@supabase/supabase-js';
import { SkyscraperTower } from '@/components/sponsor/SkyscraperTower';

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

export default function SeasonalGatewayPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeString, setTimeString] = useState<string>('');

  const router = useRouter();
  const supabase = createClient();

  // Digital Clock Update (UTC+7 BKK)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('th-TH', {
          timeZone: 'Asia/Bangkok',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  async function handleOAuthLogin(provider: Provider) {
    setLoading(provider);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#0D0E1A] text-[#F9EDD8] flex flex-col justify-between p-0 relative overflow-x-hidden font-sans select-none">
      
      {/* Dynamic Keyframes Animation */}
      <style jsx global>{`
        @keyframes za-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes za-rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes za-pulse-glow {
          0%, 100% { box-shadow: 0 0 25px rgba(232,180,41,0.3), 0 0 50px rgba(232,180,41,0.15); }
          50% { box-shadow: 0 0 40px rgba(232,180,41,0.5), 0 0 70px rgba(232,180,41,0.25); }
        }
        .anim-float-crown { animation: za-float 3.5s ease-in-out infinite; }
        .anim-float-sakura { animation: za-float 4s ease-in-out infinite; }
        .anim-float-leaf { animation: za-float 4.5s ease-in-out infinite; }
        .anim-rotate-sun { animation: za-rotate-slow 14s linear infinite; }
        .anim-rotate-snow { animation: za-rotate-slow 22s linear infinite; }
        .anim-summer-glow { animation: za-pulse-glow 3s ease-in-out infinite; }
      `}</style>

      {/* Skyscraper Towers (ซ้าย-ขวา) */}
      <SkyscraperTower position="LEFT_TOWER" />
      <SkyscraperTower position="RIGHT_TOWER" />

      {/* Background Faceoff Image */}
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

      {/* Background Cyber Grid */}
      <div 
        className="pointer-events-none fixed inset-0 opacity-35 -z-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(145, 132, 217, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(232, 180, 41, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
      
      {/* Ambient Center Glow */}
      <div className="pointer-events-none fixed -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-500/20 via-purple-500/10 to-transparent rounded-full blur-[120px]" />

      {/* Top Tactical Telemetry Bar (แทนที่แบนเนอร์ด้านบน) */}
      <div className="relative z-20 w-full bg-[#090A12]/90 border-b border-white/10 backdrop-blur-md px-4 py-2 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <span className="text-red-500 font-bold uppercase tracking-wider">LIVE TELEMETRY:</span>
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
          <span className="text-zinc-400">ALL CIRCUITS STANDBY · NEXT TOURNAMENT SOON (0 OPEN FOR REGISTRATION)</span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2 text-amber-400/90 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>S2 SUMMER CIRCUIT: ACTIVE</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400 border-l border-white/10 pl-6">
            {timeString && <span className="text-zinc-300 font-bold">{timeString} BKK</span>}
            <div className="flex items-center gap-1.5 text-emerald-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              <span>18ms</span>
            </div>
            <span className="text-[10px] text-zinc-500">SERVER: ASIA-BANGKOK</span>
          </div>
        </div>
      </div>

      {/* Header Banner */}
      <header className="relative z-10 text-center mt-4 mb-2 max-w-2xl mx-auto px-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-amber-500/50 bg-amber-500/15 text-amber-300 text-[9px] font-bold tracking-[0.3em] uppercase mb-1 shadow-[0_0_12px_rgba(245,197,66,0.3)]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          VALORANT ESPORTS INTEGRATED ECOSYSTEM
        </div>
        <h1 
          className="text-3xl md:text-5xl font-black tracking-wider uppercase m-0 leading-none bg-gradient-to-r from-[#F9EDD8] via-[#9184D9] to-[#E8B429] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(245,197,66,0.4)]"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          ZODIAC ARENA
        </h1>
        <p className="font-mono text-xs text-zinc-300 mt-1.5 tracking-widest font-semibold drop-shadow">
          12 SIGNS • 4 SEASONS • 1 DESTINY
        </p>
      </header>

      {/* 5-Card Grid Showcase (Height = 400px สมดุลพอดีจอ) */}
      <div className="relative z-10 w-full max-w-[1420px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-stretch px-3 my-auto">
        
        {/* CARD 1: ZODIAC LEAGUE */}
        <div className="relative h-[400px] rounded-xl overflow-hidden border border-[#9184D9] bg-zinc-950/20 flex flex-col justify-between p-2.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(145,132,217,0.5)] shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/seasons/zodiacT1Y.jpg"
              alt="Zodiac Tournament Grand Finals"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
              className="object-cover opacity-85"
              priority
            />
          </div>
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#9184D9] rounded-tl-xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#9184D9] rounded-br-xl pointer-events-none" />

          <div>
            <div className="flex justify-between items-center text-[8.5px] font-mono tracking-widest mb-1">
              <span className="bg-[#9184D9]/80 text-purple-100 px-1.5 py-0.5 rounded border border-[#9184D9] font-bold shadow">ANNUAL FINALS</span>
              <span className="text-amber-300 font-bold bg-black/70 px-1.5 py-0.5 rounded border border-amber-400/40">TOP 12 CLASH</span>
            </div>

            <div className="w-7 h-7 mx-auto my-1 text-[#9184D9] anim-float-crown drop-shadow-[0_0_8px_rgba(145,132,217,0.8)]">
              <CrownIcon />
            </div>

            <div className="text-center">
              <span className="text-[8px] text-amber-300 tracking-[0.2em] uppercase font-black block drop-shadow-[0_0_6px_rgba(245,197,66,0.8)]">
                GRAND CHAMPIONSHIP
              </span>
              <h2 className="text-xl lg:text-2xl font-black text-white tracking-tight leading-tight drop-shadow-[0_0_15px_rgba(168,85,247,0.95)]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                ZODIAC <br /><span className="text-purple-400">LEAGUE</span>
              </h2>
              <p className="text-[9px] text-zinc-200 mt-0.5 font-bold drop-shadow">มหาศึกรวม 12 ราศีส่งท้ายปี</p>
            </div>
          </div>

          <div className="bg-black/80 backdrop-blur-md rounded-lg p-2 border border-purple-500/40 text-center shadow-lg">
            <span className="text-[7.5px] text-zinc-300 block font-mono">TOTAL PRIZE POOL</span>
            <span className="text-[11px] font-black text-amber-400 tracking-wider font-mono">ANNUAL GLORY</span>
          </div>
        </div>

        {/* CARD 2: SPRING */}
        <div className="relative h-[400px] rounded-xl overflow-hidden border border-[#63A66F] bg-zinc-950/20 flex flex-col justify-between p-2.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(99,166,111,0.5)] shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/seasons/Spring.jpg"
              alt="Spring Season"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
              className="object-cover opacity-85"
            />
          </div>
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#63A66F] rounded-tl-xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#63A66F] rounded-br-xl pointer-events-none" />

          <div>
            <div className="flex justify-between items-center text-[8.5px] font-mono tracking-widest mb-1">
              <span className="bg-emerald-950/90 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-400/60 font-bold">SEASON 1 • JAN-MAR</span>
              <div className="flex items-center gap-1 text-amber-300 bg-black/70 px-1 py-0.5 rounded border border-amber-400/40 shadow-sm">
                <span className="text-[7.5px] font-black tracking-wider text-amber-400">CHAMPION</span>
              </div>
            </div>

            <div className="w-6 h-6 mx-auto my-0.5 text-[#63A66F] anim-float-sakura drop-shadow-[0_0_8px_rgba(99,166,111,0.8)]">
              <SakuraIcon />
            </div>

            <div className="text-center">
              <h2 
                className="text-xl lg:text-2xl font-black text-emerald-300 tracking-tight leading-none"
                style={{
                  textShadow: '0 0 12px #10B981, 0 0 24px #059669, 0 4px 12px rgba(0,0,0,0.98), 0 0 2px #000000',
                }}
              >
                SPRING
              </h2>
              <p 
                className="text-[7.5px] text-zinc-200 uppercase tracking-widest font-black mt-0.5"
                style={{
                  textShadow: '0 2px 8px rgba(0,0,0,0.98), 0 0 4px #000000',
                }}
              >
                CONCLUDED • {SPRING_CHAMPIONS.record}
              </p>
            </div>
          </div>

          {/* Champion Roster Matrix */}
          <div className="bg-black/85 backdrop-blur-md rounded-lg p-1.5 border border-emerald-500/40 shadow-xl space-y-0.5">
            <div className="text-[8px] font-black text-amber-400 flex items-center justify-between border-b border-white/10 pb-0.5">
              <span>🏆 {SPRING_CHAMPIONS.teamName}</span>
              <span className="text-[7px] text-emerald-400 bg-emerald-950/80 px-1 rounded border border-emerald-500/30">
                1st SEED
              </span>
            </div>

            <div className="space-y-0.5">
              {SPRING_CHAMPIONS.players.map((p, idx) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between bg-white/[0.05] hover:bg-white/[0.1] px-1 py-0.5 rounded border border-white/5 text-[7.5px] font-mono"
                >
                  <div className="flex items-center gap-1 truncate max-w-[90px]">
                    <span className="font-bold text-emerald-400 text-[7px]">#{idx + 1}</span>
                    <span className="font-black text-zinc-100 truncate">{p.name}</span>
                    <span className="text-[6.5px] text-zinc-400 bg-zinc-800/80 px-0.5 rounded">
                      {p.agent}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-300 font-bold">{p.kda}</span>
                    <span className="text-amber-300 font-bold">{p.adr}</span>
                    <span className="text-emerald-400 font-bold">{p.hs}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CARD 3: SUMMER (LIVE & AUTH PORTAL) */}
        <div className="relative h-[400px] rounded-xl overflow-hidden border-2 border-[#E8B429] bg-zinc-950/20 flex flex-col justify-between p-2.5 anim-summer-glow transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/seasons/Summer.jpg"
              alt="Summer Season"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
              className="object-cover opacity-90"
              priority
            />
          </div>
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#E8B429] rounded-tl-xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#E8B429] rounded-tr-xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#E8B429] rounded-bl-xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#E8B429] rounded-br-xl pointer-events-none" />

          <div>
            <div className="flex justify-between items-center text-[8.5px] font-mono tracking-widest mb-1">
              <span className="text-[#E8B429] font-bold bg-amber-950/90 border border-amber-400/60 px-1.5 py-0.5 rounded shadow">SEASON 2 • APR-JUN</span>
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-600/90 border border-red-400 text-white shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-pulse">
                <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                <span className="text-[7.5px] font-black tracking-widest uppercase">LIVE</span>
              </div>
            </div>

            <div className="w-7 h-7 mx-auto my-0.5 text-[#E8B429] anim-rotate-sun drop-shadow-[0_0_10px_rgba(232,180,41,0.9)]">
              <SunIcon />
            </div>

            <div className="text-center">
              <h2 
                className="text-xl lg:text-2xl font-black tracking-tight leading-none text-[#FFF4CC]"
                style={{
                  textShadow: '0 0 12px #F5C542, 0 0 24px #E67E22, 0 4px 12px rgba(0,0,0,0.98), 0 0 2px #000000',
                }}
              >
                SUMMER
              </h2>
              <span 
                className="text-[7.5px] text-amber-300 uppercase tracking-widest font-black block mt-0.5"
                style={{
                  textShadow: '0 2px 8px rgba(0,0,0,0.98), 0 0 3px #000000',
                }}
              >
                LIVE TOURNAMENT PHASE
              </span>
            </div>
          </div>

          {/* Login Options (Google, Facebook, Discord) */}
          <div className="bg-black/85 backdrop-blur-md rounded-lg p-2 border border-amber-400/60 space-y-1 shadow-xl">
            <div className="text-center">
              <span className="text-[8px] text-amber-400 font-black uppercase tracking-wider block font-mono">
                ATHLETE ACCESS
              </span>
              <span className="text-[7px] text-zinc-300">เข้าสู่ระบบเพื่อสะสมคะแนน ZP</span>
            </div>

            {error && (
              <div className="rounded p-0.5 text-[7.5px] text-red-400 bg-red-500/10 border border-red-500/20 text-center">
                {error}
              </div>
            )}

            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-1.5 rounded py-1 px-1.5 text-[8.5px] font-semibold tracking-wider text-zinc-100 bg-white/10 hover:bg-white/20 border border-white/20 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading === 'google' ? <Spinner /> : <GoogleIcon />}
              <span>{loading === 'google' ? 'CONNECTING...' : 'GOOGLE LOGIN'}</span>
            </button>

            <button
              onClick={() => handleOAuthLogin('facebook')}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-1.5 rounded py-1 px-1.5 text-[8.5px] font-bold tracking-wider text-white bg-[#1877F2]/30 hover:bg-[#1877F2]/50 border border-[#1877F2]/50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading === 'facebook' ? <Spinner /> : <FacebookIcon />}
              <span>{loading === 'facebook' ? 'CONNECTING...' : 'LOGIN WITH FACEBOOK'}</span>
            </button>

            <button
              onClick={() => handleOAuthLogin('discord')}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-1.5 rounded py-1 px-1.5 text-[8.5px] font-bold tracking-wider text-white bg-[#5865F2]/30 hover:bg-[#5865F2]/50 border border-[#5865F2]/50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading === 'discord' ? <Spinner /> : <DiscordIcon />}
              <span>{loading === 'discord' ? 'CONNECTING...' : 'LOGIN WITH DISCORD'}</span>
            </button>
          </div>
        </div>

        {/* CARD 4: FALL */}
        <div className="relative h-[400px] rounded-xl overflow-hidden border border-[#E87529] bg-zinc-950/20 flex flex-col justify-between p-2.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(232,117,41,0.5)] shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/seasons/Fall.jpg"
              alt="Fall Season"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
              className="object-cover opacity-85"
            />
          </div>
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#E87529] rounded-tl-xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#E87529] rounded-br-xl pointer-events-none" />

          <div>
            <div className="flex justify-between items-center text-[8.5px] font-mono tracking-widest mb-1">
              <span className="bg-orange-950/90 text-orange-300 px-1.5 py-0.5 rounded border border-orange-400/60 font-bold">SEASON 3 • JUL-SEP</span>
              <span className="text-orange-300 font-bold bg-black/70 px-1.5 py-0.5 rounded border border-orange-400/40">NEXT</span>
            </div>

            <div className="w-7 h-7 mx-auto my-1 text-[#E87529] anim-float-leaf drop-shadow-[0_0_8px_rgba(232,117,41,0.8)]">
              <LeafIcon />
            </div>

            <div className="text-center my-1">
              <h2 className="text-xl lg:text-2xl font-black text-orange-400 tracking-tight leading-none drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]">
                FALL
              </h2>
              <p className="text-[8px] text-zinc-100 tracking-widest uppercase font-black mt-0.5 drop-shadow">UPCOMING CIRCUIT</p>
            </div>
          </div>

          <div className="bg-black/80 backdrop-blur-md rounded-lg p-2 border border-orange-500/40 text-center shadow-lg">
            <span className="text-[7.5px] text-zinc-300 block font-mono">REGISTRATION OPENS</span>
            <span className="text-[11px] font-black text-orange-400 font-mono">JULY 2026</span>
          </div>
        </div>

        {/* CARD 5: WINTER */}
        <div className="relative h-[400px] rounded-xl overflow-hidden border border-[#5BA8D4] bg-zinc-950/20 flex flex-col justify-between p-2.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(91,168,212,0.5)] shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/seasons/Winter.jpg"
              alt="Winter Season"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
              className="object-cover opacity-85"
            />
          </div>
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#5BA8D4] rounded-tl-xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#5BA8D4] rounded-br-xl pointer-events-none" />

          <div>
            <div className="flex justify-between items-center text-[8.5px] font-mono tracking-widest mb-1">
              <span className="bg-cyan-950/90 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-400/60 font-bold">SEASON 4 • OCT-DEC</span>
              <span className="text-cyan-300 font-bold bg-black/70 px-1.5 py-0.5 rounded border border-cyan-400/40">LOCKED</span>
            </div>

            <div className="w-7 h-7 mx-auto my-1 text-[#5BA8D4] anim-rotate-snow drop-shadow-[0_0_8px_rgba(91,168,212,0.8)]">
              <SnowflakeIcon />
            </div>

            <div className="text-center my-1">
              <h2 className="text-xl lg:text-2xl font-black text-cyan-300 tracking-tight leading-none drop-shadow-[0_0_12px_rgba(14,165,233,0.6)]">
                WINTER
              </h2>
              <p className="text-[8px] text-zinc-100 tracking-widest uppercase font-black mt-0.5 drop-shadow">FINAL QUALIFIER</p>
            </div>
          </div>

          <div className="bg-black/80 backdrop-blur-md rounded-lg p-2 border border-cyan-500/40 text-center shadow-lg">
            <span className="text-[7.5px] text-zinc-300 block font-mono">LAST CHANCE POINTS</span>
            <span className="text-[11px] font-black text-cyan-300 font-mono">OCTOBER 2026</span>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center text-[10px] text-zinc-400 font-mono py-2">
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

// SVG Icons
function CrownIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
      <path d="M4 26L8 12L14 20L18 8L22 20L28 12L32 26H4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="4" cy="26" r="2.5" fill="currentColor" />
      <circle cx="18" cy="8" r="2.5" fill="#E8B429" />
      <circle cx="32" cy="26" r="2.5" fill="currentColor" />
      <line x1="4" y1="29" x2="32" y2="29" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SakuraIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
      <ellipse cx="18" cy="10" rx="4" ry="7" fill="rgba(99,166,111,0.25)" stroke="currentColor" strokeWidth="1.2" />
      <ellipse cx="18" cy="10" rx="4" ry="7" fill="rgba(99,166,111,0.25)" stroke="currentColor" strokeWidth="1.2" transform="rotate(72 18 18)" />
      <ellipse cx="18" cy="10" rx="4" ry="7" fill="rgba(99,166,111,0.25)" stroke="currentColor" strokeWidth="1.2" transform="rotate(144 18 18)" />
      <ellipse cx="18" cy="10" rx="4" ry="7" fill="rgba(99,166,111,0.25)" stroke="currentColor" strokeWidth="1.2" transform="rotate(216 18 18)" />
      <ellipse cx="18" cy="10" rx="4" ry="7" fill="rgba(99,166,111,0.25)" stroke="currentColor" strokeWidth="1.2" transform="rotate(288 18 18)" />
      <circle cx="18" cy="18" r="3.5" fill="currentColor" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 52 52" fill="none" className="w-full h-full">
      <circle cx="26" cy="26" r="10" fill="rgba(245,197,66,0.2)" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="26" cy="26" r="6" fill="currentColor" opacity="0.6" />
      <line x1="26" y1="4" x2="26" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="42" x2="26" y2="48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4" y1="26" x2="10" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="42" y1="26" x2="48" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10.8" y1="10.8" x2="15.1" y2="15.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="36.9" y1="36.9" x2="41.2" y2="41.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="41.2" y1="10.8" x2="36.9" y2="15.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15.1" y1="36.9" x2="10.8" y2="41.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
      <path d="M18 4C10 4 4 12 4 20c0 7 6 12 14 12 8 0 14-5 14-12 0-8-6-16-14-16z" fill="rgba(232,117,41,0.2)" stroke="currentColor" strokeWidth="1.5" />
      <line x1="18" y1="32" x2="18" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SnowflakeIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
      <line x1="18" y1="4" x2="18" y2="32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <line x1="4" y1="18" x2="32" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <circle cx="18" cy="4" r="1.5" fill="currentColor" />
      <circle cx="18" cy="32" r="1.5" fill="currentColor" />
      <circle cx="4" cy="18" r="1.5" fill="currentColor" />
      <circle cx="32" cy="18" r="1.5" fill="currentColor" />
      <circle cx="18" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}