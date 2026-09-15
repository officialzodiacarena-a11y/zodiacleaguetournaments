// lib/actions/match-room.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export interface CreateScrimRoomInput {
  title: string;
  scheduledAt: string; // ISO String
  minApStake: number;
  targetTierMin?: string;
  targetTierMax?: string;
  idempotencyKey?: string;
}

export interface SendRoomMessageInput {
  roomId: string;
  message: string;
}

export interface TriggerMercyBeaconInput {
  roomId: string;
  missingTeamSide: 'TEAM_A' | 'TEAM_B';
  requiredRole: 'DUELIST' | 'INITIATOR' | 'CONTROLLER' | 'SENTINEL' | 'FLEX';
}

interface CreateScrimRoomRpcArgs {
  p_title: string;
  p_creator_player_id: string;
  p_scheduled_at: string;
  p_min_ap_stake: number;
  p_target_tier_min: string;
  p_target_tier_max: string;
  p_idempotency_key: string;
}

interface ClaimMercySubSlotRpcArgs {
  p_ticket_id: string;
  p_ringer_player_id: string;
  p_idempotency_key: string;
}

interface ApproveScrimRoomRpcArgs {
  p_room_id: string;
}

interface SettleScrimEscrowRpcArgs {
  p_room_id: string;
  p_winner_team_side: 'TEAM_A' | 'TEAM_B' | null;
  p_idempotency_key: string;
}

interface TriggerMercyBeaconRpcArgs {
  p_room_id: string;
  p_missing_team_side: 'TEAM_A' | 'TEAM_B';
  p_required_role: 'DUELIST' | 'INITIATOR' | 'CONTROLLER' | 'SENTINEL' | 'FLEX';
}

export interface OpenMercyTicket {
  id: string;
  roomId: string;
  roomTitle: string;
  missingTeamSide: string;
  requiredRole: string;
}

/**
 * Shape of the JSONB payload every match-room RPC returns. The generated
 * Supabase types only cover Args/Returns=Json for these functions, so the
 * `success`/`error`/`ticket_id` fields inside that Json need a local type
 * instead of `any` to satisfy @typescript-eslint/no-explicit-any.
 */
interface RpcJsonResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

interface MercyTicketRow {
  id: string;
  room_id: string;
  missing_team_side: string;
  required_role: string;
  match_rooms: { title: string } | null;
}

/**
 * Shared staff gate for admin-only room actions (approve / settle).
 * Fix (see migration header, item 7): approve_scrim_room()/settle_scrim_escrow()
 * carry no auth.uid() check of their own since they run via the service-role
 * admin client — permission is enforced here instead, against
 * match_room_staff.staff_role.
 */
async function assertRoomStaff(roomId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    return { ok: false as const, error: 'UNAUTHORIZED' };
  }

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!player) {
    return { ok: false as const, error: 'PLAYER_NOT_FOUND' };
  }

  const { data: staff } = await supabase
    .from('match_room_staff')
    .select('staff_role')
    .eq('room_id', roomId)
    .eq('staff_player_id', player.id)
    .maybeSingle();

  if (!staff || !['ADMIN', 'REFEREE'].includes(staff.staff_role)) {
    return { ok: false as const, error: 'STAFF_ONLY: Only assigned referees/admins can perform this action' };
  }

  return { ok: true as const };
}

/**
 * 1. Server Action: Create Scheduled Custom Scrim Room (1-7 Days Window)
 */
