//app/api/v1/circuits/[id]/recalculate/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database.types';

interface SeasonRow {
  id: string;
  split: 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER';
}

interface SeasonStandingRow {
  season_id: string;
  team_id: string;
  total_zp: number;
  matches_won: number;
  rounds_won: number;
  rounds_lost: number;
  best_placement: number | null;
}

interface CircuitStandingExisting {
  team_id: string;
  bonus_zp: number;
  penalty_zp: number;
}

interface TeamRow {
  id: string;
  name: string;
  tag: string;
  created_at: string;
}

interface MatchRow {
  team_a_id: string | null;
  team_b_id: string | null;
  winner_team_id: string | null;
}

interface TeamData {
  teamId: string;
  teamName: string;
  teamTag: string;
  teamCreatedAt: string;
  spring_zp: number;
  summer_zp: number;
  fall_zp: number;
  winter_zp: number;
  bonus_zp: number;
  penalty_zp: number;
  total_zp: number;
  counted_zp: number;
  totalMatchWins: number;
  roundDiff: number;
  bestPlacement: number | null;
  rank: number;
  tiebreakerApplied: Record<string, unknown>;
}

const SPLIT_COLUMN: Record<string, keyof Pick<TeamData, 'spring_zp' | 'summer_zp' | 'fall_zp' | 'winter_zp'>> = {
  SPRING: 'spring_zp',
  SUMMER: 'summer_zp',
  FALL: 'fall_zp',
  WINTER: 'winter_zp',
};

function buildH2HMap(
  matches: MatchRow[],
  teamIds: Set<string>
): Record<string, Record<string, number>> {
  const h2h: Record<string, Record<string, number>> = {};
  for (const m of matches) {
    if (!m.winner_team_id || !m.team_a_id || !m.team_b_id) continue;
    if (!teamIds.has(m.team_a_id) || !teamIds.has(m.team_b_id)) continue;
    if (!h2h[m.winner_team_id]) h2h[m.winner_team_id] = {};
    const opponent = m.winner_team_id === m.team_a_id ? m.team_b_id : m.team_a_id;
    h2h[m.winner_team_id][opponent] = (h2h[m.winner_team_id][opponent] ?? 0) + 1;
  }
  return h2h;
}

