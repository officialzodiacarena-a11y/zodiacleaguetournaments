'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import ZodiacOracle from '@/components/ZodiacOracle';
import { chromeVisibility } from '@/lib/layout/chromeVisibility';

// กฎว่าหน้าไหนแสดง Navbar / ปุ่มลอยแชทบอท อยู่ที่ lib/layout/chromeVisibility.ts ที่เดียว
// (Clean View ของ /overlay และ /stream-hub ห้ามมี Navbar / floating widget ใด ๆ ปนบนภาพสตรีม)
export default function ChromeGate() {
  const pathname = usePathname();
  const { navbar, oracle } = chromeVisibility(pathname);

  if (!navbar && !oracle) return null;

  return (
    <>
      {navbar && <Navbar />}
      {oracle && <ZodiacOracle />}
    </>
  );
}
