import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MatchesMatrixView, type PersonalMatchRecord } from '@/components/matches-matrix-view';

interface ParticipantRow {
  agent_played: string | null;
  kills: number;
  deaths: number;
  assists: number;
  team_id: string;
  match_games: {
    id: string;
    game_number: number;
    map_name: string | null;
    winner_team_id: string | null;
    match_id: string;
    matches: {
      id: string;
      status: string;
      scheduled_at: string | null;
      ended_at: string | null;
    } | null;
  } | null;
}

// Quick Draft Matrix — ประวัติการแข่งขันส่วนตัวของผู้เล่นคนปัจจุบัน ดึงจาก
// match_participants จริง (agent_played, kills/deaths/assists) join match_games
// และ matches แทน mockMatches เดิมที่มีชื่อฮีโร่ Dota ฮาร์ดโค้ด
export default async function MatchesMatrixPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!player) redirect('/login');

  const { data: participations } = await supabase
    .from('match_participants')
    .select(
      'agent_played, kills, deaths, assists, team_id, match_games(id, game_number, map_name, winner_team_id, match_id, matches(id, status, scheduled_at, ended_at))'
    )
    .eq('player_id', player.id)
    .order('match_games(game_number)', { ascending: false })
    .limit(50);

  const records: PersonalMatchRecord[] = ((participations ?? []) as unknown as ParticipantRow[])
    .filter((p) => p.match_games?.matches)
    .map((p) => {
      const game = p.match_games!;
      const match = game.matches!;
      const result: 'WIN' | 'LOSS' | 'PENDING' = !game.winner_team_id
        ? 'PENDING'
        : game.winner_team_id === p.team_id
        ? 'WIN'
        : 'LOSS';
      return {
        matchId: match.id,
        gameNumber: game.game_number,
        mapName: game.map_name ?? 'TBD',
        agentPlayed: p.agent_played ?? 'ไม่ระบุ',
        kda: `${p.kills} / ${p.deaths} / ${p.assists}`,
        result,
        status: match.status,
        date: match.ended_at ?? match.scheduled_at,
      };
    });

  return <MatchesMatrixView records={records} />;
}
