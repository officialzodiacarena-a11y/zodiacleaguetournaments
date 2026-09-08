'use client';

import { useEffect } from 'react';

interface ActiveThemeResponse {
  data: {
    custom_css_vars: Record<string, string>;
  };
}

// T3.6-B01 — client-side only: ดึง GET /api/v1/themes/active แล้ว inject
// custom_css_vars ลง document.documentElement เป็น CSS custom properties
export default function ThemeInjector() {
  useEffect(() => {
    let cancelled = false;

    async function applyActiveTheme() {
      try {
        const res = await fetch('/api/v1/themes/active');
        if (!res.ok) return;

        const json: ActiveThemeResponse = await res.json();
        if (cancelled) return;

        for (const [key, value] of Object.entries(json.data.custom_css_vars)) {
          document.documentElement.style.setProperty(key, value);
        }
      } catch {
        // เงียบไว้ — ธีมล้มเหลวไม่ควรบล็อกการใช้งานหน้าเว็บ ใช้ CSS default ต่อไปได้
      }
    }

    applyActiveTheme();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
