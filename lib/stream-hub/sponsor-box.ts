// lib/stream-hub/sponsor-box.ts
// กล่องรูปสปอนเซอร์หมุนวน (ตำแหน่ง 5.3 ในฉาก 1. Starting Soon) — ตั้งค่าจากหน้า /stream-hub/sponsor-overlay
// ส่งผ่าน Realtime ช่อง match-realtime-{matchId} (ช่องเดียวกับ Stream Hub) และเก็บสำเนาไว้ใน localStorage ทั้งสองฝั่ง
// ยังไม่มี Storage bucket ในโปรเจกต์ (สร้างเองไม่ได้ — ต้องให้ทีมสร้างผ่าน dashboard) จึงส่งรูปเป็น data URL ที่ย่อขนาดแล้ว
export type SponsorTransition = 'fade' | 'slide-lr' | 'slide-rl' | 'flip3d' | 'zoom';

export interface SponsorBoxSettings {
  enabled: boolean;
  /** เวลาโชว์ต่อ 1 รูป (วินาที) */
  durationSec: number;
  transition: SponsorTransition;
  /** ความเร็วทรานซิชั่น (วินาที) */
  speedSec: number;
}

export interface SponsorBoxImage {
  id: string;
  name: string;
  dataUrl: string;
}

/** ขนาดกล่องล็อกตายตัวในเฟรม 1920×1080 ของ Stream Hub */
export const SPONSOR_BOX_SIZE = { w: 330, h: 186 } as const;

export const DEFAULT_SPONSOR_BOX_SETTINGS: SponsorBoxSettings = {
  enabled: true,
  durationSec: 6,
  transition: 'fade',
  speedSec: 0.8,
};

export const SPONSOR_TRANSITIONS: { value: SponsorTransition; label: string }[] = [
  { value: 'fade', label: 'Fade (จางเข้า)' },
  { value: 'slide-lr', label: 'Slide ซ้าย → ขวา' },
  { value: 'slide-rl', label: 'Slide ขวา → ซ้าย' },
  { value: 'flip3d', label: '3D หมุนพลิก' },
  { value: 'zoom', label: 'Zoom' },
];

// ชื่อ event ในช่อง match-realtime-{matchId}
export const SPONSOR_BOX_EVENTS = {
  state: 'sponsor_box_state', // { settings, order: string[] }
  image: 'sponsor_box_image', // { id, name, dataUrl }
  request: 'sponsor_box_request', // Stream Hub ขอข้อมูลทั้งหมด (ตอนเพิ่งเปิด)
} as const;

export function clampSettings(s: Partial<SponsorBoxSettings> | null | undefined): SponsorBoxSettings {
  const d = DEFAULT_SPONSOR_BOX_SETTINGS;
  const transition = SPONSOR_TRANSITIONS.some((t) => t.value === s?.transition) ? (s!.transition as SponsorTransition) : d.transition;
  return {
    enabled: typeof s?.enabled === 'boolean' ? s.enabled : d.enabled,
    durationSec: Math.min(60, Math.max(2, Number(s?.durationSec) || d.durationSec)),
    transition,
    speedSec: Math.min(3, Math.max(0.2, Number(s?.speedSec) || d.speedSec)),
  };
}

/** ย่อรูปให้พอดีกล่อง (2 เท่าเพื่อความคม) เป็น WebP — ให้ส่งผ่าน Realtime ได้และไม่เปลือง localStorage */
export function resizeImageForBox(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่ได้'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ไฟล์นี้ไม่ใช่รูปภาพ'));
      img.onload = () => {
        const maxW = SPONSOR_BOX_SIZE.w * 2;
        const maxH = SPONSOR_BOX_SIZE.h * 2;
        const scale = Math.min(1, maxW / img.width, maxH / img.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('ย่อรูปไม่ได้'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ---- localStorage (ห่อ try/catch ทุกครั้ง — OBS / โหมดส่วนตัว อาจใช้ไม่ได้) ----
export interface SponsorBoxSnapshot {
  settings: SponsorBoxSettings;
  images: SponsorBoxImage[];
}

export function loadSnapshot(key: string): SponsorBoxSnapshot | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SponsorBoxSnapshot>;
    return {
      settings: clampSettings(parsed.settings),
      images: Array.isArray(parsed.images) ? parsed.images.filter((i) => i && i.id && i.dataUrl) : [],
    };
  } catch {
    return null;
  }
}

export function saveSnapshot(key: string, snap: SponsorBoxSnapshot): void {
  try {
    localStorage.setItem(key, JSON.stringify(snap));
  } catch {
    // เต็ม / ใช้ไม่ได้ — ยังทำงานต่อได้ แค่รีเฟรชแล้วต้องส่งใหม่
  }
}

export const CONTROLLER_STORAGE_KEY = 'zodiac-sponsor-box-v1';
export const HUB_CACHE_KEY = 'zodiac-sponsor-box-cache-v1';