export async function createScheduledMatchRoom(input: CreateScrimRoomInput) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    return { success: false, error: 'UNAUTHORIZED: Session expired or user not logged in' };
  }

  // Get Player ID
  const { data: player, error: playerErr } = await supabase
    .from('players')
    .select('id, ap_balance')
    .eq('user_id', user.id)
    .single();

  if (playerErr || !player) {
    return { success: false, error: 'PLAYER_NOT_FOUND: Athlete profile missing' };
  }

  if (Number(player.ap_balance) < input.minApStake) {
    return { success: false, error: `INSUFFICIENT_AP: Required ${input.minApStake} AP for Escrow Stake` };
  }

  const adminClient = createAdminClient();
  const idempotencyKey = input.idempotencyKey || `scrim_create_${player.id}_${Date.now()}`;

  const { data, error } = await adminClient.rpc<'create_scrim_room', CreateScrimRoomRpcArgs>('create_scrim_room', {
    p_title: input.title,
    p_creator_player_id: player.id,
    p_scheduled_at: input.scheduledAt,
    p_min_ap_stake: input.minApStake,
    p_target_tier_min: input.targetTierMin || 'GOLD',
    p_target_tier_max: input.targetTierMax || 'RADIANT',
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Fix (False-Positive Success Bug): create_scrim_room() returns
  // { success: false, error } as a JSONB payload (not a thrown exception) on
  // failures like insufficient AP — `error` above stays null in that case, so
  // it must be checked separately or the caller reports success on a room
  // that was never created.
  const createResult = data as RpcJsonResult | null;
  if (!createResult || createResult.success === false) {
    return { success: false, error: createResult?.error || 'FAILED_TO_CREATE_SCRIM_ROOM' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/tournaments');

  return { success: true, data };
}

/**
 * 2. Server Action: Fetch Match Room State (Roster, Staff, Escrow)
 *    (Alis Flag 2 — was a direct client-side Supabase call in
 *    app/tournaments/room/[id]/page.tsx; moved here so the component never
 *    talks to the DB directly.)
 */
export async function getRoomDetails(roomId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('match_rooms')
    .select('*, match_room_participants(*, players(display_name)), match_room_staff(*)')
    .eq('id', roomId)
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'ROOM_NOT_FOUND' };
  }

  return { success: true, data };
}

/**
 * 3. Server Action: Send Tactical Chat Message with Granular Roster Check
 */
export async function sendRoomMessage(input: SendRoomMessageInput) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  const { data: player } = await supabase
    .from('players')
    .select('id, display_name')
    .eq('user_id', user.id)
    .single();

  if (!player) return { success: false, error: 'PLAYER_NOT_FOUND' };

  // Check Granular Permissions (Roster 12 Capacity or Staff)
  const { data: part } = await supabase
    .from('match_room_participants')
    .select('team_side, has_paid_escrow')
    .eq('room_id', input.roomId)
    .eq('player_id', player.id)
    .maybeSingle();

  const { data: staff } = await supabase
    .from('match_room_staff')
    .select('staff_role')
    .eq('room_id', input.roomId)
    .eq('staff_player_id', player.id)
    .maybeSingle();

  if (!part?.has_paid_escrow && !staff) {
    return {
      success: false,
      error: 'SPECTATOR_READ_ONLY: Spectator Mode: Read Only. Only registered & paid roster members can send messages.',
    };
  }

  const senderRole = staff ? 'REFEREE' : part?.team_side || 'TEAM_A';
  const adminClient = createAdminClient();

  // Fix (see migration header, item 2): persisted to match_room_messages
  // (room_id FK -> match_rooms) instead of match_lobby_messages, whose
  // match_id column is FK'd to the unrelated public.matches table.
  const { data: msg, error: msgErr } = await adminClient
    .from('match_room_messages')
    .insert({
      room_id: input.roomId,
      sender_id: player.id,
      sender_role: senderRole,
      message: input.message,
      is_system: false,
    })
    .select()
    .single();

  if (msgErr) return { success: false, error: msgErr.message };

  // Realtime Broadcast
  await adminClient.channel(`scrim-room-${input.roomId}`).send({
    type: 'broadcast',
    event: 'scrim_chat_message',
    payload: {
      id: msg.id,
      sender_name: player.display_name,
      sender_role: senderRole,
      message: input.message,
      created_at: msg.created_at,
    },
  });

  return { success: true, message: msg };
}

/**
 * 4. Server Action: Trigger Mercy Sub-Fill Beacon
 */
export async function triggerMercySubBeacon(input: TriggerMercyBeaconInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'UNAUTHORIZED' };

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!player) return { success: false, error: 'PLAYER_NOT_FOUND' };

  const adminClient = createAdminClient();

  // Fix (Missing RPC / Race Condition): the original insert/update pair here
  // raced when two teammates hit the beacon at once, and could create
  // duplicate OPEN tickets for the same room+side. trigger_mercy_beacon()
  // now does the lock + idempotent create atomically in one RPC call.
  const { data, error } = await adminClient.rpc<'trigger_mercy_beacon', TriggerMercyBeaconRpcArgs>('trigger_mercy_beacon', {
    p_room_id: input.roomId,
    p_missing_team_side: input.missingTeamSide,
    p_required_role: input.requiredRole,
  });

  if (error) return { success: false, error: error.message };
  const beaconResult = data as RpcJsonResult | null;
  if (!beaconResult || beaconResult.success === false) {
    return { success: false, error: beaconResult?.error || 'FAILED_TO_TRIGGER_BEACON' };
  }

  const ticketId = beaconResult.ticket_id as string;

  // Broadcast Mercy Beacon to All Standby Ringers
  await adminClient.channel('mercy-global-beacon').send({
    type: 'broadcast',
    event: 'mercy_beacon_alert',
    payload: {
      ticket_id: ticketId,
      room_id: input.roomId,
      missing_team_side: input.missingTeamSide,
      required_role: input.requiredRole,
      triggered_at: new Date().toISOString(),
    },
  });

  revalidatePath(`/tournaments/room/${input.roomId}`);

  return { success: true, ticket_id: ticketId };
}

