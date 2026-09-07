import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface TeamMemberRow {
  role: string;
  players: { id: string; display_name: string } | { id: string; display_name: string }[] | null;
}

function normalizeMember(row: TeamMemberRow) {
  const player = Array.isArray(row.players) ? row.players[0] : row.players;
  return {
    id: player?.id ?? null,
    display_name: player?.display_name ?? 'UNKNOWN',
    role: row.role,
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await params;
  const matchId = resolvedParams.id;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนเข้าห้องล็อบบี้' } },
      { status: 401 }
    );
  }

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, status, scheduled_at, forfeit_deadline_at, format_config, team_a_id, team_b_id, referee_id, team_a_ready_at, team_b_ready_at')
    .eq('id', matchId)
    .single();

  if (matchError || !match) {
    return NextResponse.json(
      { error: { code: 'MATCH_NOT_FOUND', message: 'ไม่พบข้อมูลแมตช์การแข่งขันที่ระบุ' } },
      { status: 404 }
    );
  }

  const [{ data: teamA }, { data: teamB }, { data: referee }] = await Promise.all([
    supabase.from('teams').select('id, name, tag, logo_url').eq('id', match.team_a_id).maybeSingle(),
    supabase.from('teams').select('id, name, tag, logo_url').eq('id', match.team_b_id).maybeSingle(),
    match.referee_id
      ? supabase.from('players').select('id, display_name').eq('id', match.referee_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const [{ data: teamAMembers }, { data: teamBMembers }, { data: messages }] = await Promise.all([
    supabase
      .from('team_members')
      .select('role, players(id, display_name)')
      .eq('team_id', teamA?.id ?? '')
      .eq('status', 'ACTIVE'),
    supabase
      .from('team_members')
      .select('role, players(id, display_name)')
      .eq('team_id', teamB?.id ?? '')
      .eq('status', 'ACTIVE'),
    supabase
      .from('match_lobby_messages')
      .select('id, sender_id, sender_role, message, is_system, created_at, sender:players(display_name)')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const formatConfig = (match.format_config as Record<string, unknown> | null) || {};

  return NextResponse.json({
    match_id: match.id,
    status: match.status,
    scheduled_at: match.scheduled_at,
    forfeit_deadline_at: match.forfeit_deadline_at,
    lobby_code: (formatConfig.lobby_code as string | undefined) ?? null,
    team_a: teamA ? {
      id: teamA.id,
      name: teamA.name,
      tag: teamA.tag,
      logo_url: teamA.logo_url,
      ready: Boolean(match.team_a_ready_at),
      ready_at: match.team_a_ready_at,
      members: (teamAMembers || []).map(normalizeMember),
    } : null,
    team_b: teamB ? {
      id: teamB.id,
      name: teamB.name,
      tag: teamB.tag,
      logo_url: teamB.logo_url,
      ready: Boolean(match.team_b_ready_at),
      ready_at: match.team_b_ready_at,
      members: (teamBMembers || []).map(normalizeMember),
    } : null,
    referee: referee ? { player_id: referee.id, display_name: referee.display_name } : null,
    messages: (messages || [])
      .slice()
      .reverse()
      .map((m) => {
        const sender = Array.isArray(m.sender) ? m.sender[0] : m.sender;
        return {
          id: m.id,
          sender_id: m.sender_id,
          sender_name: sender?.display_name ?? (m.is_system ? 'SYSTEM' : 'UNKNOWN'),
          sender_role: m.sender_role,
          message: m.message,
          is_system: m.is_system,
          created_at: m.created_at,
        };
      }),
    realtime_channel: `match-lobby-${matchId}`,
  });
}
