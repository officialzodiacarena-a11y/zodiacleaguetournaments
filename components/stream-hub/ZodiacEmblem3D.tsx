'use client';

import React, { useEffect, useRef } from 'react';
import type { Material, Mesh } from 'three';

// โลโก้ Zodiac League แบบ 3D ลอยอยู่กลางจอ (ฉาก 1. Starting Soon)
// ปั้นจากไฟล์ PNG พื้นใสของจริง: ภาพนูนโลหะ + แผ่นพิกเซลจริงด้านหลัง (เสี้ยวแหลมครบตามต้นฉบับ)
// ต้นฉบับแบบเปิดดูเดี่ยว ๆ อยู่ที่ /logo3d/index.html — แก้ตรงนี้ต้องแก้ที่นั่นให้ตรงกัน
// พื้นหลังใส (ไม่ใช้ bloom เพราะ post-processing ทำให้ alpha หาย) — วางซ้อนบนฉากได้เลย

export const EMBLEM_SRC = '/images/logo/ZodiacArena-alpha.png';

type Props = { size: number; className?: string; style?: React.CSSProperties };

export function ZodiacEmblem3D({ size, className, style }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let raf = 0;
    let cleanup = () => {};

    (async () => {
      const THREE = await import('three');
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
      const img = await new Promise<HTMLImageElement>((ok, fail) => {
        const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = EMBLEM_SRC;
      });
      if (disposed) return;

      // ---------- image analysis ----------
      const M = 1024;
      const c0 = document.createElement('canvas'); c0.width = c0.height = M;
      const x0 = c0.getContext('2d', { willReadFrequently: true })!;
      x0.drawImage(img, 0, 0, M, M);
      const px = x0.getImageData(0, 0, M, M).data;

      const L = new Float32Array(M * M);
      const mask = new Float32Array(M * M);
      for (let i = 0; i < M * M; i++) {
        L[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
        mask[i] = px[i * 4 + 3] > 127 ? 1 : 0;
      }
      const boxH = (a: Float32Array, o: Float32Array, r: number) => {
        const d = 2 * r + 1;
        for (let y = 0; y < M; y++) {
          const row = y * M; let s = 0;
          for (let k = -r; k <= r; k++) s += a[row + Math.min(M - 1, Math.max(0, k))];
          for (let x = 0; x < M; x++) { o[row + x] = s / d; s += a[row + Math.min(M - 1, x + r + 1)] - a[row + Math.max(0, x - r)]; }
        }
      };
      const boxV = (a: Float32Array, o: Float32Array, r: number) => {
        const d = 2 * r + 1;
        for (let x = 0; x < M; x++) {
          let s = 0;
          for (let k = -r; k <= r; k++) s += a[Math.min(M - 1, Math.max(0, k)) * M + x];
          for (let y = 0; y < M; y++) { o[y * M + x] = s / d; s += a[Math.min(M - 1, y + r + 1) * M + x] - a[Math.max(0, y - r) * M + x]; }
        }
      };
      const blur = (src: Float32Array, r: number, passes: number) => {
        const a = new Float32Array(src), b = new Float32Array(src.length);
        for (let p = 0; p < passes; p++) { boxH(a, b, r); boxV(b, a, r); }
        return a;
      };
      const smooth = (e0: number, e1: number, v: number) => { const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

      const bm = blur(mask, 5, 3);
      const LB = blur(L, 7, 3), LS = blur(L, 1, 1);
      const depth = new Float32Array(M * M);
      let dMax = 0;
      for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) {
        const i = y * M + x, u = x / M, v = y / M;
        const edge = smooth(0.5, 0.64, bm[i]);
        const core = Math.exp(-((u - 0.5) ** 2 + (v - 0.42) ** 2) / (2 * 0.17 ** 2));
        const d = edge * (0.28 + 0.5 * LB[i] + 0.22 * LS[i] + 0.45 * core * LB[i]);
        depth[i] = d; if (d > dMax) dMax = d;
      }
      for (let i = 0; i < M * M; i++) depth[i] /= dMax;

      const toTexture = (fill: (d: Uint8ClampedArray) => void, srgb = false) => {
        const c = document.createElement('canvas'); c.width = c.height = M;
        const x = c.getContext('2d')!; const id = x.createImageData(M, M);
        fill(id.data); x.putImageData(id, 0, 0);
        const t = new THREE.CanvasTexture(c);
        if (srgb) t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        return t;
      };
      const alphaTex = toTexture(d => { for (let i = 0; i < M * M; i++) { const a = Math.round(bm[i] * 255); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = a; d[i * 4 + 3] = 255; } });
      const cardAlpha = toTexture(d => { for (let i = 0; i < M * M; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = px[i * 4 + 3]; d[i * 4 + 3] = 255; } });
      const mrTex = toTexture(d => {
        for (let i = 0; i < M * M; i++) {
          const metal = Math.min(1, Math.max(0, LB[i] * 1.9 - 0.08));
          d[i * 4] = 0; d[i * 4 + 1] = Math.round((0.62 - 0.4 * metal) * 255); d[i * 4 + 2] = Math.round((0.35 + 0.65 * metal) * 255); d[i * 4 + 3] = 255;
        }
      });
      const H = blur(L, 1, 1);
      const normalTex = toTexture(d => {
        const s = 4.6;
        for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) {
          const i = y * M + x;
          const dx = (H[y * M + Math.min(M - 1, x + 1)] - H[y * M + Math.max(0, x - 1)]) * 0.5;
          const dv = (H[Math.max(0, y - 1) * M + x] - H[Math.min(M - 1, y + 1) * M + x]) * 0.5;
          let nx = -dx * s, ny = -dv * s, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
          d[i * 4] = (nx * 0.5 + 0.5) * 255; d[i * 4 + 1] = (ny * 0.5 + 0.5) * 255; d[i * 4 + 2] = (nz * 0.5 + 0.5) * 255; d[i * 4 + 3] = 255;
        }
      });
      const logoTex = (() => {
        const ch = [0, 1, 2].map(c => { const a = new Float32Array(M * M); for (let i = 0; i < M * M; i++) a[i] = px[i * 4 + c]; return a; });
        const soft = ch.map(a => blur(a, 2, 2));
        return toTexture(d => {
          for (let i = 0; i < M * M; i++) { for (let c = 0; c < 3; c++) d[i * 4 + c] = ch[c][i] + 0.7 * (ch[c][i] - soft[c][i]); d[i * 4 + 3] = 255; }
        }, true);
      })();
      if (disposed) return;

      // ---------- scene ----------
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(size, size);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      scene.environmentIntensity = 0.6;

      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(0, 0, 11);

      const W = 6, SEG = 512;
      const relief = (scale: number) => {
        const geo = new THREE.PlaneGeometry(W, W, SEG, SEG);
        const pos = geo.attributes.position, uv = geo.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
          const fx = uv.getX(i) * (M - 1), fy = (1 - uv.getY(i)) * (M - 1);
          const xa = Math.floor(fx), ya = Math.floor(fy), xb = Math.min(M - 1, xa + 1), yb = Math.min(M - 1, ya + 1);
          const tx = fx - xa, ty = fy - ya;
          const dd = (depth[ya * M + xa] * (1 - tx) + depth[ya * M + xb] * tx) * (1 - ty) + (depth[yb * M + xa] * (1 - tx) + depth[yb * M + xb] * tx) * ty;
          pos.setZ(i, dd * scale);
        }
        geo.computeVertexNormals();
        return geo;
      };

      const emblem = new THREE.Group();
      scene.add(emblem);
      const front = new THREE.Mesh(relief(0.62), new THREE.MeshStandardMaterial({
        map: logoTex, normalMap: normalTex, normalScale: new THREE.Vector2(1.5, 1.5),
        roughnessMap: mrTex, metalnessMap: mrTex, roughness: 1, metalness: 1,
        alphaMap: alphaTex, alphaTest: 0.5,
        emissiveMap: logoTex, emissive: 0xffffff, emissiveIntensity: 0.15, envMapIntensity: 1.0,
      }));
      const back = new THREE.Mesh(relief(-0.22), new THREE.MeshStandardMaterial({
        color: 0x1a1d24, normalMap: normalTex, roughness: 0.42, metalness: 0.92,
        alphaMap: alphaTex, alphaTest: 0.5, side: THREE.BackSide,
      }));
      const card = new THREE.Mesh(new THREE.PlaneGeometry(W, W), new THREE.MeshBasicMaterial({
        map: logoTex, alphaMap: cardAlpha, transparent: true, depthWrite: false,
      }));
      card.position.z = -0.01; card.renderOrder = -1;
      emblem.add(front, back, card);

      // sparks (normal blending so they survive the transparent canvas)
      const dotCanvas = document.createElement('canvas'); dotCanvas.width = dotCanvas.height = 64;
      {
        const x = dotCanvas.getContext('2d')!; const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      }
      const dot = new THREE.CanvasTexture(dotCanvas);
      const SPARKS = 260;
      const sPos = new Float32Array(SPARKS * 3), sCol = new Float32Array(SPARKS * 3), sVel = new Float32Array(SPARKS);
      const blue = new THREE.Color(0x5b8dff), red = new THREE.Color(0xff4a3a), gold = new THREE.Color(0xffd27a), tmp = new THREE.Color();
      const resetSpark = (i: number, anywhere: boolean) => {
        const x = (Math.random() * 2 - 1) * 3.4;
        sPos[i * 3] = x; sPos[i * 3 + 1] = anywhere ? (Math.random() * 2 - 1) * 3.3 : -3.3; sPos[i * 3 + 2] = (Math.random() * 2 - 1) * 1.5;
        sVel[i] = 0.12 + Math.random() * 0.45;
        tmp.copy(x < -1.1 ? blue : x > 1.1 ? red : gold).multiplyScalar(0.7 + Math.random() * 0.6);
        sCol[i * 3] = tmp.r; sCol[i * 3 + 1] = tmp.g; sCol[i * 3 + 2] = tmp.b;
      };
      for (let i = 0; i < SPARKS; i++) resetSpark(i, true);
      const sGeo = new THREE.BufferGeometry();
      sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
      sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
      const sparks = new THREE.Points(sGeo, new THREE.PointsMaterial({ size: 0.07, map: dot, vertexColors: true, transparent: true, depthWrite: false }));
      scene.add(sparks);

      scene.add(new THREE.AmbientLight(0x404660, 0.35));
      const key = new THREE.DirectionalLight(0xfff0d6, 1.5); key.position.set(2, 4, 6); scene.add(key);
      const rimL = new THREE.PointLight(0x3d7bff, 50); rimL.position.set(-5, 0.8, 2.5); scene.add(rimL);
      const rimR = new THREE.PointLight(0xff3326, 50); rimR.position.set(5, -0.2, 2.5); scene.add(rimR);
      const sweep = new THREE.PointLight(0xffffff, 0); sweep.position.set(-7, 1.5, 4); scene.add(sweep);

      const clock = new THREE.Clock();
      const INTRO = 2.6, SWEEP_EVERY = 7;
      const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
      const easeOutBack = (t: number) => 1 + 2.5 * (t - 1) ** 3 + 1.5 * (t - 1) ** 2;
      let lastT = 0;
      const frame = () => {
        const t = clock.getElapsedTime(), dt = Math.min(t - lastT, 0.05); lastT = t;
        const p = Math.min(1, t / INTRO);
        const intro = 1 - easeOutCubic(p);
        emblem.scale.setScalar(0.35 + 0.65 * easeOutBack(p));
        emblem.rotation.y = -Math.PI * 1.15 * intro + 0.22 * Math.sin(t * 0.35);
        emblem.rotation.x = 0.06 * Math.sin(t * 0.5);
        emblem.position.y = 0.09 * Math.sin(t * 0.9);

        const since = t - INTRO + 0.4;
        const phase = since < 0 ? -1 : (since % SWEEP_EVERY) / 1.6;
        if (phase >= 0 && phase <= 1) { sweep.position.x = -7 + 14 * phase; sweep.intensity = 160 * Math.sin(Math.PI * phase); }
        else sweep.intensity = 0;
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.3);
        rimL.intensity = 40 + 25 * pulse; rimR.intensity = 40 + 25 * (1 - pulse);

        for (let i = 0; i < SPARKS; i++) {
          sPos[i * 3 + 1] += sVel[i] * dt;
          sPos[i * 3] += Math.sin(t * 1.3 + i) * 0.002;
          if (sPos[i * 3 + 1] > 3.3) resetSpark(i, false);
        }
        sGeo.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      };
      frame();

      cleanup = () => {
        cancelAnimationFrame(raf);
        scene.traverse(o => {
          const m = o as Mesh;
          m.geometry?.dispose();
          const mat = m.material as Material | Material[] | undefined;
          (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach(x => x.dispose());
        });
        [alphaTex, cardAlpha, mrTex, normalTex, logoTex, dot, envTex].forEach(tx => tx.dispose());
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
      if (disposed) cleanup();
    })().catch(err => console.error('[ZodiacEmblem3D]', err));

    return () => { disposed = true; cleanup(); };
  }, [size]);

  return <div ref={hostRef} className={className} style={{ width: size, height: size, ...style }} aria-label="Zodiac League" role="img" />;
}
