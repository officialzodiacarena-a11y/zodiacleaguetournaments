// app/tournaments/[tournamentId]/register/page.tsx

import React from 'react';
import Link from 'next/link';
import { TournamentRegistrationFlowData, PlayerEligibilityStatus } from '@/types/registration';
import { ValorantRole } from '@/types/team';
import { submitRegistrationAction } from '@/actions/registration';

// Mock ข้อมูลเริ่มต้นตรงตาม Draft ของอลิสเป๊ะๆ
const mockFlowData: TournamentRegistrationFlowData = {
  tournamentId: 'tour_summer_open_1',
  tournamentName: 'Summer Open I',
  dateRangeText: '14–16 มิ.ย. 2026',
  formatText: '5v5 SINGLE ELIM',
  prizeZpText: 'ZP 1,000',
  statusBadgeText: 'OPEN',
  teamId: 'team_cw_01',
  teamName: 'CELESTIAL WOLVES',
  entryFeeAp: 50,
  entryFeeThbText: '25 THB',
  currentApBalance: 124,
  unverifiedPlayerNotice: 'Phr1sm ยังไม่ได้ยืนยันตัวตน · จะถูกตรวจสอบก่อน deadline',
  checkList: [
    { id: 'c1', label: 'ทีมมีสมาชิกครบ 5 คน', isPassed: true },
    { id: 'c2', label: 'Roster ล็อกแล้ว', isPassed: true },
    { id: 'c3', label: 'ผู้เล่นทุกคนยืนยันตัวตนแล้ว', isPassed: true },
    { id: 'c4', label: 'ค่าสมัคร 50 AP ยังไม่ชำระ', isPassed: false, warningNote: 'จำเป็นต้องชำระก่อนยืนยัน' },
  ],
  roster: [
    {
      id: 'r1',
      userId: 'u1',
      handle: 'SkyNova',
      fullNameTh: 'ณัฐพล เสรีวัฒนา',
      initials: 'SN',
      role: 'DUELIST',
      isCaptain: true,
      isSubstitute: false,
      eligibilityStatus: 'ELIGIBLE',
    },
    {
      id: 'r2',
      userId: 'u2',
      handle: 'KairoX',
      fullNameTh: 'กรวิชญ์ อินทรภักดิ์',
      initials: 'KR',
      role: 'INITIATOR',
      isCaptain: false,
      isSubstitute: false,
      eligibilityStatus: 'ELIGIBLE',
    },
    {
      id: 'r3',
      userId: 'u3',
      handle: 'VoidEx',
      fullNameTh: 'วิชัย ตั้งมั่น',
      initials: 'VX',
      role: 'CONTROLLER',
      isCaptain: false,
      isSubstitute: false,
      eligibilityStatus: 'ELIGIBLE',
    },
    {
      id: 'r4',
      userId: 'u4',
      handle: 'Phr1sm',
      fullNameTh: 'ภูริต สมชาย',
      initials: 'PR',
      role: 'SENTINEL',
      isCaptain: false,
      isSubstitute: false,
      eligibilityStatus: 'UNVERIFIED',
    },
    {
      id: 'r5',
      userId: 'u5',
      handle: 'ZenitH',
      fullNameTh: 'เจนณรงค์ พิทักษ์สิทธิ์',
      initials: 'ZN',
      role: 'FLEX',
      isCaptain: false,
      isSubstitute: false,
      eligibilityStatus: 'ELIGIBLE',
    },
    {
      id: 'r6',
      userId: 'u6',
      handle: 'LunX',
      fullNameTh: 'ลูกน้ำ เพชรสว่าง',
      initials: 'LX',
      role: 'DUELIST',
      isCaptain: false,
      isSubstitute: true,
      eligibilityStatus: 'ELIGIBLE',
    },
    {
      id: 'r7',
      userId: 'u7',
      handle: 'Novara',
      fullNameTh: 'นรวีร์ ดาวเรือง',
      initials: 'NV',
      role: 'INITIATOR',
      isCaptain: false,
      isSubstitute: true,
      eligibilityStatus: 'ELIGIBLE',
    },
  ],
};

