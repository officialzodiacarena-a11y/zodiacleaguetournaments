// components/overlay/SponsorBadge.tsx
// OBS broadcast overlay: ป้ายสปอนเซอร์ขนาดเล็กสำหรับฉาก LIVE (ธง SkyscraperTower ใหญ่เกินไป จะทับแถบผู้เล่นและภาพเกม)
// GET /api/v1/banners?slot_position=OBS_SPONSOR_BADGE
"use client";

import React, { useEffect, useState } from "react";

interface BadgeBanner {
  brand_name: string | null;
  title: string;
  image_url: string;
}

const FALLBACK_LOGO = "/images/logo/logo.png";

export function SponsorBadge() {
  const [banner, setBanner] = useState<BadgeBanner | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/banners?slot_position=OBS_SPONSOR_BADGE");
        if (!res.ok) return;
        const json = await res.json();
        const item = json?.data?.[0] as { brand_name?: string | null; title?: string; image_url?: string } | undefined;
        if (!cancelled && item?.image_url) {
          setBanner({ brand_name: item.brand_name ?? null, title: item.title ?? "", image_url: item.image_url });
        }
      } catch {
        // ไม่มีแบนเนอร์ — แสดงโลโก้ Zodiac Arena แทน
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex items-center gap-3 bg-[#0A0A0F]/85 backdrop-blur-md px-4 py-2.5 rounded-xl border border-[#E8B429]/40 shadow-lg">
      <div className="h-11 w-11 rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgError || !banner ? FALLBACK_LOGO : banner.image_url}
          alt={banner?.brand_name ?? banner?.title ?? "Zodiac Arena"}
          className="h-full w-full object-contain"
          onError={() => setImgError(true)}
        />
      </div>
      {banner && (
        <div>
          <p className="text-[9px] font-mono tracking-[0.2em] text-[#E8B429] uppercase">Title Sponsor</p>
          <p className="text-sm font-black text-white tracking-wide uppercase">{banner.brand_name ?? banner.title}</p>
        </div>
      )}
    </div>
  );
}
