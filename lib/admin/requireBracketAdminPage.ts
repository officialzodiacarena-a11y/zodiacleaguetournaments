import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { playerHasAnyRole } from '@/lib/auth/hasAnyRole';
import { BRACKET_ADMIN_ROLES } from '@/lib/tournament/bracketBuilder';

// Server Component gate สำหรับ app/admin/tournaments/* — ไม่มี app/admin/layout.tsx จึงตรวจในหน้าเอง
// สิทธิ์ = SUPER_ADMIN / ADMIN / REFEREE (เท่ากับ is_admin() ใน DB ที่ RLS ของ tournament_stages / bracket_nodes ใช้)
// รองรับผู้ใช้หลาย role ผ่าน playerHasAnyRole (ไม่ใช้ .single())
export async function requireBracketAdminPage(): Promise<{ playerId: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: player } = await supabase.from('players').select('id').eq('user_id', user.id).maybeSingle();
  if (!player) redirect('/login');

  if (!(await playerHasAnyRole(supabase, player.id, BRACKET_ADMIN_ROLES))) redirect('/');

  return { playerId: player.id };
}
