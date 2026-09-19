// components/sponsor/OfficialSponsorsBar.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { Crown, ShieldCheck, Sparkles } from 'lucide-react';

export function OfficialSponsorsBar() {
  const partners = [
    {
      name: 'LUMINARY GLOBAL',
      title: 'TITLE SPONSOR (สปอนเซอร์หลักอย่างเป็นทางการ)',
      tier: 'TITLE_SPONSOR',
      image: '/images/sponser/luminary_global.jpg',
      badge: 'OFFICIAL TITLE SPONSOR',
      highlight: true,
    },
    {
      name: 'HBC HEALTHY BEAUTY CLUB',
      title: 'OFFICIAL HEALTH & BEAUTY PARTNER',
      tier: 'MAIN_PARTNER',
      image: '/images/sponser/hbc_beauty.jpg',
      badge: 'PREMIUM PARTNER',
    },
    {
      name: 'กินเที่ยว เลี้ยวเข้าวัด',
      title: 'OFFICIAL TRAVEL & LIFESTYLE PARTNER',
      tier: 'MAIN_PARTNER',
      image: '/images/sponser/kin_thiew_wat.jpg',
      badge: 'PARTNER',
    },
    {
      name: 'ZODIAC MANAGEMENT CO.,LTD.',
      title: 'MANAGING PROTOCOL ENTITY',
      tier: 'OFFICIAL_ENTITY',
      image: '/images/sponser/zodiac_management.jpg',
      badge: 'MANAGEMENT',
    },
    {
      name: 'MONSOON',
      title: 'OFFICIAL LIFESTYLE BRAND',
      tier: 'PARTNER',
      image: '/images/sponser/monsoon_light.jpg',
      badge: 'PARTNER',
    },
    {
      name: 'บริษัทเพื่อนเทรดเดอร์สมุทรปราการจำกัด',
      title: 'OFFICIAL TRADING & FINANCIAL PARTNER',
      tier: 'PARTNER',
      image: '/images/sponser/phuan_trader.jpg',
      badge: 'PARTNER',
    },
  ];

  const titleSponsor = partners[0];
  const otherPartners = partners.slice(1);

  return (
    <div className="w-full max-w-7xl mx-auto my-8 space-y-6">
      {/* Title Sponsor Section */}
      <div className="relative rounded-2xl border-2 border-[#E8B429]/50 bg-gradient-to-r from-[#121424] via-[#1A1C30] to-[#121424] p-6 shadow-[0_0_35px_rgba(232,180,41,0.2)] overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8B429]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E8B429]/40 bg-[#E8B429]/15 text-xs font-mono font-bold text-[#E8B429]">
              <Crown className="w-4 h-4 text-[#E8B429] animate-pulse" />
              <span>OFFICIAL TITLE SPONSOR • TIER 1 HIGHEST RANK</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-wide">
              {titleSponsor.name}
            </h3>
            <p className="text-xs md:text-sm text-zinc-400 font-sans">
              ผู้สนับสนุนหลักอย่างเป็นทางการ ประจำศึก ZODIAC ARENA ESPORTS SAAS PROTOCOL
            </p>
          </div>

          <div className="relative w-48 h-32 md:w-64 md:h-36 rounded-xl overflow-hidden border border-[#E8B429]/60 shadow-[0_4px_20px_rgba(0,0,0,0.5)] group hover:scale-105 transition-all duration-300">
            <Image
              src={titleSponsor.image}
              alt={titleSponsor.name}
              fill
              sizes="(max-width: 768px) 192px, 256px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#E8B429] bg-black/70 px-2 py-0.5 rounded border border-[#E8B429]/30">
                TITLE SPONSOR
              </span>
              <Sparkles className="w-3.5 h-3.5 text-[#E8B429]" />
            </div>
          </div>
        </div>
      </div>

      {/* Official Partners Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest px-1">
          <ShieldCheck className="w-4 h-4 text-[#00D4FF]" />
          <span>OFFICIAL PARTNERS & ECOSYSTEM SPONSORS</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {otherPartners.map((item, idx) => (
            <div
              key={idx}
              className="group relative rounded-xl border border-white/10 bg-[#121424]/80 p-3 hover:border-[#00D4FF]/50 hover:bg-[#1A1C30] transition-all duration-300 flex flex-col items-center justify-center text-center space-y-2"
            >
              <div className="relative w-full h-24 rounded-lg overflow-hidden border border-white/5">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="(max-width: 768px) 120px, 160px"
                  className="object-contain p-1 group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <span className="text-[11px] font-bold text-zinc-300 line-clamp-1 group-hover:text-[#00D4FF] transition-colors">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
