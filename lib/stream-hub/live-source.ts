// lib/stream-hub/live-source.ts
// แหล่งภาพถ่ายทอดสดของหน้า Stream Hub — เก็บใน matches.format_config.live_source (ไม่ต้องสร้างตารางใหม่)
//   OFF : ปกติ — ภาพเกมมาจาก OBS, ระบบข้อมูลในเกม (HP / Buy Phase / OCR) ทำงานครบ
//   A   : แปะคลิป/ไลฟ์จากเว็บ (YouTube / Twitch / Kick / ลิงก์ embed อื่น) โชว์ในกล่องวิดีโอของฉาก 1. Starting Soon
//   B   : ถ่ายทอดสดจากลิงก์เว็บภายนอก + HUD ของเรา — แท็บ 2 กลายเป็น "Live Feed" และปิดระบบข้อมูลในเกม
//   C   : Clean Feed แบบ HLS (.m3u8 จากเซิร์ฟเวอร์ที่แปลง RTMP แล้ว) + HUD ของเรา — ข้อแม้เดียวกับ B
// ข้อ C: เบราว์เซอร์/OBS เปิด RTMP ตรงๆ ไม่ได้ ต้องมีตัวแปลง RTMP → HLS (เช่น MediaMTX) ก่อน — รอคลาวด์ของทีม
export type LiveSourceMode = 'OFF' | 'A' | 'B' | 'C';

export interface LiveSource {
  mode: LiveSourceMode;
  url: string;
}

export const LIVE_SOURCE_OFF: LiveSource = { mode: 'OFF', url: '' };

export function readLiveSource(formatConfig: unknown): LiveSource {
  const raw = (formatConfig as { live_source?: Partial<LiveSource> } | null)?.live_source;
  const mode = raw?.mode;
  if ((mode === 'A' || mode === 'B' || mode === 'C') && typeof raw?.url === 'string' && raw.url.trim()) {
    return { mode, url: raw.url.trim() };
  }
  return LIVE_SOURCE_OFF;
}

/** โหมดที่ภาพไม่ได้มาจากเกมที่เรามีข้อมูล — ต้องปิดระบบที่อาศัยข้อมูลในเกม */
export function isExternalFeed(src: LiveSource): boolean {
  return src.mode === 'B' || src.mode === 'C';
}

// ดึงลิงก์ Embed จาก YouTube / Twitch / Kick (ลิงก์อื่นใช้ตามที่แปะมา)
export function parseExternalEmbedUrl(rawUrl: string | null | undefined): { embedUrl: string | null; platform: string } {
  if (!rawUrl) return { embedUrl: null, platform: 'NONE' };
  const trimmed = rawUrl.trim();

  // 1. YouTube (Video ID 11 หลัก หรือ URL)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return { embedUrl: `https://www.youtube-nocookie.com/embed/${trimmed}?autoplay=1&mute=0`, platform: 'YOUTUBE' };
  }
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return { embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&mute=0`, platform: 'YOUTUBE' };
  }

  // 2. Twitch Stream (twitch.tv/username)
  const twitchMatch = trimmed.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  if (twitchMatch && twitchMatch[1]) {
    const parentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return {
      embedUrl: `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${parentDomain}&autoplay=true`,
      platform: 'TWITCH',
    };
  }

  // 3. Kick Stream (kick.com/username)
  const kickMatch = trimmed.match(/kick\.com\/([a-zA-Z0-9_]+)/);
  if (kickMatch && kickMatch[1]) {
    return { embedUrl: `https://player.kick.com/${kickMatch[1]}?autoplay=true`, platform: 'KICK' };
  }

  return { embedUrl: trimmed, platform: 'CUSTOM' };
}
