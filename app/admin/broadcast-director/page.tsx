'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function BroadcastDirectorPanel() {
  const supabase = createClient();
  const [activeScene, setActiveScene] = useState<string>('STANDBY');
  const [matchId, setMatchId] = useState<string>('');
  
  useEffect(() => {
    // Sync current state if someone else broadcasts
    const channel = supabase.channel('broadcast-director');
    channel.on('broadcast', { event: 'scene-change' }, (payload) => {
      if (payload.payload?.scene) setActiveScene(payload.payload.scene);
      if (payload.payload?.matchId) setMatchId(payload.payload.matchId);
    }).subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);
  
  const pushScene = async (scene: string) => {
    setActiveScene(scene);
    const channel = supabase.channel('broadcast-director');
    await channel.send({
      type: 'broadcast',
      event: 'scene-change',
      payload: { scene, matchId }
    });
  };

  const scenes = [
    { id: 'STANDBY', name: 'Standby / Countdown', color: 'bg-gray-600' },
    { id: 'BRACKET', name: 'Bracket View', color: 'bg-blue-600' },
    { id: 'LIVE_STREAM', name: 'Live Stream (Main)', color: 'bg-red-600' },
    { id: 'CUSTOM_ICE', name: 'Custom View (สถิติ/พี่ไอซ์)', color: 'bg-purple-600' }, 
    { id: 'PODIUM', name: 'Tournament Podium (�š���觢ѹ)', color: 'bg-yellow-600' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        🎬 Broadcast Director Control Panel
      </h1>
      
      <div className="bg-[#1c1c1f] rounded-xl p-6 border border-white/10 mb-8 max-w-2xl">
        <h2 className="text-xl font-semibold mb-4 text-[#9397ab]">Active Match ID (Optional)</h2>
        <input 
          type="text" 
          placeholder="UUID ของ Match (ถ้ามี)"
          value={matchId}
          onChange={(e) => setMatchId(e.target.value)}
          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#E8B429]"
        />
        <p className="text-sm text-gray-500 mt-2">ใช้สำหรับส่งพารามิเตอร์ไปแสดงผล Stream Hub หรือหน้า Veto</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        {scenes.map(s => (
          <button
            key={s.id}
            onClick={() => pushScene(s.id)}
            className={`p-6 rounded-xl font-bold text-lg transition-all border-2 flex items-center justify-center gap-2 ${
              activeScene === s.id 
                ? `${s.color} border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105` 
                : 'bg-[#1c1c1f] border-transparent hover:bg-[#2c2c30] text-gray-400'
            }`}
          >
            {activeScene === s.id && <span className="h-3 w-3 rounded-full bg-white animate-pulse" />}
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
