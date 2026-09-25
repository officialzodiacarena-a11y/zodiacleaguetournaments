'use client';

import React, { useEffect, useRef } from 'react';

// พื้นหลังอวกาศ "น้ำแข็ง vs ไฟ" — ซ้ายฟ้า (เกล็ดน้ำแข็งลอยลง) / ขวาแดง (ถ่านไฟลอยขึ้น)
// วาดด้วย Canvas 2D ที่ความละเอียดเฟรมจริง 1920×1080 แล้วยืดตาม container

const FW = 1920, FH = 1080;

type Star = { x: number; y: number; r: number; tw: number; ph: number };
type Mote = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; ice: boolean; rot: number };

export function IceFireSpaceBackground({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = FW; canvas.height = FH;

    const stars: Star[] = Array.from({ length: 420 }, () => ({
      x: Math.random() * FW, y: Math.random() * FH, r: Math.random() * 1.4 + 0.3, tw: 0.8 + Math.random() * 2.2, ph: Math.random() * 6.28,
    }));
    const spawn = (ice: boolean, anywhere: boolean): Mote => {
      const x = ice ? Math.random() * FW * 0.5 : FW * 0.5 + Math.random() * FW * 0.5;
      const max = 4 + Math.random() * 6;
      return {
        x, y: anywhere ? Math.random() * FH : ice ? -20 : FH + 20,
        vx: (Math.random() - 0.5) * 12, vy: ice ? 18 + Math.random() * 30 : -(30 + Math.random() * 60),
        r: ice ? 2 + Math.random() * 4 : 1.2 + Math.random() * 2.6, life: anywhere ? Math.random() * max : 0, max, ice, rot: Math.random() * 6.28,
      };
    };
    const motes: Mote[] = [...Array.from({ length: 110 }, () => spawn(true, true)), ...Array.from({ length: 150 }, () => spawn(false, true))];

    // static nebula layer (drawn once)
    const neb = document.createElement('canvas'); neb.width = FW; neb.height = FH;
    {
      const n = neb.getContext('2d')!;
      n.fillStyle = '#03040a'; n.fillRect(0, 0, FW, FH);
      const blob = (x: number, y: number, r: number, c: string) => {
        const g = n.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
        n.fillStyle = g; n.fillRect(0, 0, FW, FH);
      };
      n.globalCompositeOperation = 'lighter';
      blob(260, 380, 760, 'rgba(30,90,255,0.42)'); blob(520, 820, 520, 'rgba(0,190,255,0.22)'); blob(120, 120, 420, 'rgba(120,170,255,0.18)');
      blob(1660, 380, 760, 'rgba(255,40,20,0.42)'); blob(1400, 840, 520, 'rgba(255,120,0,0.24)'); blob(1800, 120, 420, 'rgba(255,60,90,0.18)');
      // bright clash seam in the middle
      const seam = n.createLinearGradient(FW / 2 - 140, 0, FW / 2 + 140, 0);
      seam.addColorStop(0, 'rgba(0,0,0,0)'); seam.addColorStop(0.45, 'rgba(120,160,255,0.10)'); seam.addColorStop(0.55, 'rgba(255,120,80,0.10)'); seam.addColorStop(1, 'rgba(0,0,0,0)');
      n.fillStyle = seam; n.fillRect(0, 0, FW, FH);
    }

    let raf = 0, last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = now / 1000;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(neb, 0, 0);
      // slow breathing of each side
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.18 + 0.1 * Math.sin(t * 0.7);
      const gl = ctx.createRadialGradient(360, 540, 0, 360, 540, 700); gl.addColorStop(0, 'rgba(60,140,255,1)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, FW, FH);
      ctx.globalAlpha = 0.18 + 0.1 * Math.sin(t * 0.7 + 3.14);
      const gr = ctx.createRadialGradient(1560, 540, 0, 1560, 540, 700); gr.addColorStop(0, 'rgba(255,60,30,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, FW, FH);
      ctx.globalAlpha = 1;

      for (const s of stars) {
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.tw + s.ph));
        ctx.fillStyle = s.x < FW / 2 ? `rgba(200,225,255,${a})` : `rgba(255,220,200,${a})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
        if (s.r > 1.45 && a > 0.9) { // twinkle cross
          ctx.fillRect(s.x - 5, s.y - 0.4, 10, 0.8); ctx.fillRect(s.x - 0.4, s.y - 5, 0.8, 10);
        }
      }

      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.life += dt; m.x += (m.vx + Math.sin(t + i) * 8) * dt; m.y += m.vy * dt; m.rot += dt * (m.ice ? 0.6 : 0);
        if (m.life > m.max || m.y < -30 || m.y > FH + 30) { motes[i] = spawn(m.ice, false); continue; }
        const fade = Math.min(1, m.life / 0.8, (m.max - m.life) / 1.2);
        if (m.ice) {
          ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.rot);
          ctx.strokeStyle = `rgba(170,215,255,${0.75 * fade})`; ctx.lineWidth = 1;
          ctx.beginPath();
          for (let k = 0; k < 3; k++) { const a = (k * Math.PI) / 3; ctx.moveTo(Math.cos(a) * -m.r, Math.sin(a) * -m.r); ctx.lineTo(Math.cos(a) * m.r, Math.sin(a) * m.r); }
          ctx.stroke(); ctx.restore();
          ctx.fillStyle = `rgba(120,190,255,${0.25 * fade})`; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 2.2, 0, 6.283); ctx.fill();
        } else {
          const heat = 1 - m.life / m.max;
          ctx.fillStyle = `rgba(255,${Math.round(120 + 110 * heat)},${Math.round(40 * heat)},${0.9 * fade})`;
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.fill();
          ctx.fillStyle = `rgba(255,70,20,${0.22 * fade})`; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 3, 0, 6.283); ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className={className} style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden />;
}
