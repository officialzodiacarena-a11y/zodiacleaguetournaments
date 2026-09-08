import React from 'react';
import type { TournamentBracketPageData } from '@/types/bracket';
import { TournamentBracketView } from '@/components/tournament-bracket-view';

interface PageProps {
  params: Promise<{ tournamentId: string }>;
}

// Mock ข้อมูลเริ่มต้นตรงตาม Double Elimination 12 Teams SSOT
const mockBracketData: TournamentBracketPageData = {
  tournamentId: 'tour_summer_open_1',
  tournamentName: 'SUMMER OPEN I',
  subMetaText: '14–16 มิ.ย. 2026 · 5v5 DOUBLE ELIMINATION · 12 TEAMS',
  prizeZpText: '10,000 ZP + 1,000 CP',
  matches: [
    {
      id: 'UB_R1_M1',
      stageId: 'stage_de12_01',
      matchNumber: 1,
      bracketType: 'UPPER',
      roundNumber: 1,
      positionInRound: 1,
      bestOf: 3,
      status: 'COMPLETED',
      scoreA: 2,
      scoreB: 0,
      teamA: { id: 'team_za_01', name: 'ZODIAC APEX', tag: 'ZA', seed: 1 },
      teamB: { id: 'team_ns_08', name: 'NOVA STORM', tag: 'NS', seed: 8 },
      winnerTeamId: 'team_za_01',
    },
    {
      id: 'UB_R1_M2',
      stageId: 'stage_de12_01',
      matchNumber: 2,
      bracketType: 'UPPER',
      roundNumber: 1,
      positionInRound: 2,
      bestOf: 3,
      status: 'LIVE',
      scoreA: 1,
      scoreB: 1,
      teamA: { id: 'team_sf_04', name: 'STELLAR FORCE', tag: 'SF', seed: 4 },
      teamB: { id: 'team_cv_05', name: 'CELESTIAL VEIL', tag: 'CV', seed: 5 },
    },
    {
      id: 'UB_R1_M3',
      stageId: 'stage_de12_01',
      matchNumber: 3,
      bracketType: 'UPPER',
      roundNumber: 1,
      positionInRound: 3,
      bestOf: 3,
      status: 'READY',
      scoreA: 0,
      scoreB: 0,
      teamA: { id: 'team_ir_03', name: 'IRON ARIES', tag: 'IR', seed: 3 },
      teamB: { id: 'team_sb_06', name: 'SOLAR BLAZE', tag: 'SB', seed: 6 },
    },
    {
      id: 'UB_R1_M4',
      stageId: 'stage_de12_01',
      matchNumber: 4,
      bracketType: 'UPPER',
      roundNumber: 1,
      positionInRound: 4,
      bestOf: 3,
      status: 'READY',
      scoreA: 0,
      scoreB: 0,
      teamA: { id: 'team_dw_02', name: 'DARK WAVE', tag: 'DW', seed: 2 },
      teamB: { id: 'team_ph_07', name: 'PHANTOM VEGA', tag: 'PH', seed: 7 },
    },
    {
      id: 'LB_R1_M1',
      stageId: 'stage_de12_01',
      matchNumber: 5,
      bracketType: 'LOWER',
      roundNumber: 1,
      positionInRound: 1,
      bestOf: 3,
      status: 'PENDING',
      scoreA: 0,
      scoreB: 0,
      teamA: { id: 'team_ns_08', name: 'NOVA STORM', tag: 'NS', seed: 8 },
      teamB: undefined,
    },
  ],
  mvpPlayer: {
    playerId: 'p_vip_01',
    displayName: 'VIPER_99',
    gameName: 'Viper',
    tagLine: 'TH1',
    acs: 312,
    kd: '2.40',
  },
};

export default async function TournamentBracketPage({ params }: PageProps) {
  const { tournamentId } = await params;

  const data: TournamentBracketPageData = {
    ...mockBracketData,
    tournamentId: tournamentId || mockBracketData.tournamentId,
    tournamentName: tournamentId ? `${mockBracketData.tournamentName}` : mockBracketData.tournamentName,
  };

  return <TournamentBracketView data={data} />;
}
