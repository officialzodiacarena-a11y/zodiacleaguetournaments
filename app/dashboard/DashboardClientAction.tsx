// app/dashboard/DashboardClientAction.tsx
'use client';

import React, { useState } from 'react';
import { GameAccountModal } from '@/components/profile/GameAccountModal';

interface Props {
  playerId: string;
  gameAccount: {
    game_name: string;
    tag_line: string;
    region: string;
    verification_status: string;
  } | null;
}

export default function DashboardClientAction({ playerId, gameAccount }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const isVerified = gameAccount?.verification_status === 'VERIFIED';
  const isPending =
    gameAccount?.verification_status === 'PENDING' ||
    gameAccount?.verification_status === 'MANUAL_REVIEW';

  return (
    <>
      <div className="p-4 md:p-5 rounded-xl bg-gradient-to-r from-[#12121A] to-[#1A1C2E] border border-[#00D4FF]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#FF4655]/20 border border-[#FF4655]/40 flex items-center justify-center text-xl shrink-0">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs md:text-sm font-bold text-white uppercase tracking-wider">
                {gameAccount
                  ? `RIOT ID: ${gameAccount.game_name}#${gameAccount.tag_line.replace(/^#/, '')}`
                  : 'VALORANT ATHLETE PASSPORT'}
              </h3>
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                  isVerified
                    ? 'bg-[#4CAF50]/20 text-[#4CAF50] border border-[#4CAF50]/40'
                    : isPending
                    ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                    : 'bg-red-500/20 text-red-400 border border-red-500/40'
                }`}
              >
                {isVerified ? 'VERIFIED' : isPending ? 'PENDING REVIEW' : 'UNLINKED'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {isVerified
                ? 'บัญชีได้รับการยืนยันแล้ว สามารถเข้าร่วมการแข่งขันและเก็บคะแนน ZP ได้'
                : 'เชื่อมต่อ Riot ID เพื่อรับรองสิทธิ์และเข้าร่วมทัวร์นาเมนต์'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-[#00D4FF] to-[#0099b8] hover:from-[#33ddff] hover:to-[#00b4d8] text-black font-black rounded-lg text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(0,212,255,0.25)] cursor-pointer whitespace-nowrap shrink-0"
        >
          {gameAccount ? 'แก้ไข / ยืนยัน Riot ID' : '+ เชื่อมต่อ RIOT ID'}
        </button>
      </div>

      <GameAccountModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        playerId={playerId}
        onSuccess={() => {
          setIsOpen(false);
          window.location.reload();
        }}
      />
    </>
  );
}
