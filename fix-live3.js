const fs = require('fs');
let content = fs.readFileSync('app/live/page.tsx', 'utf8');

const podiumCode = 
      {activeScene === 'PODIUM' && (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#0a0a0c] relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/img/cyber-grid.png')] opacity-10 pointer-events-none" />
          
          <div className="z-10 flex flex-col items-center mb-12">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#E8B429] to-[#F3D370] tracking-wider uppercase drop-shadow-[0_0_15px_rgba(232,180,41,0.5)] text-center">
              ZODIAC LEAGUE : VALORANT
            </h1>
            <h2 className="text-3xl font-bold text-gray-300 mt-4 tracking-[0.2em] text-center">
              WINTER SPLIT 2026 - FINAL STANDINGS
            </h2>
          </div>

          <div className="z-10 flex items-end justify-center gap-8 h-[500px]">
            {/* 2nd Place */}
            <div className="flex flex-col items-center transform translate-y-16">
              <div className="w-48 h-48 rounded-full bg-[#1c1c1f] border-4 border-[#C0C0C0] p-6 flex items-center justify-center shadow-[0_0_30px_rgba(192,192,192,0.3)] z-20 mb-[-40px]">
                <img src="/images/Team_Logo/PWE.png" alt="POWER UP" className="w-full h-full object-contain drop-shadow-xl" />
              </div>
              <div className="w-56 h-72 bg-gradient-to-b from-[#C0C0C0]/20 to-[#0a0a0c] border-t-4 border-x border-[#C0C0C0]/50 rounded-t-xl flex flex-col items-center pt-16">
                <span className="text-4xl font-black text-[#C0C0C0]">2ND</span>
                <span className="text-xl font-bold text-white mt-2">POWER UP</span>
                <div className="mt-6 flex flex-col items-center bg-black/60 px-6 py-3 rounded-xl border border-[#C0C0C0]/30 shadow-inner">
                  <span className="text-sm text-gray-400 font-medium">TOTAL PRIZE</span>
                  <span className="text-2xl font-black text-[#E8B429] drop-shadow-md">1,500 ZP</span>
                </div>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center z-30">
              <div className="w-64 h-64 rounded-full bg-[#1c1c1f] border-4 border-[#FFD700] p-8 flex items-center justify-center shadow-[0_0_50px_rgba(255,215,0,0.5)] mb-[-50px]">
                <img src="/images/Team_Logo/ICE.png" alt="ICEBERG" className="w-full h-full object-contain drop-shadow-2xl" />
              </div>
              <div className="w-64 h-96 bg-gradient-to-b from-[#FFD700]/30 to-[#0a0a0c] border-t-4 border-x border-[#FFD700]/60 rounded-t-xl flex flex-col items-center pt-20">
                <span className="text-6xl font-black text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]">1ST</span>
                <span className="text-3xl font-black text-white mt-2 uppercase tracking-wide">ICEBERG</span>
                <div className="mt-8 flex flex-col items-center bg-black/60 px-8 py-4 rounded-xl border border-[#FFD700]/50 shadow-[0_0_20px_rgba(255,215,0,0.2)]">
                  <span className="text-sm text-gray-300 font-medium">CHAMPION PRIZE</span>
                  <span className="text-4xl font-black text-[#E8B429] drop-shadow-lg">2,000 ZP</span>
                </div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center transform translate-y-32">
              <div className="w-40 h-40 rounded-full bg-[#1c1c1f] border-4 border-[#CD7F32] p-5 flex items-center justify-center shadow-[0_0_20px_rgba(205,127,50,0.3)] z-20 mb-[-30px]">
                <img src="/images/Team_Logo/MR.png" alt="MONARCH" className="w-full h-full object-contain drop-shadow-lg" />
              </div>
              <div className="w-48 h-56 bg-gradient-to-b from-[#CD7F32]/20 to-[#0a0a0c] border-t-4 border-x border-[#CD7F32]/50 rounded-t-xl flex flex-col items-center pt-12">
                <span className="text-3xl font-black text-[#CD7F32]">3RD</span>
                <span className="text-lg font-bold text-white mt-2">MONARCH</span>
                <div className="mt-4 flex flex-col items-center bg-black/60 px-4 py-2 rounded-xl border border-[#CD7F32]/30 shadow-inner">
                  <span className="text-xs text-gray-400 font-medium">TOTAL PRIZE</span>
                  <span className="text-xl font-black text-[#E8B429]">1,250 ZP</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-8 right-8 text-gray-500 font-mono text-xs flex flex-col items-end gap-1">
            <span>* BASE REWARD: 1,000 ZP / TEAM</span>
            <span>* 1ST BONUS: +1,000 ZP | 2ND BONUS: +500 ZP | 3RD BONUS: +250 ZP</span>
          </div>
        </div>
      )}
\;;

const code = 
const fs = require('fs');
let content = fs.readFileSync('app/live/page.tsx', 'utf8');
content = content.replace('    </div>\\n  );\\n}', podiumCode + '\\n    </div>\\n  );\\n}');
fs.writeFileSync('app/live/page.tsx', content, 'utf8');
;
fs.writeFileSync('do-it.js', podiumCode + code, 'utf8');
