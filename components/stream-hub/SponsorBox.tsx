'use client';

// กล่องรูปสปอนเซอร์หมุนวนพร้อมทรานซิชั่น — ใช้ทั้งในฉาก Starting Soon (5.3) และพรีวิวในหน้า sponsor-overlay
// วาด 2 ชั้น: รูปก่อนหน้า (เล่นท่าออก) กับรูปปัจจุบัน (เล่นท่าเข้า) — key ใหม่ทุกครั้งที่เปลี่ยนรูปเพื่อให้ animation เล่นซ้ำ
import React, { useEffect, useState } from 'react';
import type { SponsorBoxImage, SponsorBoxSettings, SponsorTransition } from '@/lib/stream-hub/sponsor-box';

const KEYFRAMES = `
@keyframes sbx-fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes sbx-fade-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes sbx-slide-lr-in { from { transform: translateX(-100%) } to { transform: translateX(0) } }
@keyframes sbx-slide-lr-out { from { transform: translateX(0) } to { transform: translateX(100%) } }
@keyframes sbx-slide-rl-in { from { transform: translateX(100%) } to { transform: translateX(0) } }
@keyframes sbx-slide-rl-out { from { transform: translateX(0) } to { transform: translateX(-100%) } }
@keyframes sbx-flip3d-in { from { transform: rotateY(-90deg) } to { transform: rotateY(0) } }
@keyframes sbx-flip3d-out { from { transform: rotateY(0) } to { transform: rotateY(90deg) } }
@keyframes sbx-zoom-in { from { opacity: 0; transform: scale(1.25) } to { opacity: 1; transform: scale(1) } }
@keyframes sbx-zoom-out { from { opacity: 1; transform: scale(1) } to { opacity: 0; transform: scale(0.8) } }
`;

function layerStyle(transition: SponsorTransition, speedSec: number, phase: 'in' | 'out'): React.CSSProperties {
  // 3D พลิก: ครึ่งแรกรูปเก่าพลิกออก ครึ่งหลังรูปใหม่พลิกเข้า (ไม่ซ้อนกันกลางทาง)
  const half = transition === 'flip3d';
  const duration = half ? speedSec / 2 : speedSec;
  return {
    animationName: `sbx-${transition}-${phase}`,
    animationDuration: `${duration}s`,
    animationDelay: half && phase === 'in' ? `${duration}s` : '0s',
    animationTimingFunction: 'ease-in-out',
    animationFillMode: 'both',
    backfaceVisibility: 'hidden',
  };
}

export function SponsorBox({
  images,
  settings,
  width,
  height,
  className = '',
}: {
  images: SponsorBoxImage[];
  settings: SponsorBoxSettings;
  width: number;
  height: number;
  className?: string;
}) {
  const [slot, setSlot] = useState({ cur: 0, prev: -1, tick: 0 });
  const count = images.length;

  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => {
      setSlot((s) => ({ prev: s.cur % count, cur: (s.cur + 1) % count, tick: s.tick + 1 }));
    }, settings.durationSec * 1000);
    return () => clearInterval(t);
  }, [count, settings.durationSec]);

  if (!settings.enabled || count === 0) return null;

  const cur = images[slot.cur % count];
  const prev = slot.prev >= 0 && count > 1 ? images[slot.prev % count] : null;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width, height, perspective: '900px' }}
    >
      <style>{KEYFRAMES}</style>
      {prev && prev.id !== cur.id && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`out-${slot.tick}`}
          src={prev.dataUrl}
          alt={prev.name}
          className="absolute inset-0 h-full w-full object-contain"
          style={layerStyle(settings.transition, settings.speedSec, 'out')}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`in-${slot.tick}`}
        src={cur.dataUrl}
        alt={cur.name}
        className="absolute inset-0 h-full w-full object-contain"
        style={slot.tick === 0 ? undefined : layerStyle(settings.transition, settings.speedSec, 'in')}
      />
    </div>
  );
}
