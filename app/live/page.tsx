'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { OfficialSponsorsBar } from '@/components/sponsor/OfficialSponsorsBar';
import { Snowflake } from 'lucide-react';
import Image from 'next/image';

export default function LivePage() {
  const supabase = createClient();
  const [activeScene, setActiveScene] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('scene') || 'STANDBY';
    }
    return 'STANDBY';
  });
  const [matchId, setMatchId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('matchId') || '';
    }
    return '';
  });
  
  useEffect(() => {
    const channel = supabase.channel('broadcast-director');
    channel.on('broadcast', { event: 'scene-change' }, (payload) => {
      if (payload.payload?.scene) setActiveScene(payload.payload.scene);
      if (payload.payload?.matchId) setMatchId(payload.payload.matchId);
    }).subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  let src = '/stream-hub?viewer=true';
  if (matchId) src += '&matchId=' + matchId;

  return (
    <div className="w-full h-screen bg-[#0a0a0c] overflow-hidden m-0 p-0 text-white flex items-center justify-center relative">
      
      {activeScene === 'STANDBY' && (
        <div className="text-center animate-pulse">
          <h1 className="text-6xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-[#E8B429] to-[#b38510]">
            ZODIAC ARENA
          </h1>
          <p className="text-2xl text-gray-400 tracking-widest">BROADCAST WILL BEGIN SHORTLY</p>
        </div>
      )}

      {activeScene === 'BRACKET' && (
        <div className="w-full h-full p-8 flex flex-col">
          <h1 className="text-4xl font-bold mb-8 text-[#E8B429] text-center mt-10">TOURNAMENT BRACKET</h1>
          <div className="flex-1 bg-[#1c1c1f] rounded-2xl border border-white/5 shadow-2xl flex items-center justify-center">
             <iframe src="/tournaments" className="w-full h-full rounded-2xl border-none" />
          </div>
        </div>
      )}

      {activeScene === 'LIVE_STREAM' && (
        <iframe 
          src={src}
          className="w-full h-full border-none"
          allowFullScreen
        />
      )}

      {activeScene === 'CUSTOM_ICE' && (
        <div className="w-full h-full p-8 grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-[#1c1c1f] rounded-2xl border border-white/10 flex flex-col items-center justify-center p-10 relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('/img/cyber-grid.png')] opacity-20 pointer-events-none" />
             <h2 className="text-5xl font-black text-[#E8B429] mb-4 z-10">MATCH IN PROGRESS</h2>
             <iframe src={src} className="w-full h-[600px] rounded-xl border border-white/20 z-10" />
          </div>
          <div className="col-span-1 flex flex-col gap-6">
            <div className="bg-[#1c1c1f] flex-1 rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-bold text-gray-400 border-b border-white/10 pb-4 mb-4">PLAYER CAM</h3>
              <div className="grid grid-rows-2 gap-4 h-[calc(100%-4rem)]">
                 <div className="bg-black/50 rounded-xl flex items-center justify-center border border-white/5 text-gray-600">TEAM A CAM (TBD)</div>
                 <div className="bg-black/50 rounded-xl flex items-center justify-center border border-white/5 text-gray-600">TEAM B CAM (TBD)</div>
              </div>
            </div>
            <div className="bg-[#1c1c1f] h-1/3 rounded-2xl border border-white/10 p-6 flex flex-col justify-center">
              <h3 className="text-2xl font-bold text-[#E8B429] mb-2">LIVE STATS</h3>
              <p className="text-gray-400">Loading Real-time Telemetry...</p>
            </div>
          </div>
        </div>
      )}

      {activeScene === 'PODIUM' && (
        <div className="w-full h-full flex flex-col items-center justify-between p-8 bg-[#0a0a0c] relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/img/cyber-grid.png')] opacity-10 pointer-events-none" />
          
          {/* Top Header Row */}
          <div className="z-10 w-full flex items-start justify-between px-12 mt-4">
             {/* Winter Season Card */}
             <div className="relative w-48 h-60 rounded-xl overflow-hidden border-2 border-[#5BA8D4] bg-zinc-950/20 flex flex-col justify-center items-center shadow-[0_4px_30px_rgba(91,168,212,0.3)]">
               <div className="absolute inset-0 -z-10">
                 <Image src="/images/seasons/Winter.jpg" alt="Winter" fill className="object-cover opacity-60 mix-blend-overlay" />
               </div>
               <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/40 to-[#0a0a0c]/80 -z-10" />
               <Snowflake className="w-10 h-10 text-[#5BA8D4] mb-3 drop-shadow-[0_0_8px_rgba(91,168,212,0.8)]" />
               <h3 className="text-3xl font-black text-cyan-300 drop-shadow-md">WINTER</h3>
               <p className="text-[10px] text-cyan-200 tracking-widest mt-1 font-mono">SEASON 4</p>
             </div>
             
             {/* Center Title */}
             <div className="flex flex-col items-center mt-4 mx-8">
                <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#E8B429] to-[#F3D370] tracking-wider uppercase drop-shadow-[0_0_15px_rgba(232,180,41,0.5)] text-center">
                  ZODIAC LEAGUE : VALORANT
                </h1>
                <h2 className="text-3xl font-bold text-gray-300 mt-4 tracking-[0.2em] text-center">
                  FINAL STANDINGS
                </h2>
             </div>

             {/* Main Sponsor */}
             <div className="relative w-48 h-60 flex flex-col items-center justify-center bg-[#1c1c1f]/50 border border-white/5 rounded-xl shadow-lg p-4 text-center">
                <span className="text-[10px] font-mono text-gray-400 mb-4 uppercase tracking-widest">Presented By</span>
                <div className="w-24 h-24 relative mb-2">
                  <Image src="/images/logo/logo.png" alt="Zodiac Arena" fill className="object-contain opacity-90 drop-shadow-md" />
                </div>
                <span className="text-sm font-bold text-white tracking-widest">ZODIAC ARENA</span>
             </div>
          </div>

          {/* Podium */}
          <div className="z-10 flex items-end justify-center gap-12 flex-1 mt-8 pb-4 max-h-[500px]">
            {/* 2nd Place */}
            <div className="flex flex-col items-center transform translate-y-16">
              <div className="w-48 h-48 rounded-full bg-[#1c1c1f] border-4 border-[#C0C0C0] p-6 flex items-center justify-center shadow-[0_0_30px_rgba(192,192,192,0.3)] z-20 mb-[-40px]">
                <Image src="/images/Team_Logo/PWE.png" alt="POWER UP" width={160} height={160} className="w-full h-full object-contain drop-shadow-xl" />
              </div>
              <div className="w-56 h-72 bg-gradient-to-b from-[#C0C0C0]/20 to-[#0a0a0c] border-t-4 border-x border-[#C0C0C0]/50 rounded-t-xl flex flex-col items-center pt-16">
                <span className="text-4xl font-black text-[#C0C0C0]">2ND</span>
                <span className="text-xl font-bold text-white mt-2">POWER UP</span>
                <div className="mt-6 flex flex-col items-center bg-black/60 px-6 py-3 rounded-xl border border-[#C0C0C0]/30 shadow-inner">
                  <span className="text-sm text-gray-400 font-medium">TOTAL PRIZE</span>
                  <span className="text-2xl font-black text-[#E8B429] drop-shadow-md">1,500 ZP</span>
                </div>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center z-30">
              <div className="w-64 h-64 rounded-full bg-[#1c1c1f] border-4 border-[#FFD700] p-8 flex items-center justify-center shadow-[0_0_50px_rgba(255,215,0,0.5)] mb-[-50px]">
                <Image src="/images/Team_Logo/ICE.png" alt="ICEBERG" width={220} height={220} className="w-full h-full object-contain drop-shadow-2xl" />
              </div>
              <div className="w-64 h-96 bg-gradient-to-b from-[#FFD700]/30 to-[#0a0a0c] border-t-4 border-x border-[#FFD700]/60 rounded-t-xl flex flex-col items-center pt-20">
                <span className="text-6xl font-black text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]">1ST</span>
                <span className="text-3xl font-black text-white mt-2 uppercase tracking-wide">ICEBERG</span>
                <div className="mt-8 flex flex-col items-center bg-black/60 px-8 py-4 rounded-xl border border-[#FFD700]/50 shadow-[0_0_20px_rgba(255,215,0,0.2)]">
                  <span className="text-sm text-gray-300 font-medium">CHAMPION PRIZE</span>
                  <span className="text-4xl font-black text-[#E8B429] drop-shadow-lg">2,000 ZP</span>
                </div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center transform translate-y-32">
              <div className="w-40 h-40 rounded-full bg-[#1c1c1f] border-4 border-[#CD7F32] p-5 flex items-center justify-center shadow-[0_0_20px_rgba(205,127,50,0.3)] z-20 mb-[-30px]">
                <Image src="/images/Team_Logo/MR.png" alt="MONARCH" width={140} height={140} className="w-full h-full object-contain drop-shadow-lg" />
              </div>
              <div className="w-48 h-56 bg-gradient-to-b from-[#CD7F32]/20 to-[#0a0a0c] border-t-4 border-x border-[#CD7F32]/50 rounded-t-xl flex flex-col items-center pt-12">
                <span className="text-3xl font-black text-[#CD7F32]">3RD</span>
                <span className="text-lg font-bold text-white mt-2">MONARCH</span>
                <div className="mt-4 flex flex-col items-center bg-black/60 px-4 py-2 rounded-xl border border-[#CD7F32]/30 shadow-inner">
                  <span className="text-xs text-gray-400 font-medium">TOTAL PRIZE</span>
                  <span className="text-xl font-black text-[#E8B429]">1,250 ZP</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer Sponsors */}
          <div className="z-10 w-full flex flex-col items-center gap-6 mt-4">
            <OfficialSponsorsBar />
            <div className="text-gray-600 font-mono text-[10px] flex justify-center gap-8 uppercase tracking-widest">
              <span>* BASE REWARD: 1,000 ZP / TEAM</span>
              <span>* 1ST BONUS: +1,000 ZP | 2ND BONUS: +500 ZP | 3RD BONUS: +250 ZP</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
