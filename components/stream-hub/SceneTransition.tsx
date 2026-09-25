'use client';

import React, { useEffect, useRef } from 'react';
import { EMBLEM_SRC } from './ZodiacEmblem3D';

// ทรานซิชั่นเปลี่ยนฉาก: เฟดดำเร็ว → โลโก้หมุนแล้วขยายจนบังจอ → (เปลี่ยนฉากตอนบังมิด) → เปิดฉากใหม่
// playId เปลี่ยนเมื่อไหร่ = เล่น 1 รอบ / onCovered ถูกเรียกตอนจอถูกบังมิด (สลับฉากตรงนี้)

export const TRANSITION_MS = 1100;
const COVER_AT = 0.5; // สัดส่วนเวลาที่จอมิดสนิท

export function SceneTransition({ playId, onCovered }: { playId: number; onCovered: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const coveredRef = useRef(onCovered);
  useEffect(() => { coveredRef.current = onCovered; }, [onCovered]);

  useEffect(() => {
    if (!playId) return;
    const root = rootRef.current, shade = shadeRef.current, logo = logoRef.current;
    if (!root || !shade || !logo) return;
    root.style.visibility = 'visible';
    const opts = { duration: TRANSITION_MS, easing: 'linear', fill: 'forwards' as const };
    const a1 = shade.animate([
      { opacity: 0, offset: 0 },
      { opacity: 1, offset: 0.14 },
      { opacity: 1, offset: 0.62 },
      { opacity: 0, offset: 1 },
    ], opts);
    const a2 = logo.animate([
      { transform: 'perspective(1400px) rotateY(0deg) scale(0.25)', opacity: 0, offset: 0, easing: 'cubic-bezier(.5,0,.8,.4)' },
      { transform: 'perspective(1400px) rotateY(180deg) scale(0.8)', opacity: 1, offset: 0.2, easing: 'cubic-bezier(.6,0,.9,.5)' },
      { transform: 'perspective(1400px) rotateY(540deg) scale(9)', opacity: 1, offset: COVER_AT },
      { transform: 'perspective(1400px) rotateY(560deg) scale(12)', opacity: 0, offset: 0.72 },
      { transform: 'perspective(1400px) rotateY(560deg) scale(12)', opacity: 0, offset: 1 },
    ], opts);
    const t = window.setTimeout(() => coveredRef.current(), TRANSITION_MS * COVER_AT);
    a1.onfinish = () => { root.style.visibility = 'hidden'; };
    return () => { window.clearTimeout(t); a1.cancel(); a2.cancel(); root.style.visibility = 'hidden'; };
  }, [playId]);

  return (
    <div ref={rootRef} className="absolute inset-0 z-[90] pointer-events-none flex items-center justify-center overflow-hidden" style={{ visibility: 'hidden' }}>
      <div ref={shadeRef} className="absolute inset-0" style={{ opacity: 0, background: 'radial-gradient(circle at center, #0b0f22 0%, #000 70%)' }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={logoRef} src={EMBLEM_SRC} alt="" className="relative w-[26%] h-auto" style={{ opacity: 0, filter: 'drop-shadow(0 0 30px rgba(120,160,255,0.5)) drop-shadow(0 0 30px rgba(255,80,50,0.4))' }} />
    </div>
  );
}
