'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function LivePage() {
  const [matchId, setMatchId] = useState<string>('');
  
  // Just use an iframe to the stream-hub and we'll add a viewer mode to it
  return (
    <div className="w-full h-screen bg-black overflow-hidden m-0 p-0">
      <iframe 
        src={/stream-hub?viewer=true}
        className="w-full h-full border-none"
        allowFullScreen
      />
    </div>
  );
}
