'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ImagePlus, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yjygevsdfebdyzywbpdr.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Y3j6k9biGK8YsBiHkaibkw_IcAFbWQj';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center' | 'watermark';
type ShowOn = 'all' | 'live' | 'starting-soon';

interface SponsorLogo {
  id: string;
  name: string;
  dataUrl: string;
  position: OverlayPosition;
  showOn: ShowOn;
  visible: boolean;
  scale: number;
}

const POSITIONS: { value: OverlayPosition; label: string }[] = [
  { value: 'top-left', label: 'บนซ้าย' },
  { value: 'top-right', label: 'บนขวา' },
  { value: 'bottom-left', label: 'ล่างซ้าย' },
  { value: 'bottom-right', label: 'ล่างขวา' },
  { value: 'bottom-center', label: 'ล่างกลาง' },
  { value: 'watermark', label: 'Watermark กลางจอ' },
];

const SHOW_OPTIONS: { value: ShowOn; label: string }[] = [
  { value: 'all', label: 'ทุกหน้า' },
  { value: 'live', label: 'ในเกม (LIVE)' },
  { value: 'starting-soon', label: 'หน้ารอ (Starting Soon)' },
];

export default function SponsorOverlayPage() {
  const [matchId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('matchId') || '';
  });
  const [logos, setLogos] = useState<SponsorLogo[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!matchId) return;
    const ch = supabase.channel(`match:${matchId}:overlay`);
    ch.subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [matchId]);

  const broadcastLogos = useCallback((updated: SponsorLogo[]) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'sponsor_overlay',
      payload: {
        logos: updated
          .filter(l => l.visible)
          .map(l => ({ id: l.id, dataUrl: l.dataUrl, position: l.position, showOn: l.showOn, scale: l.scale })),
      },
    });
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newLogo: SponsorLogo = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^.]+$/, ''),
        dataUrl: reader.result as string,
        position: 'bottom-right',
        showOn: 'all',
        visible: true,
        scale: 1,
      };
      const updated = [...logos, newLogo];
      setLogos(updated);
      broadcastLogos(updated);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [logos, broadcastLogos]);

  const updateLogo = useCallback((id: string, patch: Partial<SponsorLogo>) => {
    setLogos(prev => {
      const updated = prev.map(l => l.id === id ? { ...l, ...patch } : l);
      broadcastLogos(updated);
      return updated;
    });
  }, [broadcastLogos]);

  const removeLogo = useCallback((id: string) => {
    setLogos(prev => {
      const updated = prev.filter(l => l.id !== id);
      broadcastLogos(updated);
      return updated;
    });
  }, [broadcastLogos]);

  return (
    <div className="min-h-screen bg-[#0B0E1E] text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h1 className="text-xl font-black font-mono uppercase flex items-center gap-2">
              <ImagePlus className="w-5 h-5 text-pink-400" /> Live Sponsor Overlay
            </h1>
            <p className="text-xs font-mono text-neutral-500 mt-1">
              เพิ่ม/ลบโลโก้ sponsor แบบ live — ส่งตรงไป overlay ผ่าน broadcast
            </p>
          </div>
          {matchId && (
            <div className="text-xs font-mono text-neutral-500">
              Match: <span className="text-cyan-300">{matchId.slice(0, 8)}</span>
            </div>
          )}
        </div>

        {/* Upload area */}
        <label className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-white/20 rounded-xl hover:border-pink-500/50 hover:bg-pink-500/5 cursor-pointer transition-all">
          <ImagePlus className="w-6 h-6 text-pink-400" />
          <span className="text-sm font-mono text-neutral-400">คลิกหรือลากรูปโลโก้มาวาง (PNG/SVG/JPG)</span>
          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </label>

        {/* Logo list */}
        {logos.length === 0 ? (
          <div className="text-center py-12 text-neutral-600 font-mono text-sm">
            ยังไม่มีโลโก้ — เพิ่มโลโก้ sponsor หรือโลโก้ caster ด้านบน
          </div>
        ) : (
          <div className="space-y-3">
            {logos.map(logo => (
              <div key={logo.id} className={`flex items-center gap-4 p-4 rounded-xl border ${logo.visible ? 'bg-white/5 border-white/10' : 'bg-black/40 border-white/5 opacity-60'}`}>
                <GripVertical className="w-4 h-4 text-neutral-600 flex-shrink-0" />

                {/* Preview */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo.dataUrl} alt={logo.name} className="w-12 h-12 object-contain rounded bg-white/10 p-1 flex-shrink-0" />

                {/* Controls */}
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={logo.name}
                    onChange={(e) => updateLogo(logo.id, { name: e.target.value })}
                    className="bg-transparent text-sm font-mono font-bold text-white outline-none border-b border-transparent focus:border-white/30 w-full"
                  />
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <select
                      value={logo.position}
                      onChange={(e) => updateLogo(logo.id, { position: e.target.value as OverlayPosition })}
                      className="bg-neutral-900 border border-white/10 rounded px-2 py-1 text-neutral-300"
                    >
                      {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <select
                      value={logo.showOn}
                      onChange={(e) => updateLogo(logo.id, { showOn: e.target.value as ShowOn })}
                      className="bg-neutral-900 border border-white/10 rounded px-2 py-1 text-neutral-300"
                    >
                      {SHOW_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <label className="flex items-center gap-1 text-neutral-400">
                      Scale:
                      <input
                        type="range"
                        min={0.3}
                        max={2}
                        step={0.1}
                        value={logo.scale}
                        onChange={(e) => updateLogo(logo.id, { scale: parseFloat(e.target.value) })}
                        className="w-16"
                      />
                      <span className="w-6 text-right">{logo.scale.toFixed(1)}</span>
                    </label>
                  </div>
                </div>

                {/* Toggle & Delete */}
                <button onClick={() => updateLogo(logo.id, { visible: !logo.visible })} className="p-2 rounded hover:bg-white/10">
                  {logo.visible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-neutral-500" />}
                </button>
                <button onClick={() => removeLogo(logo.id)} className="p-2 rounded hover:bg-red-500/20">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Status */}
        <div className="text-[10px] font-mono text-neutral-600 text-center">
          {logos.filter(l => l.visible).length} โลโก้กำลังแสดง • broadcast channel: match:{matchId.slice(0, 8)}:overlay
        </div>
      </div>
    </div>
  );
}
