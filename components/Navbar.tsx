'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MAIN_NAV_ITEMS, getBrandHomeUrl } from '@/config/navigation';

interface NavbarProps {
  isAuthenticated?: boolean;
}

export default function Navbar({ isAuthenticated = false }: NavbarProps) {
  const pathname = usePathname();
  const brandHomeUrl = getBrandHomeUrl(isAuthenticated);

  return (
    <nav className="sticky top-0 z-50 flex h-[60px] items-center justify-between border-b border-[#E8B429]/20 bg-[#08090F]/95 px-6 md:px-10 backdrop-blur-md">
      {/* 1. Brand Logo - สลับ URL หน้าแรกตามสถานะ Auth อัตโนมัติ */}
      <Link href={brandHomeUrl} className="flex items-center gap-2.5 group">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-[#E8B429] bg-[#E8B429]/10 font-black text-sm text-[#E8B429] group-hover:bg-[#E8B429] group-hover:text-[#08090F] transition-all shadow-[0_0_10px_rgba(232,180,41,0.2)]">
          Z
        </div>
        <span className="font-extrabold text-sm tracking-widest text-white uppercase font-orbitron">
          ZODIAC <span className="text-[#E8B429]">ARENA</span>
        </span>
      </Link>

      {/* 2. Navigation Items - ดึงมาจาก config/navigation.ts */}
      <div className="hidden md:flex items-center gap-7 text-[13px] font-medium text-[#94A3B8]">
        {MAIN_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors hover:text-[#E8B429] py-1 relative ${
                isActive ? 'text-[#E8B429] font-bold' : ''
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E8B429] shadow-[0_0_8px_#E8B429]" />
              )}
            </Link>
          );
        })}
      </div>

      {/* 3. Auth Action Button */}
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <Link
            href="/dashboard"
            className="rounded-lg border border-[#E8B429]/40 bg-[#E8B429]/10 px-3.5 py-1.5 text-xs font-bold text-[#E8B429] hover:bg-[#E8B429] hover:text-black transition-all shadow-[0_0_10px_rgba(232,180,41,0.15)]"
          >
            DASHBOARD
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-gradient-to-r from-[#E8B429] to-[#D4A017] px-4 py-1.5 text-xs font-black tracking-wider text-black hover:opacity-90 transition-all shadow-[0_0_15px_rgba(232,180,41,0.25)]"
          >
            LOGIN
          </Link>
        )}
      </div>
    </nav>
  );
}
