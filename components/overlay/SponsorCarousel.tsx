"use client";

// components/overlay/SponsorCarousel.tsx
// โลโก้สปอนเซอร์ขนาดเล็กมุมขวาบนของ LiveScoreboard สลับวนทีละอันแบบที่ EWC ใช้ (Qiddiya City / OBSBOT / stc / Lenovo Legion)
// ดึงจาก GET /api/v1/banners ทุกอัน (ไม่กรอง slot) — ถ้าไม่มีข้อมูลจริงไม่แสดงอะไรเลย (ไม่ใช้โลโก้ปลอม)
import React, { useEffect, useState } from "react";

interface CarouselBanner {
  brand_name: string;
  image_url: string;
}

const ROTATE_MS = 4000;

export function SponsorCarousel() {
  const [banners, setBanners] = useState<CarouselBanner[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/banners");
        if (!res.ok) return;
        const json = await res.json();
        const items = (json?.data ?? []) as Array<{ brand_name?: string; image_url?: string }>;
        if (!cancelled) {
          setBanners(
            items
              .filter((b) => b.image_url)
              .map((b) => ({ brand_name: b.brand_name || "Sponsor", image_url: b.image_url as string }))
          );
        }
      } catch {
        // ไม่มีสปอนเซอร์จริง = ไม่แสดงอะไร
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const current = banners[index];

  return (
    <div className="h-6 w-14 flex items-center justify-center bg-white/95 rounded px-1 overflow-hidden shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={current.image_url}
        src={current.image_url}
        alt={current.brand_name}
        className="max-h-full max-w-full object-contain animate-in fade-in duration-500"
      />
    </div>
  );
}
