// components/admin/marketplace/SponsorManager.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  CheckCircle2,
  XCircle,
  Ban,
  Building2,
  Sparkles,
  X,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import type { AdminSponsorDetail, CreateSponsorInput, SponsorStatus } from '@/types/sponsor';

const EMPTY_FORM: CreateSponsorInput = {
  company_name: '',
  brand_logo_url: '',
  contact_email: '',
  tier: 'SPONSOR',
  metadata: {},
};

const TIER_OPTIONS = [
  { id: 'SPONSOR', label: 'SPONSOR', desc: 'แบนเนอร์/โลโก้ตำแหน่งมาตรฐาน + สถิติพื้นฐาน' },
  { id: 'SPONSOR_PARTNER', label: 'SPONSOR_PARTNER', desc: 'พื้นที่พรีเมียม + โควตาหน้า Tournament/Match' },
  { id: 'PARTNER_COOP', label: 'PARTNER_COOP', desc: 'ครบทุกตำแหน่ง + เปิดหน้าร้าน + ออกคูปองส่วนลด AP' },
] as const;

const STATUS_STYLE: Record<SponsorStatus, string> = {
  PENDING: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
  APPROVED: 'bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/30',
  REJECTED: 'bg-red-500/10 text-red-400 border-red-500/30',
  SUSPENDED: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
};

