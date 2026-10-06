// lib/layout/chromeVisibility.ts
// กฎเดียวว่าหน้าไหนแสดง Navbar และปุ่มลอยแชทบอท (ZodiacOracle) — ใช้โดย components/layout/ChromeGate.tsx
// ทดสอบด้วย: npx tsx --test tests/chrome-visibility.test.ts

// เส้นทางที่ต้องเป็น Clean View ล้วน ๆ (เช่น OBS Browser Source overlay, Stream Hub)
// ห้ามมี Navbar / floating widget ใด ๆ ปนมาบนภาพสตรีมเด็ดขาด
const CHROME_FREE_PREFIXES = ['/overlay', '/stream-hub'];

// หน้าที่ยังมี Navbar แต่ไม่แสดงปุ่มลอยแชทบอท (หน้าไลฟ์ · หน้าแอดมินทั้งหมด) เทียบเป็นช่วงของเส้นทาง ไม่ใช่ startsWith เฉย ๆ
const ORACLE_FREE_SEGMENT_ROOTS = ['/live', '/admin'];

// ห้อง Lobby และห้อง Veto ของแมตช์: /matches/<หนึ่งช่วง>/lobby | /veto (รวมเส้นทางที่ต่อท้ายด้วย /…)
const ORACLE_FREE_MATCH_ROOM = /^\/matches\/[^/]+\/(lobby|veto)(\/.*)?$/;

export interface ChromeVisibility {
  navbar: boolean;
  oracle: boolean;
}

export function chromeVisibility(pathname: string | null | undefined): ChromeVisibility {
  if (!pathname) return { navbar: true, oracle: true };
  if (CHROME_FREE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return { navbar: false, oracle: false };
  const oracleFree =
    ORACLE_FREE_SEGMENT_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`)) ||
    ORACLE_FREE_MATCH_ROOM.test(pathname);
  return { navbar: true, oracle: !oracleFree };
}
