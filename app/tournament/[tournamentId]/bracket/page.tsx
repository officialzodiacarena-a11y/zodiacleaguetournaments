// app/tournaments/[tournamentId]/bracket/page.tsx

import React from 'react';
import { TournamentBracketPageData } from '@/types/bracket';
import { TournamentBracketView } from '@/components/tournament-bracket-view';

// Mock ข้อมูลเริ่มต้นตรงตาม Draft ของอลิสเป๊ะๆ
const mockBracketData: TournamentBracketPageData = {
  tournamentName: 'SUMMER OPEN I',
  subMetaText: '14–16 มิ.ย. 2026 · 5v5 SINGLE ELIMINATION · 8 TEAMS',
  prizePoolText: '฿50,000',
  qfMatches: [
    {
      matchNumber: 1,
      status: 'COMPLETED',
      teamA: { name: 'ZODIAC APEX', tag: 'ZA', seedText: '#1 SEED', score: 2, isWinner: true },
      teamB: { name: 'NOVA STORM', tag: 'NS', seedText: '#8 SEED', score: 0, isWinner: false },
      seriesScoreText: '2 : 0',
      mapResults: [
        { mapName: 'Ascent', mapNumberLabel: 'Map 1', scoreA: 13, scoreB: 7, isWinA: true },
        { mapName: 'Haven', mapNumberLabel: 'Map 2', scoreA: 11, scoreB: 13, isWinA: false },
        { mapName: 'Icebox', mapNumberLabel: 'Map 3', scoreA: 13, scoreB: 9, isWinA: true },
      ],
      mvp: { handle: 'VIPER_99', initials: 'V9', acs: 312, kd: 2.4 },
    },
    {
      matchNumber: 2,
      status: 'LIVE',
      teamA: { name: 'STELLAR FORCE', tag: 'SF', seedText: '#4 SEED', score: 1 },
      teamB: { name: 'CELESTIAL VEIL', tag: 'CV', seedText: '#5 SEED', score: 1 },
      seriesScoreText: '1 : 1',
      mapResults: [
        { mapName: 'Bind', mapNumberLabel: 'Map 1', scoreA: 13, scoreB: 10, isWinA: true },
        { mapName: 'Haven', mapNumberLabel: 'Map 2', scoreA: 8, scoreB: 5, isWinA: true },
      ],
      mvp: { handle: 'STARGAZER', initials: 'SG', acs: 280, kd: 1.9 },
    },
    {
      matchNumber: 3,
      status: 'UPCOMING',
      teamA: { name: 'IRON ARIES', tag: 'IR', seedText: '#3 SEED', score: '—' },
      teamB: { name: 'SOLAR BLAZE', tag: 'SB', seedText: '#6 SEED', score: '—' },
    },
    {
      matchNumber: 4,
      status: 'UPCOMING',
      teamA: { name: 'DARK WAVE', tag: 'DW', seedText: '#2 SEED', score: '—' },
      teamB: { name: 'PHANTOM VEGA', tag: 'PH', seedText: '#7 SEED', score: '—' },
    },
  ],
};

export default async function TournamentBracketPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  
  // นำ tournamentId มาใช้งานจริงกับ Title / ID ของหน้า
  const data: TournamentBracketPageData = {
    ...mockBracketData,
    tournamentName: tournamentId ? `${mockBracketData.tournamentName}` : mockBracketData.tournamentName,
  };

  return <TournamentBracketView data={data} />;
}
