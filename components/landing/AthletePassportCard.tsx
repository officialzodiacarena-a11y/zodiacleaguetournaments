'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { UserCheck, Users, ArrowRight, RefreshCw } from 'lucide-react';

export default function AthletePassportCard() {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="h-[300px] [perspective:1000px]">
      <div 
        className={`relative h-full w-full rounded-xl transition-transform duration-500 [transform-style:preserve-3d] shadow-xl ${
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        {/* --- ด้านหน้า: ATHLETE PASSPORT --- */}
        <div className="absolute inset-0 h-full w-full rounded-xl border border-white/5 bg-[#101223] p-6 [backface-visibility:hidden] flex flex-col justify-between hover:border-[#00D4FF]/40 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00D4FF]/15 border border-[#00D4FF]/30 text-[#00D4FF]">
                <UserCheck className="w-6 h-6" />
              </div>
              <button 
                type="button"
                onClick={() => setIsFlipped(true)}
                className="flex items-center gap-1.5 text-[10px] font-mono text-[#00D4FF] bg-[#00D4FF]/10 hover:bg-[#00D4FF]/20 border border-[#00D4FF]/30 px-2 py-1 rounded-md transition-all cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>ดูสเปกในตลาด</span>
              </button>
            </div>
            <h4 className="text-base font-black text-[#00D4FF]">
              ATHLETE PASSPORT
            </h4>
            <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
              เก็บบันทึกประวัติ ผลงานเรตติ้ง KDA, ACS, ADR และเหรียญเกียรติยศระดับสโมสร
            </p>
          </div>

          <div className="mt-4 pt-2 border-t border-white/5 flex items-center justify-between">
            <Link
              href="/profile"
              className="flex items-center gap-1 text-[11px] font-mono text-[#00D4FF] font-bold hover:underline"
            >
              <span>ดูพาสปอร์ตนักกีฬา</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* --- ด้านหลัง: ATHLETE TRANSFER MARKET --- */}
        <div className="absolute inset-0 h-full w-full rounded-xl border-2 border-[#E8B429] bg-gradient-to-br from-[#1A1810] via-[#121424] to-[#0D0E1A] p-5 text-white [transform:rotateY(180deg)] [backface-visibility:hidden] flex flex-col justify-between shadow-[0_0_30px_rgba(232,180,41,0.25)]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#E8B429]" />
                <span className="text-[11px] font-black font-mono tracking-wider text-[#E8B429] uppercase">
                  ATHLETE MARKET
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setIsFlipped(false)}
                className="text-[10px] font-mono text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded border border-white/10 cursor-pointer"
              >
                ← กลับหน้าพาสปอร์ต
              </button>
            </div>

            <p className="text-[11px] text-zinc-300 font-medium line-clamp-2">
              ตลาดประมูลและย้ายสังกัดนักกีฬา (FFXI Blind Auction & Buyout)
            </p>

            <div className="mt-2.5 p-2 rounded-xl bg-black/50 border border-white/10 space-y-1 font-mono text-[10px]">
              <div className="flex justify-between items-center">
                <span className="text-white font-bold">SHADOW_ZX #TH1</span>
                <span className="text-[#E8B429] font-bold">IMMORTAL 3</span>
              </div>
              <div className="flex justify-between text-zinc-400 text-[9px]">
                <span>ROLE: DUELIST</span>
                <span className="text-[#00D4FF]">ACS 274 • K/D 1.87</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/10 text-[10px]">
                <span className="text-zinc-400">BID START:</span>
                <span className="text-[#E8B429] font-black">2,500 AP</span>
              </div>
            </div>
          </div>

          <Link
            href="/marketplace/athletes"
            className="w-full text-center py-2 rounded-lg bg-[#E8B429] hover:bg-[#ffc935] text-black font-black text-[11px] tracking-wider uppercase transition-all shadow-md font-mono mt-1"
          >
            เข้าสู่ตลาดซื้อขายนักกีฬา →
          </Link>
        </div>
      </div>
    </div>
  );
}
