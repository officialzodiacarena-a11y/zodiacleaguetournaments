// lib/stream-hub/live-source.ts
// แหล่งภาพถ่ายทอดสดของหน้า Stream Hub — เก็บใน matches.format_config.live_source (ไม่ต้องสร้างตารางใหม่)
//   OFF : ปกติ — ภาพเกมมาจาก OBS, ระบบข้อมูลในเกม (HP / Buy Phase / OCR) ทำงานครบ
//   A   : แปะคลิป/ไลฟ์จากเว็บ (YouTube / Twitch / Kick / ลิงก์ embed อื่น) โชว์ในกล่องวิดีโอของฉาก 1. Starting Soon
//   B   : ถ่ายทอดสดจากลิงก์เว็บภายนอก + HUD ของเรา — แท็บ 2 กลายเป็น "Live Feed" และปิดระบบข้อมูลในเกม
//   C   : Clean Feed แบบ HLS (.m3u8 จากเซิร์ฟเวอร์ที่แปลง RTMP แล้ว) + HUD ของเรา — ข้อแม้เดียวกับ B
// ข้อ C: เบราว์เซอร์/OBS เปิด RTMP ตรงๆ ไม่ได้ ต้องมีตัวแปลง RTMP → HLS (เช่น MediaMTX) ก่อน — รอคลาวด์ของทีม
export type LiveSourceMode = 'OFF' | 'A' | 'B' | 'C';

export interface PlaylistItem {
  id: string;
  title: string;
  url: string;
}

export interface LiveSource {
  mode: LiveSourceMode;
  url: string;
  playlist?: PlaylistItem[];
  active_index?: number;
  video_visible?: boolean;
  volume?: number; // 0-100
  muted?: boolean;
}

export const LIVE_SOURCE_OFF: LiveSource = {
  mode: 'OFF',
  url: '',
  playlist: [],
  active_index: 0,
  video_visible: true,
  volume: 100,
  muted: false,
};

export function readLiveSource(formatConfig: unknown): LiveSource {
  const raw = (formatConfig as { live_source?: Partial<LiveSource> } | null)?.live_source;
  const mode = raw?.mode;
  const playlist: PlaylistItem[] = Array.isArray(raw?.playlist)
    ? raw!.playlist.map((item, idx) => ({
        id: typeof item?.id === 'string' && item.id ? item.id : `vdo-${idx}-${Date.now()}`,
        title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : `Video ${idx + 1}`,
        url: typeof item?.url === 'string' ? item.url.trim() : '',
      })).filter((item) => item.url)
    : [];
  const active_index = typeof raw?.active_index === 'number' && raw.active_index >= 0 ? raw.active_index : 0;
  const video_visible = typeof raw?.video_visible === 'boolean' ? raw.video_visible : true;
  const volume = typeof raw?.volume === 'number' && raw.volume >= 0 && raw.volume <= 100 ? raw.volume : 100;
  const muted = typeof raw?.muted === 'boolean' ? raw.muted : false;

  let url = typeof raw?.url === 'string' ? raw.url.trim() : '';
  if (!url && playlist.length > 0 && playlist[active_index]) {
    url = playlist[active_index].url;
  }

  if ((mode === 'A' || mode === 'B' || mode === 'C') && (url || playlist.length > 0)) {
    return {
      mode,
      url: url || (playlist[0]?.url ?? ''),
      playlist,
      active_index,
      video_visible,
      volume,
      muted,
    };
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
