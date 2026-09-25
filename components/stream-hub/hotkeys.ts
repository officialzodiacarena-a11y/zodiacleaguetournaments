'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Hotkey ของห้องคุม Stream Hub — ผูกกับบัญชีผู้ใช้ (เก็บใน auth user_metadata ไม่ต้องสร้างตารางใหม่)
// ถ้าไม่ได้ล็อกอิน จะเก็บไว้ในเบราว์เซอร์เครื่องนั้นแทน
export type HotkeyMap = Record<string, string>;

export interface HotkeyAction {
  id: string;
  label: string;
}

// แท็บ SYSTEM SCENES ของ Stream Hub — ใช้ร่วมกันระหว่างหน้า Stream Hub (ตัวจริง) กับหน้า Broadcast Control (รีโมต)
// id ผูกกับตัวฉาก (ไม่ใช่ลำดับแท็บ) เพื่อให้ Hotkey ที่ผู้ใช้บันทึกไว้ไม่เพี้ยนถ้าลำดับแท็บเปลี่ยนภายหลัง
// scene = เลขฉากภายในของ Stream Hub (null = ปุ่มสั่งงาน ไม่ใช่ฉาก)
export const HUB_TABS: (HotkeyAction & { scene: number | null })[] = [
  { id: 'startingSoon', label: '1. Starting Soon', scene: 4 },
  { id: 'liveHud', label: '2. Ingame Live HUD', scene: 5 },
  { id: 'cleanVeto', label: '3. Clean Map Veto', scene: 7 },
  { id: 'intermission', label: '4. Clean Intermission/MVP', scene: 8 },
  { id: 'ingameVeto', label: '5. Ingame Map Veto', scene: 9 },
  { id: 'captainVeto', label: '6. Captain Veto Room', scene: 10 },
  { id: 'testClutch', label: '7. Test: Clutch 1vX', scene: null },
];

export const HOTKEY_ACTIONS: HotkeyAction[] = [...HUB_TABS, { id: 'buyPhase', label: 'เปิด/ปิด Buy Phase' }];

export const DEFAULT_HOTKEYS: HotkeyMap = {
  startingSoon: 'Alt+1',
  liveHud: 'Alt+2',
  cleanVeto: 'Alt+3',
  intermission: 'Alt+4',
  ingameVeto: 'Alt+5',
  captainVeto: 'Alt+6',
  testClutch: 'Alt+7',
  buyPhase: 'Alt+C',
};

const METADATA_KEY = 'stream_hub_hotkeys';
const LOCAL_KEY = 'stream-hub-hotkeys';

// แปลง KeyboardEvent เป็นข้อความเช่น "Alt+1" — ใช้ e.code เพื่อให้ทำงานได้แม้เปิดแป้นภาษาไทยอยู่
export function comboFromEvent(e: KeyboardEvent): string | null {
  let key: string | null = null;
  if (/^Digit\d$/.test(e.code)) key = e.code.slice(5);
  else if (/^Numpad\d$/.test(e.code)) key = e.code.slice(6);
  else if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3);
  else if (/^F\d{1,2}$/.test(e.code)) key = e.code;
  if (!key) return null;

  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  // ปุ่มตัวอักษร/ตัวเลขเดี่ยวๆ ต้องมีปุ่มเสริมเสมอ ไม่งั้นจะชนกับการพิมพ์ปกติ (F1-F12 กดเดี่ยวได้)
  if (parts.length === 0 && !key.startsWith('F')) return null;
  parts.push(key);
  return parts.join('+');
}

export function useStreamHubHotkeys(defaults: HotkeyMap) {
  const [hotkeys, setHotkeys] = useState<HotkeyMap>(defaults);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      let saved: HotkeyMap | null = null;
      let uid: string | null = null;
      try {
        const { data } = await createClient().auth.getUser();
        uid = data.user?.id ?? null;
        saved = (data.user?.user_metadata?.[METADATA_KEY] as HotkeyMap | undefined) ?? null;
      } catch {
        // ไม่ได้ล็อกอิน / เครือข่ายล่ม — ใช้ค่าในเครื่องแทน
      }
      if (!saved) {
        try {
          const raw = localStorage.getItem(`${LOCAL_KEY}:${uid ?? 'guest'}`);
          if (raw) saved = JSON.parse(raw) as HotkeyMap;
        } catch {
          // localStorage ใช้ไม่ได้ — ใช้ค่าเริ่มต้น
        }
      }
      if (!active) return;
      setUserId(uid);
      if (saved) setHotkeys({ ...defaults, ...saved });
    };
    void load();
    return () => {
      active = false;
    };
    // defaults เป็นค่าคงที่ของหน้า โหลดครั้งเดียวพอ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(
    async (next: HotkeyMap): Promise<string | null> => {
      setHotkeys(next);
      try {
        localStorage.setItem(`${LOCAL_KEY}:${userId ?? 'guest'}`, JSON.stringify(next));
      } catch {
        // ไม่เป็นไร ถ้าล็อกอินอยู่ยังเก็บในบัญชีได้
      }
      if (!userId) return 'ยังไม่ได้ล็อกอิน — บันทึกไว้ในเครื่องนี้เท่านั้น';
      const { error } = await createClient().auth.updateUser({ data: { [METADATA_KEY]: next } });
      return error ? `บันทึกลงบัญชีไม่สำเร็จ: ${error.message}` : null;
    },
    [userId],
  );

  return { hotkeys, save, userId };
}
