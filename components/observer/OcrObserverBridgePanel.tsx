'use client';

// components/observer/OcrObserverBridgePanel.tsx
// SPEC-OCR-TELEMETRY-ROUNDS-V8.01-001 Part 1 + Part 3
// รวม 3 ส่วนตามสเป็คไว้ในแผงเดียว (ไม่แยกเป็น 3 ไฟล์ตามชื่อ component ในสเป็คตรงๆ เพื่อลด prop-drilling
// ระหว่างกัน เพราะ state ของทั้ง 3 ส่วนผูกกันแน่น — roster lock ต้องเสร็จก่อน capture ถึงเริ่มได้,
// capture ต้องเจอ round banner ก่อน confirmation banner ถึงจะโผล่):
//   1. Pre-Map Roster Lock — ล็อก 5v5 ต่อแม็พก่อนเริ่ม OCR
//   2. OCR Name-Matching Monitor — จับภาพหน้าจอ 1Hz, ROI crop, OCR, fuzzy match, โชว์สถานะให้แก้มือได้
//   3. Round-End Confirmation Banner — นับถอยหลัง 10s ก่อนยิง RPC บันทึกรอบอัตโนมัติ
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { matchOcrPlayerName, type LockedRosterCandidate, type OcrMatchResult } from '@/lib/ocr/fuzzy-matcher';
import { PLAYER_NAME_ROI, ROUND_BANNER_ROI, cropRoi, parseRoundBannerText } from '@/lib/ocr/roi-regions';
import { recognizeText, terminateOcrWorkerPool } from '@/lib/ocr/ocr-worker-pool';
import type { WinCondition } from '@/lib/overlay/telemetry-schema';

interface TeamMemberCandidate {
  player_id: string;
  display_name: string;
}

interface LockedSlot extends LockedRosterCandidate {
  team_id: string;
}

interface Props {
  matchId: string;
  gameNumber: number;
  teamAId: string;
  teamBId: string;
  teamATag: string;
  teamBTag: string;
  /** Observer Token ที่ mint ไว้แล้วในแผงด้านบน (Observer Bridge) — ใช้ auth เดียวกันยิงเข้า /telemetry */
  observerToken: string | null;
}

const CAPTURE_INTERVAL_MS = 1000; // 1 FPS ตามสเป็ค

