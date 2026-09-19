import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

interface PlayerInfo {
  id: string;
  display_name: string;
}

interface TeamMemberRow {
  role: string;
  players: PlayerInfo | null;
}

export async function GET(req: Request, { params }: PageProps) {
  try {
    const resolvedParams = await params;
    const matchId = resolvedParams.id;
    const supabase = await createClient();

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(`
        id,
        status,
        scheduled_at,
        forfeit_deadline_at,
        format_config,
        team_a_ready_at,
        team_b_ready_at,
        referee:referee_id(id, display_name),
        team_a:team_a_id(id, name, tag, logo_url),
        team_b:team_b_id(id, name, tag, logo_url),
        tournament:tournament_id(id, name)
      `)
      .eq('id', matchId)
      .maybeSingle();

    if (matchError || !match) {
      return NextResponse.json({ error: { message: 'Match not found' } }, { status: 404 });
    }

    const teamAData = match.team_a as unknown as { id: string; name: string; tag: string | null; logo_url: string | null } | null;
    const teamBData = match.team_b as unknown as { id: string; name: string; tag: string | null; logo_url: string | null } | null;
    const refereeData = match.referee as unknown as { id: string; display_name: string } | null;

    const teamAId = teamAData?.id;
    const teamBId = teamBData?.id;

    let teamARoster: { id: string | null; display_name: string; role: string }[] = [];
    let teamBRoster: { id: string | null; display_name: string; role: string }[] = [];

    if (teamAId) {
      const { data: membersA } = await supabase
        .from('team_members')
        .select('role, players!team_members_player_id_fkey(id, display_name)')
        .eq('team_id', teamAId);

      teamARoster = (membersA as unknown as TeamMemberRow[] ?? []).map((row) => ({
        id: row.players?.id ?? null,
        display_name: row.players?.display_name ?? 'Unknown',
        role: row.role,
      }));
    }

    if (teamBId) {
      const { data: membersB } = await supabase
        .from('team_members')
        .select('role, players!team_members_player_id_fkey(id, display_name)')
        .eq('team_id', teamBId);

      teamBRoster = (membersB as unknown as TeamMemberRow[] ?? []).map((row) => ({
        id: row.players?.id ?? null,
        display_name: row.players?.display_name ?? 'Unknown',
        role: row.role,
      }));
    }

    // Fetch messages
    const { data: rawMessages } = await supabase
      .from('match_lobby_messages')
      .select('id, sender_id, sender_role, message, is_system, created_at, players(display_name)')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    interface LobbyMessageRow {
      id: string;
      sender_id: string;
      sender_role: string;
      message: string;
      is_system: boolean;
      created_at: string;
      players?: { display_name?: string } | null;
    }

    const messages = ((rawMessages as unknown as LobbyMessageRow[]) ?? []).map((m) => ({
      id: m.id,
      sender_id: m.sender_id,
      sender_name: m.is_system ? 'SYSTEM' : (m.players?.display_name ?? 'Player'),
      sender_role: m.sender_role,
      message: m.message,
      is_system: m.is_system,
      created_at: m.created_at,
    }));

    const formatConfig = match.format_config as { lobby_code?: string } | null;

    return NextResponse.json({
      match_id: match.id,
      status: match.status,
      scheduled_at: match.scheduled_at,
      forfeit_deadline_at: match.forfeit_deadline_at,
      lobby_code: formatConfig?.lobby_code ?? null,
      team_a: teamAData ? {
        id: teamAData.id,
        name: teamAData.name,
        tag: teamAData.tag,
        logo_url: teamAData.logo_url,
        ready: !!match.team_a_ready_at,
        ready_at: match.team_a_ready_at,
        members: teamARoster,
      } : null,
      team_b: teamBData ? {
        id: teamBData.id,
        name: teamBData.name,
        tag: teamBData.tag,
        logo_url: teamBData.logo_url,
        ready: !!match.team_b_ready_at,
        ready_at: match.team_b_ready_at,
        members: teamBRoster,
      } : null,
      referee: refereeData ? {
        player_id: refereeData.id,
        display_name: refereeData.display_name,
      } : null,
      messages,
      realtime_channel: `match-realtime-${match.id}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}