'use client';

// แผงตั้งค่ากล่องรูปสปอนเซอร์ (5.3 ในฉาก Starting Soon ของ Stream Hub)
// อัปโหลดรูป → ย่อให้พอดีกล่อง → ส่งผ่าน Realtime (ช่อง match-realtime-{matchId}) + เก็บสำเนาในเครื่องนี้
// Stream Hub ขอข้อมูลทั้งหมดตอนเพิ่งเปิด (sponsor_box_request) — แผงนี้ต้องเปิดค้างไว้ หรือ Stream Hub ใช้สำเนาที่เคยได้
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import { SponsorBox } from './SponsorBox';
import {
  CONTROLLER_STORAGE_KEY,
  DEFAULT_SPONSOR_BOX_SETTINGS,
  SPONSOR_BOX_EVENTS,
  SPONSOR_BOX_SIZE,
  SPONSOR_TRANSITIONS,
  loadSnapshot,
  resizeImageForBox,
  saveSnapshot,
  type SponsorBoxImage,
  type SponsorBoxSettings,
} from '@/lib/stream-hub/sponsor-box';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yjygevsdfebdyzywbpdr.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Y3j6k9biGK8YsBiHkaibkw_IcAFbWQj';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function SponsorBoxController({ matchId }: { matchId: string }) {
  const [settings, setSettings] = useState<SponsorBoxSettings>(DEFAULT_SPONSOR_BOX_SETTINGS);
  const [images, setImages] = useState<SponsorBoxImage[]>([]);
  const [linked, setLinked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const loadedRef = useRef(false);
  // ค่าล่าสุดสำหรับตอบคำขอจาก Stream Hub (callback ของช่องถูกผูกครั้งเดียว)
  const latestRef = useRef({ settings, images });
  useEffect(() => {
    latestRef.current = { settings, images };
    if (loadedRef.current) saveSnapshot(CONTROLLER_STORAGE_KEY, { settings, images });
  }, [settings, images]);

  const sendState = useCallback((s: SponsorBoxSettings, imgs: SponsorBoxImage[]) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: SPONSOR_BOX_EVENTS.state,
      payload: { settings: s, order: imgs.map((i) => i.id) },
    });
  }, []);

  const sendImage = useCallback((img: SponsorBoxImage) => {
    channelRef.current?.send({ type: 'broadcast', event: SPONSOR_BOX_EVENTS.image, payload: img });
  }, []);

  const sendAll = useCallback(() => {
    const { settings: s, images: imgs } = latestRef.current;
    imgs.forEach(sendImage);
    sendState(s, imgs);
  }, [sendImage, sendState]);

  useEffect(() => {
    if (!matchId) return;
    const ch = supabase
      .channel(`match-realtime-${matchId}`)
      .on('broadcast', { event: SPONSOR_BOX_EVENTS.request }, () => sendAll());
    channelRef.current = ch;
    ch.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      if (!loadedRef.current) {
        loadedRef.current = true;
        const snap = loadSnapshot(CONTROLLER_STORAGE_KEY);
        if (snap) {
          latestRef.current = snap;
          setSettings(snap.settings);
          setImages(snap.images);
        }
      }
      setLinked(true);
      sendAll();
    });
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [matchId, sendAll]);

  const updateSettings = (patch: Partial<SponsorBoxSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    sendState(next, images);
  };

  const updateImages = (next: SponsorBoxImage[]) => {
    setImages(next);
    sendState(settings, next);
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    setError(null);
    const added: SponsorBoxImage[] = [];
    for (const file of files) {
      try {
        const dataUrl = await resizeImageForBox(file);
        const img = { id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, ''), dataUrl };
        added.push(img);
        sendImage(img);
      } catch (err) {
        setError(err instanceof Error ? `${file.name}: ${err.message}` : `${file.name}: อัปโหลดไม่ได้`);
      }
    }
    setBusy(false);
    if (added.length) updateImages([...images, ...added]);
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    updateImages(next);
  };

  return (
    <section className="rounded-xl border border-pink-500/25 bg-white/[0.03] p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-mono text-sm font-black uppercase text-pink-300">Sponsor Box — กล่องรูปหมุนวน (Starting Soon)</h2>
          <p className="mt-1 font-mono text-[11px] text-neutral-500">
            ขนาดล็อก {SPONSOR_BOX_SIZE.w}×{SPONSOR_BOX_SIZE.h} px ในเฟรม 1920×1080 · ใส่รูปแล้วหมุนวนพร้อมทรานซิชั่นอัตโนมัติ
          </p>
        </div>
        <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${linked ? 'border-emerald-500/40 text-emerald-300' : 'border-white/10 text-neutral-500'}`}>
          {!matchId ? 'ไม่มี matchId ในลิงก์' : linked ? '● เชื่อม Stream Hub แล้ว' : '○ กำลังเชื่อม...'}
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-[auto_1fr]">
        {/* พรีวิวขนาดจริง */}
        <div className="space-y-2">
          <div
            className="flex items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/60"
            style={{ width: SPONSOR_BOX_SIZE.w, height: SPONSOR_BOX_SIZE.h }}
          >
            {images.length ? (
              <SponsorBox images={images} settings={{ ...settings, enabled: true }} width={SPONSOR_BOX_SIZE.w} height={SPONSOR_BOX_SIZE.h} />
            ) : (
              <span className="font-mono text-[11px] text-neutral-600">ยังไม่มีรูป</span>
            )}
          </div>
          <label className="flex items-center gap-2 font-mono text-[11px] text-neutral-300">
            <input type="checkbox" checked={settings.enabled} onChange={(e) => updateSettings({ enabled: e.target.checked })} />
            แสดงบน Stream Hub
          </label>
        </div>

        {/* ตั้งค่า */}
        <div className="space-y-4 font-mono text-xs">
          <div>
            <div className="mb-1.5 text-[11px] text-neutral-400">ทรานซิชั่น</div>
            <div className="flex flex-wrap gap-1.5">
              {SPONSOR_TRANSITIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => updateSettings({ transition: t.value })}
                  className={`rounded border px-2.5 py-1 text-[11px] font-bold ${
                    settings.transition === t.value ? 'border-pink-400 bg-pink-500/15 text-pink-200' : 'border-white/10 text-neutral-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <div className="mb-1 flex justify-between text-[11px] text-neutral-400">
              <span>เวลาโชว์ต่อ 1 รูป</span>
              <span className="text-white">{settings.durationSec} วิ</span>
            </div>
            <input
              type="range"
              min={2}
              max={30}
              step={1}
              value={settings.durationSec}
              onChange={(e) => updateSettings({ durationSec: Number(e.target.value) })}
              className="w-full accent-pink-400"
            />
          </label>

          <label className="block">
            <div className="mb-1 flex justify-between text-[11px] text-neutral-400">
              <span>ความเร็วทรานซิชั่น</span>
              <span className="text-white">{settings.speedSec.toFixed(1)} วิ</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={3}
              step={0.1}
              value={settings.speedSec}
              onChange={(e) => updateSettings({ speedSec: Number(e.target.value) })}
              className="w-full accent-pink-400"
            />
          </label>
        </div>
      </div>

      {/* รูปทั้งหมด */}
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/20 p-4 transition-all hover:border-pink-500/50 hover:bg-pink-500/5">
          <ImagePlus className="h-5 w-5 text-pink-400" />
          <span className="font-mono text-xs text-neutral-400">{busy ? 'กำลังย่อรูป...' : 'เพิ่มรูปสปอนเซอร์ (เลือกได้หลายรูป)'}</span>
          <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" disabled={busy} />
        </label>
        {error && <p className="font-mono text-[11px] text-rose-300">{error}</p>}
        {images.map((img, i) => (
          <div key={img.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2">
            <span className="w-5 text-center font-mono text-[11px] text-neutral-500">{i + 1}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.dataUrl} alt={img.name} className="h-10 w-[71px] rounded bg-black/40 object-contain" />
            <span className="flex-1 truncate font-mono text-xs text-neutral-200">{img.name}</span>
            <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-30" aria-label="เลื่อนขึ้น">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => move(i, 1)} disabled={i === images.length - 1} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-30" aria-label="เลื่อนลง">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => updateImages(images.filter((x) => x.id !== img.id))} className="rounded p-1.5 hover:bg-red-500/20" aria-label="ลบ">
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
