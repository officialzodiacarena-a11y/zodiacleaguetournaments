// components/sponsor/OfficialSponsorsBar.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { Crown, ShieldCheck, Sparkles } from 'lucide-react';

export function OfficialSponsorsBar() {
  const partners = [
    {
      name: 'LUMINARY GLOBAL',
      title: 'ผู้สนับสนุนหลักอย่างเป็นทางการ ประจำศึก ZODIAC ARENA ESPORTS SAAS PROTOCOL',
      tierLabel: 'TIER 1 • TITLE SPONSOR / CO-OPERATOR',
      image: '/images/sponser/luminary_global.jpg',
      badge: 'OFFICIAL TITLE SPONSOR / CO-OPERATOR',
      highlight: true,
    },
    {
      name: 'HBC HEALTHY BEAUTY CLUB',
      title: 'OFFICIAL HEALTH & BEAUTY PARTNER',
      tierLabel: 'TIER 2 • SPONSOR & PARTNER',
      image: '/images/sponser/hbc_beauty.jpg',
      badge: 'SPONSOR & PARTNER',
    },
    {
      name: 'กินเที่ยว เลี้ยวเข้าวัด',
      title: 'OFFICIAL TRAVEL & LIFESTYLE PARTNER',
      tierLabel: 'TIER 2 • SPONSOR & PARTNER',
      image: '/images/sponser/kin_thiew_wat.jpg',
      badge: 'SPONSOR & PARTNER',
    },
    {
      name: 'ZODIAC MANAGEMENT CO.,LTD.',
      title: 'MANAGING PROTOCOL ENTITY',
      tierLabel: 'TIER 1 • MANAGING ENTITY',
      image: '/images/sponser/zodiac_management.jpg',
      badge: 'MANAGEMENT ENTITY',
    },
    {
      name: 'MONSOON',
      title: 'OFFICIAL LIFESTYLE BRAND',
      tierLabel: 'TIER 3 • SPONSOR',
      image: '/images/sponser/monsoon_light.jpg',
      badge: 'SPONSOR',
    },
    {
      name: 'บริษัทเพื่อนเทรดเดอร์สมุทรปราการจำกัด',
      title: 'OFFICIAL TRADING & FINANCIAL PARTNER',
      tierLabel: 'TIER 3 • SPONSOR',
      image: '/images/sponser/phuan_trader.jpg',
      badge: 'SPONSOR',
    },
  ];

  const titleSponsor = partners[0];
  const otherPartners = partners.slice(1);

  return (
    <div className="w-full max-w-7xl mx-auto my-8 space-y-6">
      {/* Tier 1: Title Sponsor / Co-operator Section */}
      <div className="relative rounded-2xl border-2 border-[#E8B429]/50 bg-gradient-to-r from-[#121424] via-[#1A1C30] to-[#121424] p-6 shadow-[0_0_35px_rgba(232,180,41,0.2)] overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8B429]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 text-center md:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#E8B429]/40 bg-[#E8B429]/15 text-xs font-mono font-bold text-[#E8B429]">
              <Crown className="w-4 h-4 text-[#E8B429] animate-pulse" />
              <span>TIER 1 • OFFICIAL TITLE SPONSOR / CO-OPERATOR</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-wide">
              {titleSponsor.name}
            </h3>
            <p className="text-xs md:text-sm text-zinc-300 font-sans leading-relaxed">
              {titleSponsor.title}
            </p>
          </div>

          {/* Logo Frame + Title Sponsor Badge (Placed Below Image so text is NEVER covered) */}
          <div className="flex flex-col items-center md:items-end gap-2.5">
            <div className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border-2 border-[#E8B429] shadow-[0_4px_30px_rgba(232,180,41,0.35)] group hover:scale-105 transition-all duration-300 bg-white flex items-center justify-center">
              <Image
                src={titleSponsor.image}
                alt={titleSponsor.name}
                fill
                sizes="(max-width: 768px) 176px, 192px"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                priority
              />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#E8B429]/20 border border-[#E8B429]/60 text-xs font-mono font-bold text-[#E8B429] shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#E8B429]" />
              <span>OFFICIAL TITLE SPONSOR</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tiers 2 & 3: Official Partners & Ecosystem Sponsors */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest px-1">
          <ShieldCheck className="w-4 h-4 text-[#00D4FF]" />
          <span>OFFICIAL PARTNERS & ECOSYSTEM SPONSORS (TIER 2 & TIER 3)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {otherPartners.map((item, idx) => (
            <div
              key={idx}
              className="group relative rounded-xl border border-white/10 bg-[#121424]/80 p-3 hover:border-[#00D4FF]/50 hover:bg-[#1A1C30] transition-all duration-300 flex flex-col items-center justify-between text-center space-y-2"
            >
              <div className="relative w-full h-24 rounded-lg overflow-hidden border border-white/5 bg-[#0D0E1A]">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="(max-width: 768px) 120px, 160px"
                  className="object-contain p-1.5 group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <div className="space-y-1 w-full">
                <span className="text-[11px] font-bold text-zinc-200 line-clamp-1 group-hover:text-[#00D4FF] transition-colors block">
                  {item.name}
                </span>
                <span className="text-[9px] font-mono text-zinc-400 block tracking-tight">
                  {item.tierLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