const roleBadgeStyles: Record<ValorantRole, { bg: string; border: string; text: string }> = {
  DUELIST: { bg: 'bg-[#ef4444]/15', border: 'border-[#ef4444]/30', text: 'text-[#f87171]' },
  INITIATOR: { bg: 'bg-[#3b82f6]/15', border: 'border-[#3b82f6]/30', text: 'text-[#60a5fa]' },
  CONTROLLER: { bg: 'bg-[#10b981]/15', border: 'border-[#10b981]/30', text: 'text-[#34d399]' },
  SENTINEL: { bg: 'bg-[#eab308]/15', border: 'border-[#eab308]/30', text: 'text-[#fbbf24]' },
  FLEX: { bg: 'bg-[#a855f7]/15', border: 'border-[#a855f7]/30', text: 'text-[#c084fc]' },
};

function renderEligibility(status: PlayerEligibilityStatus) {
  if (status === 'ELIGIBLE') {
    return (
      <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-[#22c55e]">
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#22c55e]/15 border border-[#22c55e] text-[9px]">
          ✓
        </span>
        <span>ELIGIBLE</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-[#fbbf24]">
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#fbbf24]/15 border border-[#fbbf24] text-[9px] font-black">
        !
      </span>
      <span>UNVERIFIED</span>
    </div>
  );
}

export default async function TournamentRegistrationPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const data = mockFlowData;
  const starters = data.roster.filter((p) => !p.isSubstitute);
  const substitutes = data.roster.filter((p) => p.isSubstitute);
  const remainingAp = data.currentApBalance - data.entryFeeAp;

  return (
    <div className="min-h-screen bg-[#0D0E1A] text-[#e9e9ed] font-sans pb-20">
      {/* 1. NAVBAR */}
      <nav className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[#E8B429]/20 bg-[#0D0E1A]/90 px-6 md:px-8 backdrop-blur-md">
        <div className="flex items-center gap-2.5 font-black text-sm tracking-widest text-[#E8B429] uppercase">
          <span className="text-lg">★</span>
          <span>ZODIAC ARENA</span>
        </div>
        <div className="flex items-center gap-6 text-[13px] font-medium text-[#b2b6ca]">
          <Link href="#" className="hover:text-[#E8B429] transition-colors">นักกีฬา</Link>
          <Link href="/teams/team_za_01" className="hover:text-[#E8B429] transition-colors">ทีม</Link>
          <Link href="/tournaments" className="text-[#E8B429]">ลีก</Link>
          <Link href="#" className="hover:text-[#E8B429] transition-colors">Rankings</Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#9184d9] to-[#E8B429] font-bold text-xs text-[#0D0E1A]">
            ZA
          </div>
        </div>
      </nav>

      <main className="max-w-[1100px] mx-auto px-6 pt-9">
        {/* 2. STEP INDICATOR */}
        <div className="flex items-center justify-center mb-8">
          {/* Step 1: Done */}
          <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[200px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#9184d9] bg-[#9184d9]/15 text-[#9184d9] font-bold">
              ✓
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold tracking-wider text-[#9184d9] uppercase">เลือกทีม</div>
              <div className="text-[9px] font-semibold tracking-widest text-[#75798c]">SELECT TEAM</div>
            </div>
          </div>
          <div className="flex-1 h-[1px] max-w-[60px] bg-gradient-to-r from-[#9184d9]/50 to-[#E8B429]/50 -mt-6" />

          {/* Step 2: Active */}
          <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[200px]">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#E8B429] bg-[#E8B429]/15 text-[#E8B429] font-black text-base shadow-[0_0_16px_rgba(232,180,41,0.35)]">
              2
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold tracking-wider text-[#E8B429] uppercase">ตรวจสอบ Roster</div>
              <div className="text-[9px] font-semibold tracking-widest text-[#E8B429]/70">VERIFY ROSTER</div>
            </div>
          </div>
          <div className="flex-1 h-[1px] max-w-[60px] bg-white/10 -mt-6" />

          {/* Step 3: Locked */}
          <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[200px] opacity-45">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/20 bg-white/5 text-white/50 text-sm">
              🔒
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold tracking-wider text-[#9397ab] uppercase">ยืนยัน</div>
              <div className="text-[9px] font-semibold tracking-widest text-[#75798c]">CONFIRM</div>
            </div>
          </div>
        </div>

        {/* 3. TOURNAMENT INFO BAR */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E8B429]/25 bg-gradient-to-r from-[#E8B429]/10 to-[#9184d9]/10 px-5 py-3 mb-7">
          <span className="text-xs font-extrabold tracking-widest text-[#E8B429] uppercase">{data.tournamentName}</span>
          <span className="text-[#E8B429]/30">·</span>
          <span className="text-xs text-[#cfd3e5]">{data.dateRangeText}</span>
          <span className="text-[#E8B429]/30">·</span>
          <span className="text-xs font-semibold tracking-wider text-[#cfd3e5]">{data.formatText}</span>
          <span className="text-[#E8B429]/30">·</span>
          <div className="flex items-center gap-1 text-xs font-bold text-[#E8B429]">
            <span>🏆</span>
            <span>{data.prizeZpText}</span>
          </div>
          <div className="ml-auto">
            <span className="rounded border border-[#9184d9]/35 bg-[#9184d9]/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#9184d9]">
              {data.statusBadgeText}
            </span>
          </div>
        </div>

        {/* 4. TWO COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
          {/* Left: Roster List */}
          <div className="rounded-xl border border-[#E8B429]/20 bg-[#1A1C2E] overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 p-4 md:p-5">
              <div>
                <h2 className="text-base font-extrabold tracking-wide text-white">
                  Roster ของคุณ <span className="text-white/30 font-normal">·</span>{' '}
                  <span className="text-[#E8B429]">YOUR ROSTER</span>
                </h2>
                <p className="text-[11px] text-[#9397ab] mt-0.5">{data.tournamentName} · ทีม: {data.teamName}</p>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-[#E8B429]">{starters.length} / 5 ผู้เล่นหลัก</div>
                <div className="text-[11px] text-[#9397ab]">{substitutes.length} / 2 ตัวสำรอง</div>
              </div>
            </div>

            {/* Starters */}
            <div className="divide-y divide-white/5">
              {starters.map((player) => {
                const badge = roleBadgeStyles[player.role];
                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3.5 p-3.5 md:px-5 transition-colors ${
                      player.eligibilityStatus === 'UNVERIFIED' ? 'bg-[#eab308]/[0.04]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-[#9184d9] to-[#5d5294] font-extrabold text-sm text-white">
                        {player.initials}
                      </div>
                      {player.isCaptain && (
                        <div className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#E8B429] text-[8px] text-[#0D0E1A] font-bold border border-[#1A1C2E]">
                          ★
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white tracking-wide">{player.handle}</span>
                        {player.isCaptain && (
                          <span className="rounded border border-[#E8B429]/30 bg-[#E8B429]/15 px-1.5 py-0.2 text-[9px] font-bold tracking-wider text-[#E8B429]">
                            CAPTAIN
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#9397ab] truncate">{player.fullNameTh}</div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span className={`rounded border px-2 py-0.5 text-[9px] font-bold tracking-wider ${badge.bg} ${badge.border} ${badge.text}`}>
                        {player.role}
                      </span>
                      {renderEligibility(player.eligibilityStatus)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Substitutes */}
            {substitutes.length > 0 && (
              <>
                <div className="flex items-center gap-2.5 px-5 py-2.5 bg-white/[0.02] border-t border-b border-white/5">
                  <span className="text-[10px] font-bold tracking-widest text-[#75798c] uppercase">
                    ตัวสำรอง / SUBSTITUTES
                  </span>
                  <div className="h-[1px] flex-1 bg-white/5" />
                </div>
                <div className="divide-y divide-white/5">
                  {substitutes.map((sub) => {
                    const badge = roleBadgeStyles[sub.role];
                    return (
                      <div key={sub.id} className="flex items-center gap-3.5 p-3 md:px-5 opacity-80 hover:opacity-100">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-dashed border-white/20 bg-white/5 text-xs font-bold text-[#b2b6ca]">
                          {sub.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white truncate">{sub.handle}</div>
                          <div className="text-[10px] text-[#75798c] truncate">{sub.fullNameTh}</div>
                        </div>
                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${badge.bg} ${badge.border} ${badge.text}`}>
                            {sub.role}
                          </span>
                          {renderEligibility(sub.eligibilityStatus)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Right: Checklist & Balance */}
          <div className="flex flex-col gap-4">
            {/* Checklist */}
            <div className="rounded-xl border border-[#9184d9]/25 bg-[#1A1C2E] p-4">
              <div className="text-[11px] font-bold tracking-widest text-[#b2b6ca] uppercase mb-3">
                ตรวจสอบสิทธิ์ · ELIGIBILITY
              </div>
              <div className="flex flex-col gap-2.5">
                {data.checkList.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2.5 rounded-lg p-2 ${
                      item.isPassed ? '' : 'border border-[#eab308]/25 bg-[#eab308]/10'
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 mt-0.5 ${
                        item.isPassed
                          ? 'border border-[#22c55e]/50 bg-[#22c55e]/20 text-[#22c55e]'
                          : 'border border-[#fbbf24]/50 bg-[#fbbf24]/20 text-[#fbbf24]'
                      }`}
                    >
                      {item.isPassed ? '✓' : '!'}
                    </div>
                    <div>
                      <div
                        className={`text-xs font-medium leading-relaxed ${
                          item.isPassed ? 'text-[#cfd3e5]' : 'font-bold text-[#fbbf24]'
                        }`}
                      >
                        {item.label}
                      </div>
                      {item.warningNote && (
                        <div className="text-[10px] text-[#fbbf24]/80 mt-0.5">{item.warningNote}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AP Balance */}
            <div className="rounded-xl border border-[#E8B429]/20 bg-[#1A1C2E] p-4">
              <div className="text-[10px] font-bold tracking-widest text-[#75798c] uppercase mb-2">AP BALANCE</div>
              <div className="flex items-baseline gap-1.5 mb-1.5">
                <span className="text-3xl font-black text-[#E8B429] leading-none">{data.currentApBalance}</span>
                <span className="text-xs font-bold text-[#E8B429]/70">AP</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded bg-white/10 mb-2">
                <div
                  className="h-full bg-gradient-to-r from-[#E8B429] to-[#f59e0b]"
                  style={{ width: `${Math.min(100, (data.currentApBalance / 200) * 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-[#75798c]">
                หลังชำระ: <span className="font-bold text-white">{remainingAp} AP เหลือ</span>
              </div>
            </div>

            {/* Unverified Notice */}
            {data.unverifiedPlayerNotice && (
              <div className="flex items-start gap-2.5 rounded-lg border border-[#eab308]/20 bg-[#eab308]/5 p-3 text-[11px] text-[#fbbf24]/90 leading-relaxed">
                <span className="font-bold">⚠️</span>
                <span>{data.unverifiedPlayerNotice}</span>
              </div>
            )}
          </div>
        </div>

        {/* 5. ACTION BAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#1A1C2E] p-4 md:p-5 mt-6">
          <div className="text-xs text-[#75798c]">
            <span className="font-bold text-[#cfd3e5]">{data.entryFeeAp} AP = {data.entryFeeThbText}</span>
            <span className="mx-2 text-white/20">·</span>
            <span>หรือใช้ AP ที่สะสมไว้</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/tournaments"
              className="rounded-lg border border-[#9184d9]/40 bg-transparent px-5 py-2.5 text-xs font-bold tracking-wider text-[#cfd3e5] hover:border-[#9184d9] hover:text-white transition-colors"
            >
              ย้อนกลับ / BACK
            </Link>
            <form
              action={async () => {
                'use server';
                await submitRegistrationAction(tournamentId, data.teamId);
              }}
            >
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-[#E8B429] to-[#d97706] px-6 py-2.5 text-xs font-black tracking-wider text-[#0D0E1A] shadow-[0_4px_20px_rgba(232,180,41,0.35)] hover:shadow-[0_6px_28px_rgba(232,180,41,0.55)] transition-all"
              >
                ชำระค่าสมัครและยืนยัน / PAY {data.entryFeeAp} AP & CONFIRM
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
