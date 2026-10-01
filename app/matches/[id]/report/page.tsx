'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportMatchPage({ params }: { params: { id: string } }) {
  const [winnerTeamId, setWinnerTeamId] = useState<string>('');
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const router = useRouter();

  // Mock props based on the spec requirement
  // In reality these should be fetched from the server.
  const stageType: string = 'GROUP_STAGE'; // ROUND_ROBIN, GROUP_STAGE
  const bestOf = 2;

  const showDrawButton = stageType === 'ROUND_ROBIN' || stageType === 'GROUP_STAGE' || bestOf === 2;

  async function handleSubmit(isRefereeDraw: boolean = false) {
    const isLeague = stageType === 'ROUND_ROBIN' || stageType === 'GROUP_STAGE';
    const endpoint = isLeague ? `/api/v1/matches/${params.id}/report-league` : `/api/v1/matches/${params.id}/report`;
    
    // Auto-infer draw if scores are tied in a BO2, or if Referee forced a draw.
    const isAutoDraw = scoreA === scoreB && scoreA > 0;
    const isDraw = isRefereeDraw || isAutoDraw;
    
    // For non-draws, if winnerTeamId is empty, it will fail UUID validation, so we send the raw string unless it's a draw.
    const finalWinnerId = isDraw ? null : (winnerTeamId || null);
    const body = { winnerTeamId: finalWinnerId, scoreA, scoreB };
    
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (res.ok) {
      alert('Reported successfully');
      router.push(`/matches/${params.id}/lobby`);
    } else {
      alert('Error reporting match');
    }
  }

  return (
    <div className="p-4 bg-[#0A0A0F] text-white min-h-screen">
      <h1 className="text-xl font-bold mb-4">Report Match Result</h1>
      <div className="flex flex-col gap-4 max-w-sm">
        <label>
          Winner Team ID:
          <input className="text-black ml-2" value={winnerTeamId} onChange={e => setWinnerTeamId(e.target.value)} />
        </label>
        <label>
          Score A:
          <input type="number" className="text-black ml-2" value={scoreA} onChange={e => setScoreA(Number(e.target.value))} />
        </label>
        <label>
          Score B:
          <input type="number" className="text-black ml-2" value={scoreB} onChange={e => setScoreB(Number(e.target.value))} />
        </label>
        
        <button onClick={() => handleSubmit(false)} className="bg-blue-500 p-2 rounded">
          SUBMIT RESULT REPORT
        </button>

        {showDrawButton && (
          <div className="border border-yellow-500 p-4 mt-4">
            <h3>Referee Panel</h3>
            <button onClick={() => handleSubmit(true)} className="bg-yellow-500 text-black p-2 rounded w-full">
              เสมอ (Draw 1-1)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}