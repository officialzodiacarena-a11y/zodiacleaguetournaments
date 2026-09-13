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
        team_a_ready_at,
        team_b_ready_at,
        team_a:team_a_id(id, name, tag, logo_url),
        team_b:team_b_id(id, name, tag, logo_url),
        tournament:tournament_id(id, name)
      `)
      .eq('id', matchId)
      .maybeSingle();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const teamAId = (match.team_a as unknown as { id: string } | null)?.id;
    const teamBId = (match.team_b as unknown as { id: string } | null)?.id;

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

    return NextResponse.json({
      match,
      rosters: {
        team_a: teamARoster,
        team_b: teamBRoster,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}