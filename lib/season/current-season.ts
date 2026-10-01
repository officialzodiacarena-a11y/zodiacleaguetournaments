// lib/season/current-season.ts
// ฤดูกาลปัจจุบันของหน้าแรก/หน้า login: คำนวณจากวันที่ (เวลาไทย Asia/Bangkok) ไม่เขียนตายตัว
// ไตรมาส 1 = ม.ค.–มี.ค. (Spring) … ไตรมาส 4 = ต.ค.–ธ.ค. (Winter)

export type SeasonQuarter = 1 | 2 | 3 | 4;

export const SEASON_NAMES: Record<SeasonQuarter, string> = {
  1: 'SPRING',
  2: 'SUMMER',
  3: 'FALL',
  4: 'WINTER',
};

export type SeasonCardKind = 'ended' | 'live' | 'next' | 'locked';

export interface SeasonCardState {
  kind: SeasonCardKind;
  /** ป้ายมุมการ์ด */
  badge: string;
  /** บรรทัดรองเฉพาะการ์ดไตรมาสปัจจุบัน */
  subline: string | null;
}

// CI: จบฤดูกาล = เทา, LIVE = แดง
export const SEASON_ENDED_COLOR = '#6B7280';
export const SEASON_LIVE_COLOR = '#E3322F';

export function getBangkokQuarter(now: Date = new Date()): SeasonQuarter {
  const month = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', month: 'numeric' }).format(now),
  );
  return Math.ceil(month / 3) as SeasonQuarter;
}

export function getSeasonCardState(
  cardQuarter: SeasonQuarter,
  currentQuarter: SeasonQuarter,
  hasOpenRegistration: boolean,
): SeasonCardState {
  if (cardQuarter < currentQuarter) {
    return { kind: 'ended', badge: 'จบฤดูกาล', subline: null };
  }
  if (cardQuarter === currentQuarter) {
    return {
      kind: 'live',
      badge: 'LIVE',
      subline: hasOpenRegistration ? 'เปิดรับสมัคร' : 'กำลังแข่ง',
    };
  }
  if (cardQuarter === currentQuarter + 1) {
    return { kind: 'next', badge: 'NEXT', subline: null };
  }
  return { kind: 'locked', badge: 'LOCKED', subline: null };
}

// ข้อความแถบวิ่งด้านบน เช่น "S4 WINTER · ZODIAC LEAGUE: เปิดรับสมัคร"
export function getSeasonTickerText(
  currentQuarter: SeasonQuarter,
  hasOpenRegistration: boolean,
): string {
  const label = `S${currentQuarter} ${SEASON_NAMES[currentQuarter]}`;
  return hasOpenRegistration
    ? `${label} · ZODIAC LEAGUE: เปิดรับสมัคร`
    : `${label}: กำลังแข่ง`;
}
