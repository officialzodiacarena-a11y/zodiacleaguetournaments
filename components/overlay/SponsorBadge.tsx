// components/overlay/SponsorBadge.tsx
// OBS broadcast overlay: ป้ายสปอนเซอร์ขนาดเล็กสำหรับฉาก LIVE (ธง SkyscraperTower ใหญ่เกินไป จะทับแถบผู้เล่นและภาพเกม)
// ใช้แหล่งข้อมูลเดียวกับ SkyscraperTower ฝั่งซ้าย (Title Sponsor): GET /api/v1/banners?slot_position=LEFT_TOWER
"use client";

import React, { useEffect, useState } from "react";

interface BadgeBanner {
  brand_name: string;
  image_url: string;
}

const DEFAULT_LOGO = "/images/sponser/luminary_global.jpg";
const DEFAULT_BANNER: BadgeBanner = { brand_name: "LUMINARY GLOBAL", image_url: DEFAULT_LOGO };

export function SponsorBadge() {
  const [banner, setBanner] = useState<BadgeBanner>(DEFAULT_BANNER);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/banners?slot_position=LEFT_TOWER");
        if (!res.ok) return;
        const json = await res.json();
        const item = json?.data?.[0] as { brand_name?: string; image_url?: string } | undefined;
        if (!cancelled && item) {
          // เหมือน SkyscraperTower: แบนเนอร์เก่าชื่อ SINOPEC ให้แสดงเป็น Luminary Global
          const isLegacy = (item.brand_name || "").toUpperCase().includes("SINOPEC");
          setBanner({
            brand_name: isLegacy ? DEFAULT_BANNER.brand_name : item.brand_name || DEFAULT_BANNER.brand_name,
            image_url: isLegacy ? DEFAULT_LOGO : item.image_url || DEFAULT_LOGO,
          });
        }
      } catch {
        // ใช้ค่าเริ่มต้น (Luminary Global)
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
          src={imgError ? DEFAULT_LOGO : banner.image_url}
          alt={banner.brand_name}
          className="h-full w-full object-contain"
          onError={() => setImgError(true)}
        />
      </div>
      <div>
        <p className="text-[9px] font-mono tracking-[0.2em] text-[#E8B429] uppercase">Title Sponsor</p>
        <p className="text-sm font-black text-white tracking-wide uppercase">{banner.brand_name}</p>
      </div>
    </div>
  );
}
