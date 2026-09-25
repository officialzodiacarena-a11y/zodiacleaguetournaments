'use client';

import React, { useEffect, useState } from 'react';
import { Keyboard, X, RotateCcw } from 'lucide-react';
import { comboFromEvent, type HotkeyAction, type HotkeyMap } from './hotkeys';

// หน้าต่างตั้งค่า Hotkey — คลิกช่องของคำสั่งไหน แล้วกดปุ่มที่ต้องการ (ต้องมี Alt/Ctrl/Shift ร่วม ยกเว้น F1-F12)
export function HotkeySettingsModal({
  actions,
  hotkeys,
  defaults,
  signedIn,
  onSave,
  onClose,
}: {
  actions: HotkeyAction[];
  hotkeys: HotkeyMap;
  defaults: HotkeyMap;
  signedIn: boolean;
  onSave: (next: HotkeyMap) => Promise<string | null>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<HotkeyMap>(hotkeys);
  const [capturing, setCapturing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setCapturing(null);
        return;
      }
      const combo = comboFromEvent(e);
      if (!combo) return; // ยังกดแค่ปุ่มเสริม หรือเป็นปุ่มที่ไม่รองรับ — รอกดต่อ
      setDraft((prev) => {
        const next = { ...prev };
        // ถ้าปุ่มนี้ถูกใช้กับคำสั่งอื่นอยู่ ให้ปลดออกจากคำสั่งนั้น กันยิงซ้อนสองคำสั่ง
        for (const id of Object.keys(next)) if (next[id] === combo) next[id] = '';
        next[capturing] = combo;
        return next;
      });
      setCapturing(null);
    };
    // capture phase เพื่อให้ตัวจับ Hotkey ของหน้าไม่สลับซีนระหว่างกำลังตั้งค่า
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [capturing]);

  const handleSave = async () => {
    setSaving(true);
    const err = await onSave(draft);
    setSaving(false);
    if (err) setMessage(err);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-500/40 bg-[#0B0F17] p-5 font-mono text-xs text-neutral-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-black text-cyan-300">
            <Keyboard className="h-4 w-4" /> ตั้งค่า Hotkey
          </h2>
          <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-white/10" aria-label="ปิด">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-[11px] text-neutral-500">
          คลิกช่องปุ่ม แล้วกดคีย์ที่ต้องการ (ต้องมี Alt / Ctrl / Shift ร่วมด้วย ยกเว้น F1–F12) · Esc = ยกเลิก
          <br />
          {signedIn ? 'บันทึกผูกกับบัญชีของคุณ ใช้ได้ทุกเครื่องที่ล็อกอิน' : 'ยังไม่ได้ล็อกอิน — จะบันทึกไว้ในเครื่องนี้เท่านั้น'}
        </p>

        <div className="space-y-1.5">
          {actions.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-1.5">
              <span className="truncate">{a.label}</span>
              <button
                onClick={() => setCapturing(a.id)}
                className={`min-w-[96px] rounded border px-2 py-1 font-bold ${
                  capturing === a.id
                    ? 'animate-pulse border-amber-400 bg-amber-500/20 text-amber-300'
                    : 'border-white/15 bg-black/40 text-cyan-300 hover:border-cyan-400'
                }`}
              >
                {capturing === a.id ? 'กดปุ่ม...' : draft[a.id] || '— ไม่มี —'}
              </button>
            </div>
          ))}
        </div>

        {message && <p className="mt-3 text-[11px] text-amber-300">{message}</p>}

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setDraft(defaults)}
            className="flex items-center gap-1 rounded border border-white/15 px-2 py-1 text-neutral-400 hover:bg-white/10"
          >
            <RotateCcw className="h-3 w-3" /> ค่าเริ่มต้น
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-cyan-500 px-4 py-1 font-black text-black hover:bg-cyan-400 disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}