export function SponsorManager() {
  const [sponsors, setSponsors] = useState<AdminSponsorDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateSponsorInput>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [rejectingSponsor, setRejectingSponsor] = useState<AdminSponsorDetail | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchSponsors = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/sponsors');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'โหลดข้อมูลสปอนเซอร์ไม่สำเร็จ');
      setSponsors(json.data || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลด');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    fetchSponsors();
  }, [fetchSponsors]);

  const pendingCount = sponsors.filter((s) => s.status === 'PENDING').length;
  const approvedCount = sponsors.filter((s) => s.status === 'APPROVED').length;
  const coopCount = sponsors.filter((s) => s.tier === 'PARTNER_COOP' && s.status === 'APPROVED').length;

  function handleOpenCreate() {
    setFormData(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch('/api/v1/admin/sponsors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'สร้างรายการสปอนเซอร์ไม่สำเร็จ');

      setIsModalOpen(false);
      await fetchSponsors();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSubmitting(false);
    }
  }

  async function updateApproval(sponsor: AdminSponsorDetail, status: SponsorStatus, rejection_reason?: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admin/sponsors/${sponsor.id}/approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejection_reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'ปรับสถานะไม่สำเร็จ');

      setSponsors((prev) => prev.map((s) => (s.id === sponsor.id ? json.data : s)));
      setRejectingSponsor(null);
      setRejectReason('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/5 bg-[#1A1C2E] p-4">
          <div className="flex items-center justify-between text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">สปอนเซอร์ทั้งหมด</span>
            <Building2 className="w-4 h-4 text-[#00D4FF]" />
          </div>
          <span className="text-2xl font-black text-white">{sponsors.length}</span>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#1A1C2E] p-4">
          <div className="flex items-center justify-between text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">รออนุมัติ</span>
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <span className="text-2xl font-black text-[#F59E0B]">{pendingCount}</span>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#1A1C2E] p-4">
          <div className="flex items-center justify-between text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">อนุมัติแล้ว</span>
            <CheckCircle2 className="w-4 h-4 text-[#4CAF50]" />
          </div>
          <span className="text-2xl font-black text-[#4CAF50]">{approvedCount}</span>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#1A1C2E] p-4">
          <div className="flex items-center justify-between text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">PARTNER_COOP Active</span>
            <Sparkles className="w-4 h-4 text-[#E8B429]" />
          </div>
          <span className="text-2xl font-black text-[#E8B429]">{coopCount}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8]">รายการสปอนเซอร์ & พาร์ทเนอร์</h2>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-lg bg-[#E8B429] px-4 py-2 text-xs font-bold text-[#0D0E1A] hover:bg-[#d4a222] transition-colors shadow-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มสปอนเซอร์ใหม่</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#1A1C2E]">
        {loading ? (
          <div className="py-16 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#E8B429]" />
            <span>กำลังโหลดรายการสปอนเซอร์...</span>
          </div>
        ) : sponsors.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#94A3B8]" />
            <p>ยังไม่มีสปอนเซอร์ในระบบ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/5 bg-[#121424] text-[10px] font-mono uppercase text-[#94A3B8]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">บริษัท</th>
                  <th className="py-3.5 px-4 font-bold">Tier</th>
                  <th className="py-3.5 px-4 font-bold">สถานะ</th>
                  <th className="py-3.5 px-4 font-bold">อีเมลติดต่อ</th>
                  <th className="py-3.5 px-4 font-bold text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sponsors.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{s.company_name}</div>
                      {s.rejection_reason && (
                        <div className="text-[10px] text-red-400 mt-0.5">เหตุผลปฏิเสธ: {s.rejection_reason}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px]">
                      <span className="px-2 py-0.5 rounded border border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF] font-bold">
                        {s.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold border ${STATUS_STYLE[s.status]}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{s.contact_email}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/marketplace/sponsors/${s.id}/metrics`}
                          className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-[#00D4FF] transition-colors cursor-pointer"
                          title="ดู Analytics"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Link>
                        {s.status !== 'APPROVED' && (
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => updateApproval(s, 'APPROVED')}
                            className="p-1.5 rounded hover:bg-[#4CAF50]/20 text-zinc-400 hover:text-[#4CAF50] transition-colors cursor-pointer disabled:opacity-40"
                            title="อนุมัติ"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {s.status !== 'REJECTED' && (
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => setRejectingSponsor(s)}
                            className="p-1.5 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-40"
                            title="ปฏิเสธ"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {s.status === 'APPROVED' && (
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => updateApproval(s, 'SUSPENDED')}
                            className="p-1.5 rounded hover:bg-zinc-500/20 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-40"
                            title="ระงับสิทธิ์"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#1A1C2E] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#E8B429]" />
                <span>เพิ่มสปอนเซอร์ใหม่</span>
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">{formError}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">ชื่อบริษัท *</label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="เช่น Luminary Global"
                  className="w-full bg-[#121424] border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E8B429]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">URL โลโก้แบรนด์ *</label>
                <input
                  type="url"
                  required
                  value={formData.brand_logo_url}
                  onChange={(e) => setFormData({ ...formData, brand_logo_url: e.target.value })}
                  placeholder="https://cdn.zodiacarena.com/logos/..."
                  className="w-full bg-[#121424] border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E8B429]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">อีเมลติดต่อ *</label>
                <input
                  type="email"
                  required
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="sponsorships@luminaryglobal.com"
                  className="w-full bg-[#121424] border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E8B429]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">Partnership Tier *</label>
                <div className="grid grid-cols-1 gap-2">
                  {TIER_OPTIONS.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setFormData({ ...formData, tier: t.id })}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.tier === t.id
                          ? 'bg-[#E8B429]/10 border-[#E8B429]'
                          : 'bg-[#121424] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        {t.label}
                        {formData.tier === t.id && <Sparkles className="w-3.5 h-3.5 text-[#E8B429]" />}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E8B429] hover:bg-[#d4a222] text-xs font-bold text-[#0D0E1A] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>REGISTER SPONSOR TIER</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT REASON MODAL */}
      {rejectingSponsor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#1A1C2E] p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <span>ปฏิเสธสปอนเซอร์ {rejectingSponsor.company_name}</span>
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="ระบุเหตุผลการปฏิเสธ (ไม่บังคับ)"
              rows={3}
              className="w-full bg-[#121424] border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E8B429]"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setRejectingSponsor(null); setRejectReason(''); }}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => updateApproval(rejectingSponsor, 'REJECTED', rejectReason)}
                className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-xs font-bold text-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                {submitting ? 'กำลังบันทึก...' : 'ยืนยันปฏิเสธ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
