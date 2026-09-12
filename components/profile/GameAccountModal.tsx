//components/profile/GameAccountModal.tsx
'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface GameAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId?: string;
  onSuccess?: () => void;
}

export const GameAccountModal: React.FC<GameAccountModalProps> = ({
  isOpen,
  onClose,
  playerId,
  onSuccess,
}) => {
  const [riotId, setRiotId] = useState('');
  const [region, setRegion] = useState('ap');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const supabase = createClient();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!riotId.includes('#')) {
      setErrorMsg('กรุณากรอก Riot ID ให้ถูกต้องตามรูปแบบ (เช่น Viper#TH1)');
      return;
    }

    const [gameName, tagLine] = riotId.split('#');
    if (!gameName || !tagLine) {
      setErrorMsg('กรุณากรอกทั้งชื่อและแท็ก (Tagline)');
      return;
    }

    setLoading(true);

    try {
      // 1. ดึง game_id ของ VALORANT จากตาราง games
      const { data: gameData, error: gameErr } = await supabase
        .from('games')
        .select('id')
        .eq('code', 'VAL')
        .single();

      if (gameErr || !gameData) {
        throw new Error('ไม่พบข้อมูลเกม VALORANT ในระบบ');
      }

      // 2. ดึง player_id หากไม่ได้ส่งเข้ามา
      let targetPlayerId = playerId;
      if (!targetPlayerId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนดำเนินการ');

        const { data: pData } = await supabase
          .from('players')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!pData) throw new Error('ไม่พบโปรไฟล์นักกีฬา');
        targetPlayerId = pData.id;
      }

      // 3. บันทึกลงตาราง game_accounts (สถานะเริ่มต้น UNVERIFIED / MANUAL_REVIEW)
      const externalId = `${gameName.trim()}#${tagLine.trim()}`.toLowerCase();

      const { error: insertErr } = await supabase.from('game_accounts').insert({
        player_id: targetPlayerId,
        game_id: gameData.id,
        external_id: externalId,
        game_name: gameName.trim(),
        tag_line: `#${tagLine.trim()}`,
        region: region,
        verification_status: 'MANUAL_REVIEW',
        is_primary: true,
      });

      if (insertErr) {
        if (insertErr.code === '23505') {
          throw new Error('บัญชีเกมนี้ถูกเชื่อมโยงกับผู้เล่นอื่นในระบบแล้ว');
        }
        throw insertErr;
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('เกิดข้อผิดพลาดในการผูกบัญชี');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#1A1C2E] border border-[#E8B429]/30 rounded-2xl p-6 shadow-2xl relative text-white animate-fadeIn">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white text-lg font-bold"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#FF4655]/20 border border-[#FF4655]/40 flex items-center justify-center text-xl">
            🎯
          </div>
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              ผูกบัญชี VALORANT
            </h2>
            <p className="text-xs text-neutral-400">
              เชื่อมต่อ Riot ID เพื่อรับรองสถานะนักกีฬา
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-400">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
              Riot ID (GameName#Tag)
            </label>
            <input
              type="text"
              placeholder="เช่น Viper#TH1 หรือ Tenz#0001"
              value={riotId}
              onChange={(e) => setRiotId(e.target.value)}
              required
              className="w-full bg-[#0D0E1A] border border-white/10 focus:border-[#E8B429] rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
              ภูมิภาค (Region)
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full bg-[#0D0E1A] border border-white/10 focus:border-[#E8B429] rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all"
            >
              <option value="ap">Asia Pacific (AP - ประเทศไทย)</option>
              <option value="na">North America (NA)</option>
              <option value="eu">Europe (EU)</option>
              <option value="kr">Korea (KR)</option>
            </select>
          </div>

          <div className="p-3 bg-white/5 rounded-xl text-[11px] text-neutral-400 leading-relaxed">
            ℹ️ <span className="text-neutral-300">หมายเหตุ:</span> บัญชีจะได้รับการยืนยันสถานะแบบ <span className="text-[#E8B429] font-bold">MANUAL_REVIEW</span> โดยแอดมินระบบทันที
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-neutral-300 py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-[#E8B429] to-[#b38815] hover:from-[#ffd154] hover:to-[#cfa01f] text-black font-extrabold py-2.5 rounded-xl text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(232,180,41,0.2)] disabled:opacity-50"
            >
              {loading ? 'กำลังบันทึก...' : 'ยืนยันผูกบัญชี'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
