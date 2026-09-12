// config/navigation.ts
export interface NavItem {
  label: string;
  href: string;
  isPublic?: boolean;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: 'นักกีฬา', href: '/profile', isPublic: false },
  { label: 'ทีม', href: '/teams', isPublic: true },
  { label: 'ทัวร์นาเมนต์ลีก', href: '/tournament', isPublic: true },
  { label: 'ตารางแข่ง', href: '/schedule', isPublic: true },
  { label: 'อันดับ ZP', href: '/leaderboard', isPublic: true },
  { label: 'ร้านค้า AP', href: '/store', isPublic: true },
];

/**
 * กำหนด URL ปลายทางของโลโก้แบรนด์ตามสถานะการเข้าสู่ระบบ
 */
export const getBrandHomeUrl = (isAuthenticated: boolean): string => {
  return isAuthenticated ? '/dashboard' : '/';
};
