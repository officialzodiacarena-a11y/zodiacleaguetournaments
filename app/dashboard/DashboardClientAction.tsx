//app/dashboard/DashboardClientAction.tsx
'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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
  const [isUnlinking, setIsUnlinking] = useState(false);
  const supabase = createClient();

  const isVerified = gameAccount?.verification_status === 'VERIFIED';
  const isPending =
    gameAccount?.verification_status === 'PENDING' ||
    gameAccount?.verification_status === 'MANUAL_REVIEW';

  const handleUnlink = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการผูกบัญชี Riot ID นี้?')) {
      return;
    }

    setIsUnlinking(true);
    try {
      let query = supabase.from('game_accounts').delete();

      if (gameAccount?.id) {
        query = query.eq('id', gameAccount.id);
      } else if (playerId) {
        query = query.eq('player_id', playerId);
      }

      const { error } = await query;
      if (error) throw error;

      window.location.reload();
    } catch (err: unknown) {
      console.error('Error unlinking account:', err);
      alert('เกิดข้อผิดพลาดในการยกเลิกการผูกบัญชี');
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <>
      {/* BANNER: เชื่อมต่อ Riot ID / สถานะการตรวจสอบ */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#121424] via-[#1A1C2E] to-[#121424] border border-[#E8B429]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl font-mono">
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
                : isPending
                ? 'บัญชีส่งคำขอแล้ว อยู่ระหว่างการตรวจสอบรับรองสถานะ'
                : 'เชื่อมต่อ Riot ID เพื่อรับรองสิทธิ์เข้าแข่งขันทัวร์นาเมนต์และบันทึกสถิติ'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {gameAccount ? (
            <>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 font-bold rounded-xl text-xs tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap"
              >
                แก้ไข Riot ID
              </button>

              <button
                type="button"
                onClick={handleUnlink}
                disabled={isUnlinking}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-400 hover:text-white font-bold rounded-xl text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {isUnlinking ? 'กำลังยกเลิก...' : 'ยกเลิกการผูก'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-[#E8B429] to-[#b38815] hover:from-[#ffd154] hover:to-[#cfa01f] text-black font-extrabold rounded-xl text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(232,180,41,0.2)] cursor-pointer whitespace-nowrap"
            >
              + ผูกบัญชี RIOT ID
            </button>
          )}
        </div>
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