export default function OcrObserverBridgePanel({ matchId, gameNumber, teamAId, teamBId, teamATag, teamBTag, observerToken }: Props) {
  const supabase = createClient();

  // --- Pre-Map Roster Lock ---
  const [teamAMembers, setTeamAMembers] = useState<TeamMemberCandidate[]>([]);
  const [teamBMembers, setTeamBMembers] = useState<TeamMemberCandidate[]>([]);
  const [selectedA, setSelectedA] = useState<Set<string>>(new Set());
  const [selectedB, setSelectedB] = useState<Set<string>>(new Set());
  const [lockedRoster, setLockedRoster] = useState<LockedSlot[] | null>(null);
  const [rosterBusy, setRosterBusy] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  // --- OCR Capture ---
  const [capturing, setCapturing] = useState(false);
  const [matchResults, setMatchResults] = useState<Record<string, OcrMatchResult & { rawText: string }>>({});
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // --- Round-End Confirmation ---
  const [pendingRound, setPendingRound] = useState<{
    roundNumber: number;
    winCondition: WinCondition;
    confidence: number;
  } | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [lastRoundNumber, setLastRoundNumber] = useState(0);

  // โหลดสมาชิกทีม + สถานะล็อกที่มีอยู่แล้วของแม็พนี้ (ถ้ามี)
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: members } = await supabase
        .from('team_members')
        .select('player_id, team_id, players!team_members_player_id_fkey(display_name)')
        .eq('status', 'ACTIVE')
        .in('team_id', [teamAId, teamBId]);

      if (!cancelled && members) {
        const toCandidates = (teamId: string) =>
          members
            .filter((m) => m.team_id === teamId)
            .map((m) => {
              const p = Array.isArray(m.players) ? m.players[0] : m.players;
              return { player_id: m.player_id, display_name: p?.display_name ?? m.player_id };
            });
        setTeamAMembers(toCandidates(teamAId));
        setTeamBMembers(toCandidates(teamBId));
      }

      try {
        const res = await fetch(`/api/v1/matches/${matchId}/games/${gameNumber}/participants`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json.locked && Array.isArray(json.participants)) {
            setLockedRoster(
              json.participants.map((p: { player_id: string; team_id: string; display_name: string | null }) => ({
                id: p.player_id,
                team_id: p.team_id,
                ign: p.display_name ?? p.player_id,
              }))
            );
          }
        }
      } catch {
        // ยังไม่ล็อก — ให้ Observer กดล็อกเองด้านล่าง
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [matchId, gameNumber, teamAId, teamBId, supabase]);

  const toggleSelect = (set: Set<string>, setSet: (s: Set<string>) => void, playerId: string, max: number) => {
    const next = new Set(set);
    if (next.has(playerId)) {
      next.delete(playerId);
    } else {
      if (next.size >= max) return;
      next.add(playerId);
    }
    setSet(next);
  };

  const confirmRosterLock = async () => {
    if (selectedA.size !== 5 || selectedB.size !== 5) {
      setRosterError('ต้องเลือกให้ครบ 5 คนต่อทีมก่อนล็อก');
      return;
    }
    setRosterBusy(true);
    setRosterError(null);
    try {
      const participants = [
        ...Array.from(selectedA).map((player_id) => ({ player_id, team_id: teamAId })),
        ...Array.from(selectedB).map((player_id) => ({ player_id, team_id: teamBId })),
      ];
      const res = await fetch(`/api/v1/matches/${matchId}/games/${gameNumber}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setRosterError(json?.error || 'ล็อกรายชื่อไม่สำเร็จ');
        return;
      }
      const slots: LockedSlot[] = [
        ...Array.from(selectedA).map((id) => ({
          id,
          team_id: teamAId,
          ign: teamAMembers.find((m) => m.player_id === id)?.display_name ?? id,
        })),
        ...Array.from(selectedB).map((id) => ({
          id,
          team_id: teamBId,
          ign: teamBMembers.find((m) => m.player_id === id)?.display_name ?? id,
        })),
      ];
      setLockedRoster(slots);
    } catch {
      setRosterError('ล็อกรายชื่อไม่สำเร็จ (เครือข่าย)');
    } finally {
      setRosterBusy(false);
    }
  };

  // --- OCR capture loop ---
  const runCaptureCycle = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !lockedRoster || video.readyState < 2) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    try {
      // 10 ป้ายชื่อผู้เล่น
      const nameResults = await Promise.all(
        PLAYER_NAME_ROI.map(async (roi) => {
          const cropped = cropRoi(video, w, h, roi);
          const text = await recognizeText(cropped);
          const teamId = roi.id.startsWith('team_a') ? teamAId : teamBId;
          const candidates = lockedRoster.filter((c) => c.team_id === teamId);
          const match = matchOcrPlayerName(text, candidates);
          return [roi.id, { ...match, rawText: text }] as const;
        })
      );
      setMatchResults(Object.fromEntries(nameResults));

      // ป้ายจบรอบ
      const bannerCanvas = cropRoi(video, w, h, ROUND_BANNER_ROI);
      const bannerText = await recognizeText(bannerCanvas);
      const winCondition = parseRoundBannerText(bannerText);
      if (winCondition && !pendingRound) {
        const nextRoundNumber = lastRoundNumber + 1;
        setPendingRound({ roundNumber: nextRoundNumber, winCondition, confidence: 90 });
        setCountdown(10);
      }
      setOcrError(null);
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : 'OCR ประมวลผลล้มเหลว');
    }
  }, [lockedRoster, teamAId, teamBId, pendingRound, lastRoundNumber]);

  const startCapture = async () => {
    if (!lockedRoster) {
      setOcrError('ต้องล็อกรายชื่อผู้เล่น 10 คนก่อนเริ่ม OCR');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      stream.getVideoTracks()[0]?.addEventListener('ended', stopCapture);
      setCapturing(true);
      intervalRef.current = setInterval(runCaptureCycle, CAPTURE_INTERVAL_MS);
    } catch {
      setOcrError('ไม่สามารถขอสิทธิ์แชร์หน้าจอได้ (ต้องเลือกแชร์หน้าจอ/หน้าต่างที่มีภาพเกม)');
    }
  };

  const stopCapture = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCapturing(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCapture();
      void terminateOcrWorkerPool();
    };
  }, [stopCapture]);

  const commitRound = useCallback(async () => {
    if (!pendingRound || !observerToken) {
      setPendingRound(null);
      return;
    }
    const winnerCandidates = Object.entries(matchResults)
      .filter(([, r]) => r.status !== 'UNMATCHED')
      .map(([slotId]) => slotId);
    // ทีมที่ยังมีชื่อจับคู่ได้เยอะกว่าตอนจบรอบ = ทีมที่ "รอด" -> สันนิษฐานเป็นผู้ชนะรอบ (heuristic เบื้องต้น
    // ยังไม่แม่นยำ 100% — Observer ควรกด EDIT/OVERRIDE ถ้าไม่ตรง ก่อนนับถอยหลังหมด)
    const teamAAlive = winnerCandidates.filter((id) => id.startsWith('team_a')).length;
    const teamBAlive = winnerCandidates.filter((id) => id.startsWith('team_b')).length;
    const winnerTeamId = teamAAlive >= teamBAlive ? teamAId : teamBId;

    try {
      await fetch(`/api/v1/matches/${matchId}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${observerToken}` },
        body: JSON.stringify({
          timestamp: Date.now(),
          round_event: {
            stage: 'ROUND_ENDED',
            game_number: gameNumber,
            round_number: pendingRound.roundNumber,
            winner_team_id: winnerTeamId,
            win_condition: pendingRound.winCondition,
            ocr_confidence: pendingRound.confidence,
          },
          players: [],
        }),
      });
      setLastRoundNumber(pendingRound.roundNumber);
    } catch {
      setOcrError('บันทึกผลรอบล้มเหลว (เครือข่าย) — ลองกดยืนยันซ้ำตอนรอบถัดไป');
    } finally {
      setPendingRound(null);
    }
  }, [pendingRound, observerToken, matchResults, matchId, gameNumber, teamAId, teamBId]);

  // --- Round-End Confirmation countdown ---
  useEffect(() => {
    if (!pendingRound) return;
    // setTimeout(fn, 0) แทนการเรียก commitRound() ตรงๆ กัน lint react-hooks/set-state-in-effect
    // (commitRound เรียก setState หลายจุด) ให้ effect นี้ทำหน้าที่แค่ตั้งเวลาอย่างเดียว
    const t = setTimeout(() => {
      if (countdown <= 0) {
        void commitRound();
      } else {
        setCountdown((c) => c - 1);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [pendingRound, countdown, commitRound]);

  const overrideRound = (winCondition: WinCondition) => {
    setPendingRound((prev) => (prev ? { ...prev, winCondition } : prev));
  };

  const rejectRound = () => setPendingRound(null);

  return (
    <div className="bg-[#12121A] border border-white/5 rounded-xl p-5 space-y-5">
      <h2 className="font-mono text-sm font-black text-[#8B5CF6] uppercase tracking-wider mb-1 border-b border-white/5 pb-2">
        🔎 OCR Round &amp; Roster Engine (Map {gameNumber})
      </h2>
      <p className="font-mono text-[10px] text-gray-500 leading-relaxed">
        Tesseract.js WASM ทำงาน 100% บนเครื่องนี้ ไม่มีค่าใช้จ่าย ไม่ส่งภาพออกนอกเครื่อง — ต้องล็อกรายชื่อผู้เล่นก่อนเริ่มจับภาพเสมอ
      </p>

      {/* PRE-MAP ROSTER LOCK */}
      {!lockedRoster ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { tag: teamATag, members: teamAMembers, selected: selectedA, setSelected: setSelectedA },
              { tag: teamBTag, members: teamBMembers, selected: selectedB, setSelected: setSelectedB },
            ].map(({ tag, members, selected, setSelected }) => (
              <div key={tag} className="border border-white/10 rounded-lg p-3">
                <div className="font-mono text-[10px] font-black text-white uppercase mb-2">
                  {tag} — {selected.size}/5
                </div>
                <div className="space-y-1">
                  {members.map((m) => (
                    <label key={m.player_id} className="flex items-center gap-2 font-mono text-[10px] text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(m.player_id)}
                        onChange={() => toggleSelect(selected, setSelected, m.player_id, 5)}
                      />
                      {m.display_name}
                    </label>
                  ))}
                  {members.length === 0 && <span className="font-mono text-[10px] text-gray-600">ไม่พบสมาชิกทีม</span>}
                </div>
              </div>
            ))}
          </div>
          {rosterError && <p className="font-mono text-[10px] text-rose-400">{rosterError}</p>}
          <button
            onClick={confirmRosterLock}
            disabled={rosterBusy || selectedA.size !== 5 || selectedB.size !== 5}
            className="w-full py-2 bg-[#8B5CF6]/15 border border-[#8B5CF6]/40 text-[#8B5CF6] hover:bg-[#8B5CF6]/25 rounded font-mono text-xs font-bold transition disabled:opacity-30"
          >
            {rosterBusy ? 'LOCKING...' : `🔒 LOCK 5v5 ROSTER FOR MAP ${gameNumber}`}
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="text-emerald-400">🟢 ROSTER LOCKED — {lockedRoster.length}/10 players</span>
            {!capturing ? (
              <button
                onClick={startCapture}
                className="px-3 py-1.5 bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF]/20 rounded font-mono text-[10px] font-bold transition"
              >
                ▶ START OCR CAPTURE
              </button>
            ) : (
              <button
                onClick={stopCapture}
                className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 rounded font-mono text-[10px] font-bold transition"
              >
                ■ STOP CAPTURE
              </button>
            )}
          </div>

          {/* hidden video สำหรับ capture — ไม่โชว์ภาพให้ผู้ใช้ ใช้แค่เป็นแหล่งเฟรมให้ canvas crop */}
          <video ref={videoRef} muted playsInline className="hidden" />

          {ocrError && <p className="font-mono text-[10px] text-rose-400">{ocrError}</p>}

          {/* OCR NAME-MATCHING TABLE */}
          {capturing && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px]">
              {PLAYER_NAME_ROI.map((roi) => {
                const result = matchResults[roi.id];
                const locked = lockedRoster.find((c) => c.id === result?.matched_player_id);
                const dot = !result ? '⚪' : result.status === 'EXACT' ? '🟢' : result.status === 'FUZZY' ? '🟡' : '🔴';
                return (
                  <div key={roi.id} className="flex justify-between border-b border-white/5 py-1">
                    <span className="text-gray-500">{result?.rawText || '...'}</span>
                    <span>
                      {dot} {locked?.ign ?? '[UNMATCHED]'}
                      {result?.status === 'FUZZY' && ` (${result.confidence}%)`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ROUND-END CONFIRMATION BANNER */}
          {pendingRound && (
            <div className="border border-amber-500/50 bg-amber-500/10 rounded-lg p-4 space-y-2">
              <p className="font-mono text-[11px] font-black text-amber-400">
                ⚠️ OCR ROUND-END DETECTED — ROUND {pendingRound.roundNumber} via {pendingRound.winCondition.toUpperCase()}
              </p>
              <p className="font-mono text-[10px] text-gray-400">
                AUTO-COMMIT IN {countdown}s — ตรวจสอบก่อนหมดเวลาถ้าไม่ตรง
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCountdown(0)}
                  className="flex-1 py-1.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded font-mono text-[10px] font-bold"
                >
                  CONFIRM NOW
                </button>
                <select
                  onChange={(e) => overrideRound(e.target.value as WinCondition)}
                  value={pendingRound.winCondition}
                  className="bg-black/60 border border-white/10 rounded px-2 font-mono text-[10px] text-white"
                >
                  <option value="elimination">elimination</option>
                  <option value="spike_detonate">spike_detonate</option>
                  <option value="spike_defuse">spike_defuse</option>
                  <option value="time_expire">time_expire</option>
                </select>
                <button
                  onClick={rejectRound}
                  className="py-1.5 px-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded font-mono text-[10px]"
                >
                  REJECT
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
