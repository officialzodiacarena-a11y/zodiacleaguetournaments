const fs = require('fs');

const path = 'app/live/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = 'use client';
import { useEffect, useState } from 'react';

export default function LivePage() {
  const [matchId, setMatchId] = useState<string>('');
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mId = params.get('matchId');
    if (mId) setMatchId(mId);
  }, []);

  // Construct iframe src
  let src = '/stream-hub?viewer=true';
  if (matchId) {
    src += '&matchId=' + matchId;
  }
  
  return (
    <div className="w-full h-screen bg-black overflow-hidden m-0 p-0">
      <iframe 
        src={src}
        className="w-full h-full border-none"
        allowFullScreen
      />
    </div>
  );
}
;

fs.writeFileSync(path, content, 'utf8');
