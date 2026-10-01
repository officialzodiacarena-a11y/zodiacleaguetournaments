// app/login/page.tsx
import { createClient } from '@/lib/supabase/server';
import { getBangkokQuarter, getBangkokYear } from '@/lib/season/current-season';
import { countOpenRegistrationTournaments } from '@/lib/season/open-registration';
import SeasonalGateway from './SeasonalGateway';

// ฤดูกาลปัจจุบัน + จำนวนทัวร์เปิดรับสมัครต้องคำนวณใหม่ทุกครั้งที่เปิดหน้า (ไม่ให้ค้างตอนเปลี่ยนไตรมาส)
export const dynamic = 'force-dynamic';

export default async function SeasonalGatewayPage() {
  const supabase = await createClient();
  const openTournamentsCount = await countOpenRegistrationTournaments(supabase);

  return (
    <SeasonalGateway
      currentQuarter={getBangkokQuarter()}
      currentYear={getBangkokYear()}
      openTournamentsCount={openTournamentsCount}
    />
  );
}