function compareTeams(
  a: TeamData,
  b: TeamData,
  rules: string[],
  h2h: Record<string, Record<string, number>>
): { cmp: number; ruleUsed: string | null } {
  for (const rule of rules) {
    let cmp = 0;
    switch (rule) {
      case 'head_to_head': {
        const aWins = h2h[a.teamId]?.[b.teamId] ?? 0;
        const bWins = h2h[b.teamId]?.[a.teamId] ?? 0;
        cmp = bWins - aWins;
        break;
      }
      case 'best_placement': {
        const ap = a.bestPlacement ?? 9999;
        const bp = b.bestPlacement ?? 9999;
        cmp = ap - bp;
        break;
      }
      case 'total_match_wins':
        cmp = b.totalMatchWins - a.totalMatchWins;
        break;
      case 'round_differential':
        cmp = b.roundDiff - a.roundDiff;
        break;
      case 'earliest_registration':
        cmp = new Date(a.teamCreatedAt).getTime() - new Date(b.teamCreatedAt).getTime();
        break;
    }
    if (cmp !== 0) return { cmp, ruleUsed: rule };
  }
  return { cmp: 0, ruleUsed: null };
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: circuitId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } },
        { status: 401 }
      );
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบโปรไฟล์ในระบบลีก' } },
        { status: 404 }
      );
    }

    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('player_id', player.id)
      .is('revoked_at', null)
      .single();

    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (roleError || !userRole || !allowedRoles.includes(userRole.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN_ROLE', message: 'ต้องการสิทธิ์ ADMIN หรือ SUPER_ADMIN' } },
        { status: 403 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: rawCircuit, error: circuitError } = await adminSupabase
      .from('circuits' as never)
      .select('id, best_n_seasons, finals_slots, tiebreaker_rules')
      .eq('id' as never, circuitId)
      .single();

    if (circuitError || !rawCircuit) {
      return NextResponse.json(
        { error: { code: 'CIRCUIT_NOT_FOUND', message: 'ไม่พบข้อมูล Circuit ที่ระบุ' } },
        { status: 404 }
      );
    }

    const circuit = rawCircuit as unknown as {
      best_n_seasons: number | null;
      finals_slots: number | null;
      tiebreaker_rules: string[] | null;
    };

    const bestN = circuit.best_n_seasons;
    const finalsSlots = circuit.finals_slots ?? 12;
    const tiebreakerRules = circuit.tiebreaker_rules ??
      ['head_to_head', 'best_placement', 'total_match_wins', 'round_differential', 'earliest_registration'];

    const { data: rawSeasons, error: seasonsError } = await adminSupabase
      .from('seasons' as never)
      .select('id, split')
      .eq('circuit_id' as never, circuitId);

    if (seasonsError || !rawSeasons || (rawSeasons as unknown[]).length === 0) {
      return NextResponse.json(
        { error: { code: 'NO_SEASONS', message: 'ไม่พบซีซันใด ๆ ใน Circuit นี้' } },
        { status: 422 }
      );
    }

    const seasonList = rawSeasons as unknown as SeasonRow[];
    const seasonIds = seasonList.map((s) => s.id);
    const seasonSplitMap: Record<string, 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER'> = {};
    for (const s of seasonList) {
      seasonSplitMap[s.id] = s.split;
    }

    const [standingsRes, existingRes] = await Promise.all([
      adminSupabase
        .from('season_standings' as never)
        .select('season_id, team_id, total_zp, matches_won, rounds_won, rounds_lost, best_placement')
        .in('season_id' as never, seasonIds),
      adminSupabase
        .from('circuit_standings' as never)
        .select('team_id, bonus_zp, penalty_zp')
        .eq('circuit_id' as never, circuitId),
    ]);

    if (standingsRes.error) {
      return NextResponse.json(
        { error: { code: 'QUERY_FAILED', message: standingsRes.error.message } },
        { status: 500 }
      );
    }

    const seasonStandings = (standingsRes.data ?? []) as unknown as SeasonStandingRow[];
    const existingCircuit = (existingRes.data ?? []) as unknown as CircuitStandingExisting[];

    const existingMap: Record<string, { bonus_zp: number; penalty_zp: number }> = {};
    for (const row of existingCircuit) {
      existingMap[row.team_id] = { bonus_zp: row.bonus_zp, penalty_zp: row.penalty_zp };
    }

    const teamMap: Record<string, TeamData> = {};

    for (const row of seasonStandings) {
      const splitType = seasonSplitMap[row.season_id];
      const col = SPLIT_COLUMN[splitType];
      if (!col) continue;

      if (!teamMap[row.team_id]) {
        const existing = existingMap[row.team_id] ?? { bonus_zp: 0, penalty_zp: 0 };
        teamMap[row.team_id] = {
          teamId: row.team_id,
          teamName: '',
          teamTag: '',
          teamCreatedAt: '',
          spring_zp: 0,
          summer_zp: 0,
          fall_zp: 0,
          winter_zp: 0,
          bonus_zp: existing.bonus_zp,
          penalty_zp: existing.penalty_zp,
          total_zp: 0,
          counted_zp: 0,
          totalMatchWins: 0,
          roundDiff: 0,
          bestPlacement: null,
          rank: 0,
          tiebreakerApplied: {},
        };
      }

      const td = teamMap[row.team_id];
      td[col] += row.total_zp;
      td.totalMatchWins += row.matches_won;
      td.roundDiff += row.rounds_won - row.rounds_lost;

      if (row.best_placement !== null) {
        if (td.bestPlacement === null || row.best_placement < td.bestPlacement) {
          td.bestPlacement = row.best_placement;
        }
      }
    }

    const allTeamIds = Object.keys(teamMap);
    if (allTeamIds.length === 0) {
      return NextResponse.json({
        success: true,
        circuit_id: circuitId,
        rows_updated: 0,
        message: 'ไม่พบทีมใด ๆ ในซีซันของ Circuit นี้',
      });
    }

    const { data: teamsData, error: teamsError } = await adminSupabase
      .from('teams')
      .select('id, name, tag, created_at')
      .in('id', allTeamIds);

    if (teamsError) {
      return NextResponse.json(
        { error: { code: 'QUERY_FAILED', message: teamsError.message } },
        { status: 500 }
      );
    }

    for (const team of (teamsData ?? []) as TeamRow[]) {
      if (teamMap[team.id]) {
        teamMap[team.id].teamName = team.name;
        teamMap[team.id].teamTag = team.tag;
        teamMap[team.id].teamCreatedAt = team.created_at;
      }
    }

    for (const td of Object.values(teamMap)) {
      const seasonZps = [td.spring_zp, td.summer_zp, td.fall_zp, td.winter_zp];
      const rawTotal = seasonZps.reduce((a, b) => a + b, 0);
      td.total_zp = rawTotal + td.bonus_zp + td.penalty_zp;

      if (bestN !== null && bestN !== undefined) {
        const topN = [...seasonZps].sort((a, b) => b - a).slice(0, bestN);
        td.counted_zp = topN.reduce((a, b) => a + b, 0) + td.bonus_zp + td.penalty_zp;
      } else {
        td.counted_zp = td.total_zp;
      }
    }

    let h2hMap: Record<string, Record<string, number>> = {};
    const needsH2H = tiebreakerRules.includes('head_to_head');

    if (needsH2H) {
      const teamIdSet = new Set(allTeamIds);
      const { data: matchData } = await adminSupabase
        .from('matches')
        .select('team_a_id, team_b_id, winner_team_id')
        .or(`team_a_id.in.(${allTeamIds.join(',')}),team_b_id.in.(${allTeamIds.join(',')})`)
        .eq('status', 'COMPLETED');

      h2hMap = buildH2HMap((matchData ?? []) as MatchRow[], teamIdSet);
    }

    const teamList = Object.values(teamMap);
    const tiebreakerAppliedPerTeamVs: Record<string, Record<string, string>> = {};

    teamList.sort((a, b) => {
      if (b.counted_zp !== a.counted_zp) return b.counted_zp - a.counted_zp;
      const { cmp, ruleUsed } = compareTeams(a, b, tiebreakerRules, h2hMap);
      if (ruleUsed) {
        const key = `${a.teamId}_vs_${b.teamId}`;
        tiebreakerAppliedPerTeamVs[key] = { rule: ruleUsed };
      }
      return cmp;
    });

    for (let i = 0; i < teamList.length; i++) {
      teamList[i].rank = i + 1;
    }

    for (const td of teamList) {
      const usedRules: string[] = [];
      for (const [key, val] of Object.entries(tiebreakerAppliedPerTeamVs)) {
        if (key.startsWith(td.teamId) || key.includes(`_${td.teamId}`)) {
          if (!usedRules.includes(val.rule)) usedRules.push(val.rule);
        }
      }
      td.tiebreakerApplied = usedRules.length > 0 ? { rules_applied: usedRules } : {};
    }

    const now = new Date().toISOString();
    const upsertRows = teamList.map((td) => {
      const isQualified = td.rank <= finalsSlots;
      return {
        circuit_id: circuitId,
        team_id: td.teamId,
        spring_zp: td.spring_zp,
        summer_zp: td.summer_zp,
        fall_zp: td.fall_zp,
        winter_zp: td.winter_zp,
        bonus_zp: td.bonus_zp,
        penalty_zp: td.penalty_zp,
        total_zp: td.total_zp,
        counted_zp: td.counted_zp,
        rank: td.rank,
        tiebreaker_applied: td.tiebreakerApplied as unknown as Json,
        is_finals_qualified: isQualified,
        finals_seed: isQualified ? td.rank : null,
        qualified_at: isQualified ? now : null,
        last_calculated_at: now,
      };
    });

    const { error: upsertError } = await adminSupabase
      .from('circuit_standings' as never)
      .upsert(upsertRows as never, { onConflict: 'circuit_id,team_id' } as never);

    if (upsertError) {
      return NextResponse.json(
        { error: { code: 'UPSERT_FAILED', message: upsertError.message } },
        { status: 500 }
      );
    }

    const qualifiedTeams = teamList
      .filter((td) => td.rank <= finalsSlots)
      .map((td) => ({ team_id: td.teamId, team_name: td.teamName, rank: td.rank, finals_seed: td.rank }));

    return NextResponse.json({
      success: true,
      circuit_id: circuitId,
      rows_updated: teamList.length,
      finals_qualified: qualifiedTeams,
      best_n_seasons_applied: bestN,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}