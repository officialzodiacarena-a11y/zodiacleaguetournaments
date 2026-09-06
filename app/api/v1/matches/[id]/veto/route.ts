import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface VetoStepConfig {
  step: number;
  action: 'BAN' | 'PICK' | 'DECIDER' | 'SIDE_PICK';
  team: 'A' | 'B' | null;
}

interface VetoFormat {
  sequence: Array<'BAN' | 'PICK' | 'DECIDER' | 'SIDE_PICK' | VetoStepConfig>;
  team_a_first?: boolean;
  time_limit_seconds?: number;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const matchId = resolvedParams.id;

  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select(`
      id, status, team_a_id, team_b_id,
      stage:tournament_stages(map_pool, veto_format)
    `)
    .eq('id', matchId)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  // จัดการกรณี stage คืนค่ามาเป็น array หรือ object เดี่ยว
  const stageData = Array.isArray(match.stage) ? match.stage[0] : match.stage;
  const mapPool: string[] = (stageData?.map_pool as string[]) || [];
  const vetoFormat = (stageData?.veto_format as VetoFormat) || {
    sequence: ['BAN', 'BAN', 'PICK', 'PICK', 'DECIDER'],
    team_a_first: true,
    time_limit_seconds: 60,
  };

  const { data: completedSteps, error: vetoErr } = await supabase
    .from('map_vetoes')
    .select('*')
    .eq('match_id', matchId)
    .order('step_order', { ascending: true });

  if (vetoErr) {
    return NextResponse.json({ error: vetoErr.message }, { status: 500 });
  }

  const vetoSequence: VetoStepConfig[] = vetoFormat.sequence.map((stepItem, idx) => {
    if (typeof stepItem === 'object' && stepItem !== null) {
      return stepItem as VetoStepConfig;
    }
    const stepNumber = idx + 1;
    let teamSide: 'A' | 'B' | null = null;
    if (stepItem !== 'DECIDER') {
      const isEven = idx % 2 === 1;
      teamSide = vetoFormat.team_a_first ? (isEven ? 'B' : 'A') : (isEven ? 'A' : 'B');
    }
    return {
      step: stepNumber,
      action: stepItem,
      team: teamSide,
    };
  });

  const stepsDone = completedSteps || [];
  const currentStepNumber = stepsDone.length + 1;
  const isComplete = currentStepNumber > vetoSequence.length;

  const currentStepDef = vetoSequence.find((s) => s.step === currentStepNumber);
  let currentTeamId: string | null = null;
  if (currentStepDef?.team === 'A') currentTeamId = match.team_a_id;
  if (currentStepDef?.team === 'B') currentTeamId = match.team_b_id;

  const vetoedMapNames = stepsDone.map((s) => s.map_name);
  const selectedMaps = stepsDone.filter((s) => s.action === 'PICK' || s.action === 'DECIDER').map((s) => s.map_name);

  return NextResponse.json({
    match_id: match.id,
    map_pool: mapPool,
    veto_sequence: vetoSequence,
    completed_steps: stepsDone,
    current_step: isComplete ? null : currentStepNumber,
    current_team_id: currentTeamId,
    selected_maps: selectedMaps,
    vetoed_maps: vetoedMapNames,
    is_complete: isComplete,
  });
}
