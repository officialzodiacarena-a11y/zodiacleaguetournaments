//app/dashboard/DashboardClientAction.tsx
'use client';

import React, { useState } from 'react';
import { GameAccountModal } from '@/components/profile/GameAccountModal';

interface GameAccountData {
  id?: string;
  game_name: string;
  tag_line: string;
  region?: string;
  verification_status: string;
}

interface Props {
  playerId: string;
  gameAccount: GameAccountData | null;
}

export default function DashboardClientAction({ playerId, gameAccount }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isVerified = gameAccount?.verification_status === 'VERIFIED';
  const isPending =
    gameAccount?.verification_status === 'PENDING' ||
    gameAccount?.verification_status === 'MANUAL_REVIEW';

  return (
    <>
      {/* BANNER: เชื่อมต่อ Riot ID / สถานะการตรวจสอบ */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#121424] via-[#1A1C2E] to-[#121424] border border-[#E8B429]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FF4655]/20 border border-[#FF4655]/40 flex items-center justify-center text-2xl shrink-0">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm md:text-base font-bold text-white uppercase tracking-wider">
                {gameAccount
                  ? `RIOT ID: ${gameAccount.game_name}#${gameAccount.tag_line.replace(/^#/, '')}`
                  : 'เชื่อมต่อบัญชี VALORANT (Riot ID)'}
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
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
            <p className="text-xs text-neutral-400 mt-1">
              {isVerified
                ? 'บัญชีของคุณได้รับการยืนยันสถานะนักกีฬา พร้อมเข้าแข่งขันเรียบร้อยแล้ว'
                : 'เชื่อมต่อ Riot ID เพื่อรับรองสิทธิ์เข้าแข่งขันทัวร์นาเมนต์และบันทึกสถิติ'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-[#E8B429] to-[#b38815] hover:from-[#ffd154] hover:to-[#cfa01f] text-black font-extrabold rounded-xl text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(232,180,41,0.2)] cursor-pointer whitespace-nowrap shrink-0"
        >
          {gameAccount ? 'แก้ไข / ยืนยัน Riot ID' : '+ ผูกบัญชี RIOT ID'}
        </button>
      </div>

      {/* MODAL DIALOG */}
      <GameAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        playerId={playerId}
        onSuccess={() => {
          setIsModalOpen(false);
          window.location.reload();
        }}
      />
    </>
  );
}
