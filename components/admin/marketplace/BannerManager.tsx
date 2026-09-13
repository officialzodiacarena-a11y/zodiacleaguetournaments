// components/admin/marketplace/BannerManager.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  MousePointerClick, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  X,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import type { AdminBannerDetail, CreateBannerInput } from '@/types/sponsor';

const EMPTY_FORM: CreateBannerInput = {
  title: '',
  brand_name: '',
  slot_position: 'TOP_LEADERBOARD',
  image_url: '',
  target_url: '',
  priority: 0,
  is_active: true,
  starts_at: new Date().toISOString().slice(0, 16),
  ends_at: '',
};

export function BannerManager() {
  const [banners, setBanners] = useState<AdminBannerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateBannerInput>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deletingBanner, setDeletingBanner] = useState<AdminBannerDetail | null>(null);

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/banners');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'โหลดข้อมูลแบนเนอร์ไม่สำเร็จ');
      setBanners(json.data || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลด');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    fetchBanners();
  }, [fetchBanners]);

  // Metrics Calculation
  const activeCount = banners.filter((b) => b.is_active).length;
  const totalImpressions = banners.reduce((sum, b) => sum + b.impression_count, 0);
  const totalClicks = banners.reduce((sum, b) => sum + b.click_count, 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

  // Open Create Modal
  function handleOpenCreate() {
    setEditingBannerId(null);
    setFormData({
      ...EMPTY_FORM,
      starts_at: new Date().toISOString().slice(0, 16),
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  // Open Edit Modal
  function handleOpenEdit(banner: AdminBannerDetail) {
    setEditingBannerId(banner.id);
    setFormData({
      title: banner.title,
      brand_name: banner.brand_name || '',
      slot_position: banner.slot_position,
      image_url: banner.image_url,
      target_url: banner.target_url,
      priority: banner.priority,
      is_active: banner.is_active,
      starts_at: banner.starts_at ? new Date(banner.starts_at).toISOString().slice(0, 16) : '',
      ends_at: banner.ends_at ? new Date(banner.ends_at).toISOString().slice(0, 16) : '',
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  // Toggle Active Switch
  async function handleToggleActive(banner: AdminBannerDetail) {
    try {
      const res = await fetch(`/api/v1/admin/banners/${banner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !banner.is_active }),
      });
      if (!res.ok) throw new Error('ไม่สามารถเปลี่ยนสถานะได้');
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, is_active: !b.is_active } : b))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    }
  }

  // Submit Form (Create or Edit)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const url = editingBannerId
        ? `/api/v1/admin/banners/${editingBannerId}`
        : '/api/v1/admin/banners';
      const method = editingBannerId ? 'PATCH' : 'POST';

      const payload = {
        ...formData,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : new Date().toISOString(),
        ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'บันทึกข้อมูลไม่สำเร็จ');

      setIsModalOpen(false);
      await fetchBanners();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSubmitting(false);
    }
  }

  // Delete Banner
  async function handleDelete() {
    if (!deletingBanner) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/v1/admin/banners/${deletingBanner.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('ลบแบนเนอร์ไม่สำเร็จ');

      setBanners((prev) => prev.filter((b) => b.id !== deletingBanner.id));
      setDeletingBanner(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* 1. TOP METRIC KPI STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/5 bg-[#1A1C2E] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">แบนเนอร์ที่ Active</span>
            <Layers className="w-4 h-4 text-[#4CAF50]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{activeCount}</span>
            <span className="text-[10px] text-zinc-500 font-mono">/ {banners.length} ทั้งหมด</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#1A1C2E] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Impressions</span>
            <Eye className="w-4 h-4 text-[#00D4FF]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#00D4FF] font-mono">
              {totalImpressions.toLocaleString()}
            </span>
            <span className="text-[10px] text-zinc-500">VIEWS</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#1A1C2E] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Clicks</span>
            <MousePointerClick className="w-4 h-4 text-[#E8B429]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#E8B429] font-mono">
              {totalClicks.toLocaleString()}
            </span>
            <span className="text-[10px] text-zinc-500">CLICKS</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#1A1C2E] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg CTR</span>
            <TrendingUp className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#F59E0B] font-mono">{avgCtr}%</span>
            <span className="text-[10px] text-zinc-500">CONVERSION</span>
          </div>
        </div>
      </div>

      {/* 2. HEADER ACTION BAR */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8]">
            รายการแบนเนอร์ในระบบ
          </h2>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-lg bg-[#E8B429] px-4 py-2 text-xs font-bold text-[#0D0E1A] hover:bg-[#d4a222] transition-colors shadow-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มแบนเนอร์ใหม่</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
          {error}
        </div>
      )}

      {/* 3. BANNER MATRIX TABLE */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#1A1C2E]">
        {loading ? (
          <div className="py-16 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#E8B429]" />
            <span>กำลังโหลดรายการแบนเนอร์...</span>
          </div>
        ) : banners.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#94A3B8]" />
            <p>ยังไม่มีรายการแบนเนอร์ในระบบ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/5 bg-[#121424] text-[10px] font-mono uppercase text-[#94A3B8]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">พรีวิว</th>
                  <th className="py-3.5 px-4 font-bold">ชื่อแคมเปญ & แบรนด์</th>
                  <th className="py-3.5 px-4 font-bold">ตำแหน่ง Slot</th>
                  <th className="py-3.5 px-4 font-bold">Priority</th>
                  <th className="py-3.5 px-4 font-bold">Impression / Click</th>
                  <th className="py-3.5 px-4 font-bold">CTR (%)</th>
                  <th className="py-3.5 px-4 font-bold">สถานะ</th>
                  <th className="py-3.5 px-4 font-bold text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {banners.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="relative w-16 h-8 rounded border border-white/10 overflow-hidden bg-[#121424]">
                        <Image
                          src={b.image_url}
                          alt={b.title}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white max-w-xs truncate">{b.title}</div>
                      <div className="text-[10px] font-mono text-[#E8B429]">
                        {b.brand_name || 'ZODIAC PARTNER'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${
                        b.slot_position === 'TOP_LEADERBOARD'
                          ? 'border-[#E8B429]/40 bg-[#E8B429]/10 text-[#E8B429]'
                          : 'border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]'
                      }`}>
                        {b.slot_position}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-bold text-zinc-300">
                      {b.priority}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-zinc-300">
                      <div>{b.impression_count.toLocaleString()} views</div>
                      <div className="text-[10px] text-zinc-500">{b.click_count.toLocaleString()} clicks</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-black text-[#F59E0B]">
                      {b.ctr_percent}%
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(b)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                          b.is_active
                            ? 'bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/30 hover:bg-[#4CAF50]/20'
                            : 'bg-white/5 text-zinc-500 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {b.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{b.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          title="แก้ไข"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingBanner(b)}
                          className="p-1.5 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. CREATE / EDIT MODAL DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#1A1C2E] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#E8B429]" />
                <span>{editingBannerId ? 'แก้ไขข้อมูลแบนเนอร์' : 'เพิ่มแบนเนอร์ใหม่'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">
                  ชื่อแคมเปญ / แบนเนอร์ *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="เช่น SINOPEC Lubricants Header"
                  className="w-full bg-[#121424] border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E8B429]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">
                    ชื่อแบรนด์
                  </label>
                  <input
                    type="text"
                    value={formData.brand_name || ''}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    placeholder="เช่น SINOPEC"
                    className="w-full bg-[#121424] border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E8B429]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">
                    ตำแหน่ง Slot *
                  </label>
                  <select
                    value={formData.slot_position}
                    onChange={(e) => setFormData({ ...formData, slot_position: e.target.value as CreateBannerInput['slot_position'] })}
                    className="w-full bg-[#121424] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#E8B429]"
                  >
                    <option value="TOP_LEADERBOARD">TOP_LEADERBOARD (970x120)</option>
                    <option value="LEFT_TOWER">LEFT_TOWER (160x600)</option>
                    <option value="RIGHT_TOWER">RIGHT_TOWER (160x600)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">
                  URL รูปภาพแบนเนอร์ *
                </label>
                <input
                  type="url"
                  required
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://placehold.co/970x120/..."
                  className="w-full bg-[#121424] border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E8B429]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">
                  URL ปลายทางเมื่อคลิก *
                </label>
                <input
                  type="text"
                  required
                  value={formData.target_url}
                  onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                  placeholder="เช่น /store หรือ https://..."
                  className="w-full bg-[#121424] border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E8B429]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">
                    Priority Score
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                    className="w-full bg-[#121424] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#E8B429]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">
                    วันสิ้นสุดแคมเปญ
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.ends_at || ''}
                    onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                    className="w-full bg-[#121424] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#E8B429]"
                  />
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
                  <span>{editingBannerId ? 'บันทึกการแก้ไข' : 'สร้างแบนเนอร์'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#1A1C2E] p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>ยืนยันการลบแบนเนอร์</span>
            </h3>
            <p className="text-xs text-zinc-400">
              คุณต้องการลบแบนเนอร์ <span className="font-bold text-white">{deletingBanner.title}</span> ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingBanner(null)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-xs font-bold text-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                {submitting ? 'กำลังลบ...' : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}