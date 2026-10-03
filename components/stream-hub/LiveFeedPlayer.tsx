'use client';

// ตัวเล่นภาพจาก Live Source — ลิงก์เว็บ (A/B) เล่นผ่าน iframe, HLS (C) เล่นผ่าน <video> + hls.js
// hls.js โหลดแบบ dynamic import เฉพาะตอนใช้โหมด C (Chrome / OBS เปิด .m3u8 เองไม่ได้ ยกเว้น Safari)
import React, { useEffect, useRef, useState } from 'react';
import { parseExternalEmbedUrl, type LiveSource } from '@/lib/stream-hub/live-source';

export function LiveFeedPlayer({
  source,
  className = '',
  muted = false,
  volume,
}: {
  source: LiveSource;
  className?: string;
  /** พรีวิวในห้องคุม หรือ Overlay — ปิดเสียง หรือกำหนดระดับเสียง */
  muted?: boolean;
  volume?: number;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMuted = muted || Boolean(source.muted);
  const currentVolume = typeof volume === 'number' ? volume : (source.volume ?? 100);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = Math.max(0, Math.min(1, currentVolume / 100));
    }
  }, [isMuted, currentVolume]);

  useEffect(() => {
    if (source.mode !== 'C') return;
    const video = videoRef.current;
    if (!video) return;
    let destroyed = false;
    let cleanup: (() => void) | null = null;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source.url;
      return;
    }
    void import('hls.js').then(({ default: Hls }) => {
      if (destroyed) return;
      if (!Hls.isSupported()) {
        setError('เบราว์เซอร์นี้เล่น HLS ไม่ได้');
        return;
      }
      const hls = new Hls({ liveDurationInfinity: true });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setError(`เล่นสตรีมไม่ได้ (${data.details}) — เช็คลิงก์ .m3u8 / เซิร์ฟเวอร์แปลงสัญญาณ`);
      });
      hls.loadSource(source.url);
      hls.attachMedia(video);
      cleanup = () => hls.destroy();
    });
    return () => {
      destroyed = true;
      cleanup?.();
    };
  }, [source.mode, source.url]);

  if (source.mode === 'OFF' || !source.url) return null;
  if (source.video_visible === false) return null;

  if (source.mode === 'C') {
    return (
      <div className={`relative bg-black ${className}`}>
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-contain" autoPlay playsInline muted={isMuted} controls={false} />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center font-mono text-xs text-rose-300">{error}</div>
        )}
      </div>
    );
  }

  const parsed = parseExternalEmbedUrl(source.url).embedUrl;
  // YouTube: สลับ mute=0 เป็น mute=1 / Twitch, Kick: ต่อ &muted=true
  const embedUrl =
    parsed && isMuted
      ? parsed.includes('mute=0')
        ? parsed.replace('mute=0', 'mute=1')
        : `${parsed}${parsed.includes('?') ? '&' : '?'}muted=true`
      : parsed;
  return (
    <div className={`relative bg-black ${className}`}>
      {embedUrl && (
        <iframe
          key={`${embedUrl}:${isMuted}`}
          src={embedUrl}
          title="Live Source"
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
}
