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

    const [rawGameName, rawTagLine] = riotId.split('#');
    const cleanGameName = rawGameName?.trim();
    const cleanTagLine = rawTagLine?.trim().replace(/^#/, '');

    if (!cleanGameName || !cleanTagLine) {
      setErrorMsg('กรุณากรอกทั้งชื่อและแท็ก (Tagline)');
      return;
    }

    setLoading(true);

    try {
      // 1. ตรวจสอบ User Auth Session
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนดำเนินการ');

      let targetPlayerId = playerId;

      // 2. ค้นหาหรือสร้าง Player Profile ตาม Schema
      let pData = null;
      if (targetPlayerId) {
        const { data } = await supabase
          .from('players')
          .select('id')
          .eq('id', targetPlayerId)
          .maybeSingle();
        pData = data;
      }

      if (!pData) {
        const { data } = await supabase
          .from('players')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        pData = data;
      }

      if (!pData?.id) {
        // Gen athlete_id เช่น ZA-XXXX เพื่อไม่ให้ผิด Not-Null Constraint
        const generatedAthleteId = `ZA-${Math.floor(1000 + Math.random() * 9000)}`;
        const rawName = user.email?.split('@')[0] || 'ATHLETE';

        const { data: newPlayer, error: createPlayerErr } = await supabase
          .from('players')
          .insert({
            user_id: user.id,
            athlete_id: generatedAthleteId,
            display_name: cleanGameName || rawName,
            real_name: cleanGameName || rawName,
            ap_balance: 0,
            status: 'PENDING',
          })
          .select('id')
          .single();

        if (createPlayerErr) {
          console.error('[Create Player Error]:', createPlayerErr);
          throw new Error('ไม่สามารถสร้างโปรไฟล์นักกีฬาได้: ' + createPlayerErr.message);
        }
        targetPlayerId = newPlayer.id;
      } else {
        targetPlayerId = pData.id;
      }

      const externalId = `${cleanGameName}#${cleanTagLine}`.toLowerCase();

      // 3. บันทึกข้อมูลลงตาราง game_accounts
      const { data: existingAccount } = await supabase
        .from('game_accounts')
        .select('id')
        .eq('player_id', targetPlayerId)
        .maybeSingle();

      if (existingAccount?.id) {
        const { error: updateErr } = await supabase
          .from('game_accounts')
          .update({
            external_id: externalId,
            game_name: cleanGameName,
            tag_line: cleanTagLine,
            region: region,
            verification_status: 'MANUAL_REVIEW',
            is_primary: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAccount.id);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('game_accounts')
          .insert({
            player_id: targetPlayerId,
            game_id: null,
            external_id: externalId,
            game_name: cleanGameName,
            tag_line: cleanTagLine,
            region: region,
            verification_status: 'MANUAL_REVIEW',
            is_primary: true,
          });

        if (insertErr) {
          if (insertErr.code === '23505') {
            throw new Error('บัญชี Riot ID นี้ถูกผูกกับผู้เล่นอื่นในระบบแล้ว');
          }
          throw insertErr;
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('[DEBUG Riot Binding Error]:', err);
      if (err && typeof err === 'object') {
        const anyErr = err as Record<string, unknown>;
        setErrorMsg(
          (anyErr.message as string) ||
          (anyErr.error_description as string) ||
          (anyErr.details as string) ||
          'เกิดข้อผิดพลาดในการผูกบัญชี'
        );
      } else if (err instanceof Error) {
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
      <div className="w-full max-w-md bg-[#1A1C2E] border border-[#E8B429]/30 rounded-2xl p-6 shadow-2xl relative text-white animate-fadeIn font-mono">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white text-lg font-bold cursor-pointer"
        >
          ✕
        </button>

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
              className="w-full bg-[#0D0E1A] border border-white/10 focus:border-[#E8B429] rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all font-mono"
            >
              <option value="ap">Asia Pacific (AP - ประเทศไทย)</option>
              <option value="na">North America (NA)</option>
              <option value="eu">Europe (EU)</option>
              <option value="kr">Korea (KR)</option>
            </select>
          </div>

          <div className="p-3 bg-white/5 rounded-xl text-[11px] text-neutral-400 leading-relaxed font-mono">
            ℹ️ <span className="text-neutral-300">หมายเหตุ:</span> บัญชีจะได้รับการยืนยันสถานะแบบ <span className="text-[#E8B429] font-bold">MANUAL_REVIEW</span> โดยแอดมินระบบทันที
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-neutral-300 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-mono"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-[#E8B429] to-[#b38815] hover:from-[#ffd154] hover:to-[#cfa01f] text-black font-extrabold py-2.5 rounded-xl text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(232,180,41,0.2)] disabled:opacity-50 cursor-pointer font-mono"
            >
              {loading ? 'กำลังบันทึก...' : 'ยืนยันผูกบัญชี'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};