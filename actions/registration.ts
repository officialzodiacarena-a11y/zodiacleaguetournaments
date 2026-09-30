// actions/registration.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRosterEligibility } from '@/lib/team/rosterEligibility';
import { registrationErrorMessage } from '@/lib/tournament/registrationErrors';

export type RegistrationActionResult = { error: { code: string; message: string } };

interface CreateRegistrationResult {
  ok: boolean;
  code?: string;
  existing: boolean;
  registration_id: string;
  registration_status: string;
  payment_id: string | null;
  payment_status: string | null;
  amount_thb: number | null;
  expires_at: string | null;
  entry_fee_ap: number;
}

// entry fee ไม่รับจาก client — ยึด tournaments.entry_fee_ap/entry_fee_thb จาก DB เสมอกันฝั่ง client ปลอมค่า
export async function submitRegistrationAction(
  tournamentId: string,
  teamId: string
): Promise<RegistrationActionResult | void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: { code: 'UNAUTHENTICATED', message: registrationErrorMessage('UNAUTHENTICATED') } };
  }

  const { data: actor } = await supabase
    .from('players')
    .select('id, ap_balance')
    .eq('user_id', user.id)
    .single();

  if (!actor) {
    return { error: { code: 'PLAYER_NOT_FOUND', message: registrationErrorMessage('PLAYER_NOT_FOUND') } };
  }

  const { data: team } = await supabase
    .from('teams')
    .select('id, game_id, captain_id')
    .eq('id', teamId)
    .single();

  if (!team) {
    return { error: { code: 'TEAM_NOT_FOUND', message: registrationErrorMessage('TEAM_NOT_FOUND') } };
  }
  if (team.captain_id !== actor.id) {
    return { error: { code: 'FORBIDDEN', message: registrationErrorMessage('FORBIDDEN') } };
  }

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, status, entry_fee_ap, entry_fee_thb')
    .eq('id', tournamentId)
    .single();

  if (!tournament) {
    return { error: { code: 'TOURNAMENT_NOT_FOUND', message: registrationErrorMessage('TOURNAMENT_NOT_FOUND') } };
  }
  if (tournament.status !== 'OPEN') {
    return { error: { code: 'REGISTRATION_CLOSED', message: registrationErrorMessage('REGISTRATION_CLOSED') } };
  }

  const entryFeeAp: number = tournament.entry_fee_ap;
  if (entryFeeAp > 0 && actor.ap_balance < entryFeeAp) {
    return {
      error: {
        code: 'INSUFFICIENT_AP',
        message: `AP ไม่พอ ต้องการ ${entryFeeAp} AP แต่มีอยู่ ${actor.ap_balance} AP`,
      },
    };
  }

  // Auto-check: ผ่านคุณสมบัติทีมครบ (5 คน + verified) หรือไม่ ก่อนตั้ง status เริ่มต้น
  const eligibility = await checkRosterEligibility(supabase, teamId, team.game_id);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('create_tournament_registration', {
    p_tournament_id: tournamentId,
    p_team_id: teamId,
    p_actor_player_id: actor.id,
    p_roster_complete: eligibility.isComplete,
  });

  if (error || !data) {
    return { error: { code: 'REGISTRATION_FAILED', message: registrationErrorMessage('REGISTRATION_FAILED') } };
  }

  const result = data as unknown as CreateRegistrationResult;

  if (result.ok === false) {
    return { error: { code: result.code ?? 'REGISTRATION_FAILED', message: registrationErrorMessage(result.code) } };
  }

  if (result.existing === false && entryFeeAp > 0) {
    const { data: moveResult, error: moveError } = await admin.rpc('move_ap', {
      p_player_id: actor.id,
      p_amount: -entryFeeAp,
      p_reason: 'TOURNAMENT_ENTRY_FEE',
      p_idempotency_key: `reg-fee-${result.registration_id}`,
      p_reference_type: 'tournament_registrations',
      p_reference_id: result.registration_id,
    });

    const moveData = moveResult as { success?: boolean; error?: string; balance_after?: number } | null;

    if (moveError || !moveData?.success) {
      // AP ไม่พอ ณ จังหวะหักจริง หรือ transaction error — ย้อนกลับการสมัคร
      await admin.from('tournament_registrations').delete().eq('id', result.registration_id);
      const errorMsg =
        moveData?.error === 'INSUFFICIENT_AP_BALANCE'
          ? 'AP ไม่พอในจังหวะที่ทำรายการ กรุณาลองใหม่'
          : `หักแต้ม AP ไม่สำเร็จ: ${moveError?.message ?? moveData?.error ?? 'UNKNOWN_ERROR'}`;
      return { error: { code: moveData?.error ?? 'AP_DEDUCTION_FAILED', message: errorMsg } };
    }
  }

  if (result.existing === false) {
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
        entity_id: result.registration_id,
        after_data: { tournament_id: tournamentId, team_id: teamId, status: result.registration_status },
      },
    ]);
  }

  revalidatePath(`/tournament/${tournamentId}`);

  if (result.registration_status === 'AWAITING_PAYMENT') {
    redirect(`/tournament/${tournamentId}/pay`);
  }
  redirect(`/tournament/${tournamentId}/register`);
}
