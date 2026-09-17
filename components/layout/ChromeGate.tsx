'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import ZodiacOracle from '@/components/ZodiacOracle';

// เส้นทางที่ต้องเป็น Clean View ล้วน ๆ (เช่น OBS Browser Source overlay)
// ห้ามมี Navbar / floating widget ใด ๆ ปนมาบนภาพสตรีมเด็ดขาด
const CHROME_FREE_PREFIXES = ['/overlay'];

export default function ChromeGate() {
  const pathname = usePathname();
  const isChromeFree = CHROME_FREE_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  if (isChromeFree) return null;

  return (
    <>
      <Navbar />
      <ZodiacOracle />
    </>
  );
}
