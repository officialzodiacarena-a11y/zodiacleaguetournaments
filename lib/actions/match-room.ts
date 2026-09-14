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
    .select('*, match_room_participants(*), match_room_staff(*)')
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

  // Create Mercy Fill Ticket
  const { data: ticket, error: ticketErr } = await adminClient
    .from('mercy_fill_tickets')
    .insert({
      room_id: input.roomId,
      missing_team_side: input.missingTeamSide,
      required_role: input.requiredRole,
      status: 'OPEN',
    })
    .select()
    .single();

  if (ticketErr) return { success: false, error: ticketErr.message };

  // Activate Mercy Beacon Flag in Room
  await adminClient
    .from('match_rooms')
    .update({
      mercy_beacon_active: true,
      mercy_beacon_triggered_at: new Date().toISOString(),
    })
    .eq('id', input.roomId);

  // Broadcast Mercy Beacon to All Standby Ringers
  await adminClient.channel('mercy-global-beacon').send({
    type: 'broadcast',
    event: 'mercy_beacon_alert',
    payload: {
      ticket_id: ticket.id,
      room_id: input.roomId,
      missing_team_side: input.missingTeamSide,
      required_role: input.requiredRole,
      triggered_at: new Date().toISOString(),
    },
  });

  revalidatePath(`/tournaments/room/${input.roomId}`);

  return { success: true, ticket_id: ticket.id };
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

  revalidatePath('/dashboard');

  return { success: true, data };
}
