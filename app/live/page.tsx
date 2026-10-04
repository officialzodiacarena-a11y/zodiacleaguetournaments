'use client';
import { useEffect, useState } from 'react';
<<<<<<< HEAD
import { createClient } from '@/lib/supabase/client';
// We don't have the data easily available for the BracketView here without fetching,
// so for the draft, we will just display a placeholder or fetch it in a useEffect.
// To keep it simple, we'll just display a placeholder for BRACKET scene.
=======
>>>>>>> origin/main

export default function LivePage() {
  const supabase = createClient();
  const [activeScene, setActiveScene] = useState<string>('STANDBY');
  const [matchId, setMatchId] = useState<string>('');
  
  useEffect(() => {
<<<<<<< HEAD
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
            {/* The actual TournamentBracketView requires fetching complex nested data. 
                For the live public page, this would either fetch /api/v1/bracket 
                or load an iframe of the bracket page. We'll use an iframe for a quick perfect render. */}
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

=======
    const params = new URLSearchParams(window.location.search);
    const mId = params.get('matchId');
    if (mId) setMatchId(mId);
  }, []);

  let src = '/stream-hub?viewer=true';
  if (matchId) {
    src += '&matchId=' + matchId;
  }
  
  return (
    <div className="w-full h-screen bg-black overflow-hidden m-0 p-0">
      <iframe 
        src={src}
        className="w-full h-full border-none"
        allowFullScreen
      />
>>>>>>> origin/main
    </div>
  );
}