/**
 * 5. Server Action: Claim a Mercy Ringer Slot
 */
export async function claimMercySubSlot(ticketId: string, idempotencyKey?: string) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  const { data: player, error: playerErr } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (playerErr || !player) {
    return { success: false, error: 'PLAYER_NOT_FOUND' };
  }

  const adminClient = createAdminClient();
  const key = idempotencyKey || `mercy_claim_${player.id}_${ticketId}`;

  const { data, error } = await adminClient.rpc<'claim_mercy_sub_slot', ClaimMercySubSlotRpcArgs>('claim_mercy_sub_slot', {
    p_ticket_id: ticketId,
    p_ringer_player_id: player.id,
    p_idempotency_key: key,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Fix (False-Positive Success Bug): same JSONB-level failure as
  // create_scrim_room() above — must check data.success, not just `error`.
  const claimResult = data as RpcJsonResult | null;
  if (!claimResult || claimResult.success === false) {
    return { success: false, error: claimResult?.error || 'FAILED_TO_CLAIM_MERCY_SLOT' };
  }

  revalidatePath('/dashboard');

  return { success: true, data };
}

/**
 * 6. Server Action: Approve a Pending Scrim Room (Staff Only)
 */
export async function approveScrimRoom(roomId: string) {
  const gate = await assertRoomStaff(roomId);
  if (!gate.ok) return { success: false, error: gate.error };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc<'approve_scrim_room', ApproveScrimRoomRpcArgs>('approve_scrim_room', {
    p_room_id: roomId,
  });

  if (error) return { success: false, error: error.message };
  const approveResult = data as RpcJsonResult | null;
  if (!approveResult || approveResult.success === false) {
    return { success: false, error: approveResult?.error || 'FAILED_TO_APPROVE_ROOM' };
  }

  revalidatePath(`/tournaments/room/${roomId}`);

  return { success: true, data };
}

/**
 * 7. Server Action: Settle Scrim Escrow — pay the winning side, or refund
 *    everyone on a draw/cancellation (Staff Only)
 */
export async function settleScrimEscrow(roomId: string, winnerTeamSide?: 'TEAM_A' | 'TEAM_B') {
  const gate = await assertRoomStaff(roomId);
  if (!gate.ok) return { success: false, error: gate.error };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc<'settle_scrim_escrow', SettleScrimEscrowRpcArgs>('settle_scrim_escrow', {
    p_room_id: roomId,
    p_winner_team_side: winnerTeamSide || null,
    p_idempotency_key: `settle_${roomId}_${Date.now()}`,
  });

  if (error) return { success: false, error: error.message };
  const settleResult = data as RpcJsonResult | null;
  if (!settleResult || settleResult.success === false) {
    return { success: false, error: settleResult?.error || 'FAILED_TO_SETTLE_ESCROW' };
  }

  revalidatePath(`/tournaments/room/${roomId}`);

  return { success: true, data };
}

/**
 * 8. Server Action: Fetch Open Mercy Sub Fill Tickets (global, or scoped to
 *    one room) for the Ringer Claim Widget
 */
export async function getOpenMercyTickets(roomId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('mercy_fill_tickets')
    .select('id, room_id, missing_team_side, required_role, match_rooms(title)')
    .eq('status', 'OPEN')
    .order('created_at', { ascending: false });

  if (roomId) {
    query = query.eq('room_id', roomId);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  const tickets: OpenMercyTicket[] = ((data as MercyTicketRow[]) || []).map((t) => ({
    id: t.id,
    roomId: t.room_id,
    roomTitle: t.match_rooms?.title || 'CUSTOM MATCH ROOM',
    missingTeamSide: t.missing_team_side,
    requiredRole: t.required_role,
  }));

  return { success: true, data: tickets };
}
