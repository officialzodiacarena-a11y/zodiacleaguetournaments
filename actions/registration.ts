// actions/registration.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRosterEligibility } from '@/lib/team/rosterEligibility';

export type RegistrationActionResult = { error: { code: string; message: string } };

// entry fee ไม่รับจาก client — ยึด tournaments.entry_fee_ap จาก DB เสมอกันฝั่ง client ปลอมค่า
export async function submitRegistrationAction(
  tournamentId: string,
  teamId: string
): Promise<RegistrationActionResult | void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: { code: 'UNAUTHENTICATED', message: 'กรุณาเข้าสู่ระบบก่อน' } };
  }

  const { data: actor } = await supabase
    .from('players')
    .select('id, ap_balance')
    .eq('user_id', user.id)
    .single();

  if (!actor) {
    return { error: { code: 'PLAYER_NOT_FOUND', message: 'ไม่พบโปรไฟล์นักกีฬาของคุณ' } };
  }

  const { data: team } = await supabase
    .from('teams')
    .select('id, game_id, captain_id')
    .eq('id', teamId)
    .single();

  if (!team) {
    return { error: { code: 'TEAM_NOT_FOUND', message: 'ไม่พบทีมนี้' } };
  }
  if (team.captain_id !== actor.id) {
    return { error: { code: 'FORBIDDEN', message: 'เฉพาะ Captain เท่านั้นที่สมัครแข่งขันแทนทีมได้' } };
  }

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, status, entry_fee_ap')
    .eq('id', tournamentId)
    .single();

  if (!tournament) {
    return { error: { code: 'TOURNAMENT_NOT_FOUND', message: 'ไม่พบทัวร์นาเมนต์นี้' } };
  }
  if (tournament.status !== 'OPEN') {
    return { error: { code: 'REGISTRATION_CLOSED', message: 'ทัวร์นาเมนต์นี้ปิดรับสมัครแล้ว' } };
  }

  const { data: existingRegistration } = await supabase
    .from('tournament_registrations')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (existingRegistration) {
    return { error: { code: 'ALREADY_REGISTERED', message: 'ทีมนี้สมัครทัวร์นาเมนต์นี้ไปแล้ว' } };
  }

  const entryFeeAp: number = tournament.entry_fee_ap;
  if (actor.ap_balance < entryFeeAp) {
    return {
      error: {
        code: 'INSUFFICIENT_AP',
        message: `AP ไม่พอ ต้องการ ${entryFeeAp} AP แต่มีอยู่ ${actor.ap_balance} AP`,
      },
    };
  }

  // Auto-check: ผ่านคุณสมบัติทีมครบ (5 คน + verified) หรือไม่ ก่อนตั้ง status เริ่มต้น
  const eligibility = await checkRosterEligibility(supabase, teamId, team.game_id);
  const initialStatus = eligibility.isComplete ? 'ELIGIBLE' : 'PENDING';

  const { data: registration, error: insertError } = await supabase
    .from('tournament_registrations')
    .insert({
      tournament_id: tournamentId,
      team_id: teamId,
      status: initialStatus,
      ap_deducted: entryFeeAp,
      idempotency_key: randomUUID(),
    })
    .select('id')
    .single();

  if (insertError || !registration) {
    if (insertError?.code === '23505') {
      return { error: { code: 'ALREADY_REGISTERED', message: 'ทีมนี้สมัครทัวร์นาเมนต์นี้ไปแล้ว' } };
    }
    return { error: { code: 'REGISTRATION_FAILED', message: insertError?.message ?? 'สมัครไม่สำเร็จ' } };
  }

  if (entryFeeAp > 0) {
    const admin = createAdminClient();
    const { data: moveResult, error: moveError } = await admin.rpc('move_ap', {
      p_player_id: actor.id,
      p_amount: -entryFeeAp,
      p_reason: 'TOURNAMENT_ENTRY_FEE',
      p_idempotency_key: `reg-fee-${registration.id}`,
      p_reference_type: 'tournament_registrations',
      p_reference_id: registration.id,
    });

    const result = moveResult as { success?: boolean; error?: string; balance_after?: number } | null;

    if (moveError || !result?.success) {
      // AP ไม่พอ ณ จังหวะหักจริง หรือ transaction error — ย้อนกลับการสมัคร
      await admin.from('tournament_registrations').delete().eq('id', registration.id);
      const errorMsg =
        result?.error === 'INSUFFICIENT_AP_BALANCE'
          ? 'AP ไม่พอในจังหวะที่ทำรายการ กรุณาลองใหม่'
          : `หักแต้ม AP ไม่สำเร็จ: ${moveError?.message ?? result?.error ?? 'UNKNOWN_ERROR'}`;
      return { error: { code: result?.error ?? 'AP_DEDUCTION_FAILED', message: errorMsg } };
    }
  }

  await supabase.from('audit_logs').insert([
    ...(entryFeeAp > 0
      ? [
          {
            actor_id: actor.id,
            action: 'DEBIT' as const,
            entity_type: 'players',
            entity_id: actor.id,
            before_data: { ap_balance: actor.ap_balance },
            after_data: { ap_balance: actor.ap_balance - entryFeeAp },
          },
        ]
      : []),
    {
      actor_id: actor.id,
      action: 'CREATE' as const,
      entity_type: 'tournament_registrations',
      entity_id: registration.id,
      after_data: { tournament_id: tournamentId, team_id: teamId, status: initialStatus },
    },
  ]);

  revalidatePath(`/tournament/${tournamentId}`);
  redirect(`/tournaments/${tournamentId}/confirmation`);
}
