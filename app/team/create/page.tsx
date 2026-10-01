// app/team/create/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Users, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { createTeamAction } from '@/actions/team';

export default function CreateTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('กรุณาระบุชื่อทีม');
      return;
    }
    if (!tag.trim()) {
      setError('กรุณาระบุแท็กทีม (Team Tag)');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set('name', name);
      formData.set('tag', tag);
      if (description) formData.set('description', description);
      if (logoUrl) formData.set('logoUrl', logoUrl);
        if (logoFile) formData.set('logoFile', logoFile);

      const res = await createTeamAction(formData);
      if ('error' in res && res.error) {
        setError(res.error.message);
      } else if ('success' in res && res.success) {
        if (res.teamId) {
          router.push(`/teams/${res.teamId}`);
        } else {
          router.push('/profile');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างทีม');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#08090F] text-[#F9EDD8] font-sans relative overflow-x-hidden selection:bg-[#E8B429] selection:text-black py-10 px-4 sm:px-6 lg:px-8">
      {/* Ambient Glows */}
      <div className="pointer-events-none fixed -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-[#E8B429]/15 via-[#9184D9]/5 to-transparent rounded-full blur-[140px] -z-10" />

      <div className="max-w-2xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-[#E8B429] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับสู่หน้าโปรไฟล์</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8B429]/10 border border-[#E8B429]/40 text-xs font-mono font-bold text-[#E8B429]">
            <Shield className="w-3.5 h-3.5 text-[#E8B429]" />
            <span>TEAM REGISTRATION</span>
          </div>
        </div>

        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#00D4FF]">
            <Users className="w-4 h-4 text-[#00D4FF]" />
            <span>ROSTER CREATOR · SEASON 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-wide">
            สร้างทีมใหม่ <span className="text-[#E8B429]">(CREATE TEAM)</span>
          </h1>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            สร้างทีมสำหรับเข้าร่วมการแข่งขัน Zodiac League คุณจะเป็นกัปตันทีมโดยอัตโนมัติและสามารถดึงเพื่อนร่วมทีมเข้ามาได้
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-[#121424] border border-[#E8B429]/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-[0_0_30px_rgba(232,180,41,0.1)]">
          {/* Team Name */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#E8B429]">
              ชื่อทีม (Team Name) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={50}
              placeholder="เช่น ILLIYHAD ESPORTS, FULL SENSE"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0D0E1A] border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#E8B429] focus:ring-1 focus:ring-[#E8B429] transition-all font-sans"
            />
            <p className="text-[10px] text-zinc-500 font-mono">ความยาว 2-50 ตัวอักษร</p>
          </div>

          {/* Team Tag */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#E8B429]">
              แท็กทีมย่อ (Team Tag) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={6}
              placeholder="เช่น ILY, FS, ZDC"
              value={tag}
              onChange={(e) => setTag(e.target.value.toUpperCase())}
              className="w-full bg-[#0D0E1A] border border-white/15 rounded-xl px-4 py-3 text-sm font-mono uppercase text-white placeholder-zinc-600 focus:outline-none focus:border-[#E8B429] focus:ring-1 focus:ring-[#E8B429] transition-all"
            />
            <p className="text-[10px] text-zinc-500 font-mono">ตัวย่อภาษาอังกฤษ 2-6 ตัวอักษร (จะแสดงหน้าชื่อผู้เล่น)</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
              คำอธิบายทีม (Description)
            </label>
            <textarea
              rows={3}
              maxLength={200}
              placeholder="เป้าหมายของทีม หรือคำโปรยแนะนำทีมสั้น ๆ..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0D0E1A] border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#E8B429] focus:ring-1 focus:ring-[#E8B429] transition-all font-sans"
            />
          </div>

          {/* Logo Upload / URL */}
          <div className="space-y-3">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
              โลโก้ทีม (Team Logo)
            </label>
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-4">
              <div className="space-y-2">
                <label className="block text-[11px] text-zinc-400 font-mono">
                  อัปโหลดรูปภาพจากเครื่อง (Upload File)
                </label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        alert("ขนาดไฟล์ต้องไม่เกิน 2MB");
                        e.target.value = '';
                        return;
                      }
                      setLogoFile(file);
                      setLogoUrl(''); // Clear URL if file is selected
                    }
                  }}
                  className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-mono file:font-bold file:bg-[#E8B429]/10 file:text-[#E8B429] hover:file:bg-[#E8B429]/20 transition-all cursor-pointer"
                />
                <ul className="text-[10px] text-zinc-500 font-mono list-disc pl-4 space-y-0.5">
                  <li>ขนาดไฟล์สูงสุด: <span className="text-[#E8B429]">2 MB</span></li>
                  <li>ประเภทไฟล์: PNG, JPG, WEBP</li>
                  <li>สัดส่วนที่แนะนำ: 1:1 (สี่เหลี่ยมจัตุรัส ขนาดประมาณ 256x256 px)</li>
                </ul>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-[10px] text-zinc-500 font-mono">หรือ (OR)</span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] text-zinc-400 font-mono">
                  ใส่ลิงก์รูปภาพ (Image URL)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => { setLogoUrl(e.target.value); setLogoFile(null); }}
                  className="w-full bg-[#0D0E1A] border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#E8B429] focus:ring-1 focus:ring-[#E8B429] transition-all font-sans"
                />
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">หากเว้นว่างไว้ ระบบจะใช้ตัวอักษรย่อ (Team Tag) แทน</p>
          </div>

          {/* Rules Checklist */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs text-zinc-300">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
              <Sparkles className="w-3.5 h-3.5 text-[#E8B429]" />
              <span>ข้อควรรู้สำหรับการสร้างทีม</span>
            </div>
            <ul className="space-y-1 text-[11px] text-zinc-400 pl-5 list-disc">
              <li>ผู้สร้างทีมจะได้รับสถานะ <strong>กัปตันทีม (Captain)</strong> โดยอัตโนมัติ</li>
              <li>กัปตันสามารถเชิญสมาชิกเข้าร่วมทีมได้สูงสุด 8 คน (ตัวจริง 5 + สำรอง 2 + โค้ช 1)</li>
              <li>ผู้เล่นทุกคนต้องผูกบัญชี Riot Games ในหน้าโปรไฟล์เพื่อยืนยันตัวตน</li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#E8B429] via-[#f5c84c] to-[#E8B429] text-[#0D0E1A] font-black text-sm uppercase tracking-wider hover:shadow-[0_0_25px_rgba(232,180,41,0.5)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>กำลังสร้างทีม...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>ยืนยันสร้างทีม (CREATE TEAM)</span>
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
