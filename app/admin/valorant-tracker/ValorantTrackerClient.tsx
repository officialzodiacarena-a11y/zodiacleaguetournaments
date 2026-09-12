// app/admin/valorant-tracker/ValorantTrackerClient.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Clock, 
  ShieldCheck, 
  AlertCircle,
  ImageOff,
  RefreshCw,
  X,
  ExternalLink
} from 'lucide-react';

export interface VerificationItem {
  id: string;
  player_id: string;
  game_id: string;
  game_name: string | null;
  tag_line: string | null;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SELF_DECLARED' | 'MANUAL_REVIEW';
  evidence_url: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  player?: {
    handle: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface Props {
  initialItems: VerificationItem[];
}

type StatusFilter = 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export default function ValorantTrackerClient({ initialItems }: Props) {
  const [items, setItems] = useState<VerificationItem[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
  
  // Modal States
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewImgError, setPreviewImgError] = useState(false);
  const [rejectingItem, setRejectingItem] = useState<VerificationItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // Action Loading State (Case AD02-01: Double-Click Protection)
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Filtered and Searched Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = 
        statusFilter === 'ALL' || 
        item.verification_status === statusFilter ||
        (statusFilter === 'PENDING' && item.verification_status === 'MANUAL_REVIEW');

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        (item.game_name && item.game_name.toLowerCase().includes(q)) ||
        (item.tag_line && item.tag_line.toLowerCase().includes(q)) ||
        (item.player?.handle && item.player.handle.toLowerCase().includes(q)) ||
        (item.player?.full_name && item.player.full_name.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [items, searchQuery, statusFilter]);

  // 2. Approve Action (PATCH /api/v1/admin/verifications/[id]/approve)
  const handleApprove = async (id: string) => {
    if (processingId) return;
    setProcessingId(id);
    setActionError(null);

    try {
      const res = await fetch(`/api/v1/admin/verifications/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(data.error?.message || 'ไม่สามารถอนุมัติคำขอได้');
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, verification_status: 'VERIFIED', rejection_reason: null }
            : item
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอนุมัติ';
      setActionError(message);
    } finally {
      setProcessingId(null);
    }
  };

  // 3. Reject Action (PATCH /api/v1/admin/verifications/[id]/reject)
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem || processingId) return;

    if (!rejectReason.trim()) {
      setActionError('กรุณาระบุเหตุผลการปฏิเสธ');
      return;
    }

    setProcessingId(rejectingItem.id);
    setActionError(null);

    try {
      const res = await fetch(`/api/v1/admin/verifications/${rejectingItem.id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectReason.trim() }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(data.error?.message || 'ไม่สามารถปฏิเสธคำขอได้');
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === rejectingItem.id
            ? { ...item, verification_status: 'REJECTED', rejection_reason: rejectReason.trim() }
            : item
        )
      );
      setRejectingItem(null);
      setRejectReason('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการปฏิเสธ';
      setActionError(message);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('th-TH', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  return (
    <div className="space-y-6">
      
      {/* 1. TOP NAVIGATION & HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E8B429]/15 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#94A3B8] hover:text-[#E8B429] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Command Hub</span>
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-xs font-mono text-[#F59E0B]">VALORANT TRACKER</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-wider text-white flex items-center gap-3">
            <span>PLAYER VERIFICATION</span>
            <span className="text-[#F59E0B] text-xl font-bold font-mono">DESK</span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            โต๊ะตรวจสอบหลักฐาน Riot ID และประวัติแรงก์นักกีฬาเพื่ออนุมัติสิทธิ์การแข่งขัน
          </p>
        </div>

        {/* Status Count Badges */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="bg-[#1A1C2E] border border-white/5 rounded-lg px-3 py-1.5">
            <span className="text-[#94A3B8]">Pending: </span>
            <span className="font-bold text-[#F59E0B]">
              {items.filter((i) => i.verification_status === 'PENDING' || i.verification_status === 'MANUAL_REVIEW').length}
            </span>
          </div>
          <div className="bg-[#1A1C2E] border border-white/5 rounded-lg px-3 py-1.5">
            <span className="text-[#94A3B8]">Verified: </span>
            <span className="font-bold text-[#4CAF50]">
              {items.filter((i) => i.verification_status === 'VERIFIED').length}
            </span>
          </div>
        </div>
      </div>

      {/* Action Error Alert */}
      {actionError && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 2. SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#1A1C2E] border border-white/5 p-4 rounded-xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหา Riot ID หรือชื่อนักกีฬา..."
            className="w-full bg-[#121424] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E8B429] transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['PENDING', 'VERIFIED', 'REJECTED', 'ALL'] as StatusFilter[]).map((tab) => {
            const isActive = statusFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#E8B429] text-[#0D0E1A] shadow-[0_0_12px_rgba(232,180,41,0.3)]'
                    : 'bg-[#121424] text-[#94A3B8] hover:text-white hover:bg-white/5 border border-white/5'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. VERIFICATION MATRIX TABLE */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#1A1C2E]">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#94A3B8]" />
            <p>ไม่พบรายการคำขอยืนยันตัวตนในสถานะนี้</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/5 bg-[#121424] text-[10px] font-mono uppercase text-[#94A3B8]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">นักกีฬา (Athlete)</th>
                  <th className="py-3.5 px-4 font-bold">Riot ID & Tagline</th>
                  <th className="py-3.5 px-4 font-bold">ภาพหลักฐาน (Evidence)</th>
                  <th className="py-3.5 px-4 font-bold">สถานะ (Status)</th>
                  <th className="py-3.5 px-4 font-bold">เวลายื่น (Submitted)</th>
                  <th className="py-3.5 px-4 font-bold text-right">ดำเนินการ (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.map((item) => {
                  const isPending = item.verification_status === 'PENDING' || item.verification_status === 'MANUAL_REVIEW';
                  const isVerified = item.verification_status === 'VERIFIED';
                  const isRejected = item.verification_status === 'REJECTED';
                  const isBusy = processingId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#121424] border border-white/10 flex items-center justify-center font-bold text-[#E8B429]">
                            {item.player?.handle ? item.player.handle.slice(0, 2).toUpperCase() : 'ZA'}
                          </div>
                          <div>
                            <div className="font-bold text-white">
                              {item.player?.handle || 'Unknown Player'}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              {item.player?.full_name || 'No Full Name'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-[#F9EDD8]">
                          <span>{item.game_name || '-'}</span>
                          <span className="text-[#E8B429]">#{item.tag_line || '-'}</span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500">Game: {item.game_id}</div>
                      </td>

                      <td className="py-4 px-4">
                        {item.evidence_url ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewImage(item.evidence_url);
                              setPreviewImgError(false);
                            }}
                            className="group flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#121424] px-2.5 py-1.5 text-[11px] text-[#94A3B8] hover:text-white hover:border-[#E8B429]/50 transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#E8B429] group-hover:scale-110 transition-transform" />
                            <span>ตรวจภาพหลักฐาน</span>
                          </button>
                        ) : (
                          <span className="text-zinc-600 text-[11px] font-mono">ไม่มีภาพแนบ</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#F59E0B] border border-[#F59E0B]/30">
                            <Clock className="w-3 h-3" />
                            {item.verification_status === 'MANUAL_REVIEW' ? 'MANUAL REVIEW' : 'PENDING'}
                          </span>
                        )}
                        {isVerified && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#4CAF50]/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#4CAF50] border border-[#4CAF50]/30">
                            <CheckCircle2 className="w-3 h-3" />
                            VERIFIED
                          </span>
                        )}
                        {isRejected && (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#E3322F]/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#E3322F] border border-[#E3322F]/30">
                              <XCircle className="w-3 h-3" />
                              REJECTED
                            </span>
                            {item.rejection_reason && (
                              <p className="mt-1 max-w-xs text-[10px] text-zinc-400 line-clamp-1">
                                {item.rejection_reason}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 font-mono text-[11px] text-zinc-400">
                        {formatDate(item.created_at)}
                      </td>

                      <td className="py-4 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleApprove(item.id)}
                              className="flex items-center gap-1 rounded-lg bg-[#4CAF50] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#43a047] disabled:opacity-50 transition-all cursor-pointer"
                            >
                              {isBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              <span>อนุมัติ</span>
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setRejectingItem(item);
                                setRejectReason('');
                              }}
                              className="flex items-center gap-1 rounded-lg bg-[#E3322F]/15 border border-[#E3322F]/30 px-3 py-1.5 text-xs font-bold text-[#E3322F] hover:bg-[#E3322F]/30 disabled:opacity-50 transition-all cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>ปฏิเสธ</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-zinc-600">เสร็จสิ้น</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. FULL-SCREEN IMAGE MODAL WITH UNOPTIMIZED FALLBACK */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 md:p-8">
          <div className="relative max-h-[90vh] max-w-5xl w-full flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-[#94A3B8] hover:text-white flex items-center gap-1 text-xs font-mono cursor-pointer"
            >
              <span>ปิดหน้าต่าง (ESC)</span>
              <X className="w-4 h-4" />
            </button>

            {previewImgError ? (
              <div className="w-full h-80 rounded-xl border border-red-500/30 bg-red-500/10 flex flex-col items-center justify-center text-red-400 gap-2 p-6 text-center">
                <ImageOff className="w-10 h-10" />
                <p className="text-sm font-bold">ไม่สามารถโหลดรูปภาพหลักฐานได้</p>
                <p className="text-xs text-zinc-400 font-mono">
                  URL อาจหมดอายุหรือ CDN ขัดข้อง
                </p>
              </div>
            ) : (
              <div className="relative w-full h-[70vh] rounded-xl overflow-hidden border border-white/10 bg-[#121424]">
                <Image
                  src={previewImage}
                  alt="Riot Verification Proof"
                  fill
                  unoptimized={true}
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  className="object-contain"
                  onError={() => setPreviewImgError(true)}
                />
              </div>
            )}

            <div className="mt-3 flex items-center gap-4">
              <a
                href={previewImage}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-[#E8B429] hover:underline font-mono"
              >
                <span>เปิดรูปภาพเต็มในแท็บใหม่</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 5. REJECTION REASON DIALOG */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#1A1C2E] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-[#E3322F]" />
                <span>ระบุเหตุผลการปฏิเสธคำขอ</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              ปฏิเสธคำขอของนักกีฬา{' '}
              <span className="font-bold text-white">
                {rejectingItem.game_name}#{rejectingItem.tag_line}
              </span>
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="เช่น ภาพถ่ายไม่ชัดเจน, ไม่เห็นชื่อ Riot ID หรือ Rank ไม่ตรงกับสถิติจริง"
                className="w-full bg-[#121424] border border-white/10 rounded-lg p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E3322F] transition-colors"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectingItem.id}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E3322F] hover:bg-red-700 text-xs font-bold text-white disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {processingId === rejectingItem.id && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>ยืนยันปฏิเสธ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
