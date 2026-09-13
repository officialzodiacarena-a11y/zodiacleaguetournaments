// app/admin/marketplace/banners/page.tsx
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireMarketplaceAdminPage } from '@/lib/admin/requireMarketplaceAdminPage';
import { BannerManager } from '@/components/admin/marketplace/BannerManager';

export const dynamic = 'force-dynamic';

export default async function AdminBannersPage() {
  await requireMarketplaceAdminPage();

  return (
    <div className="min-h-screen bg-[#0D0E1A] p-6 md:p-10 font-sans select-none text-[#F9EDD8]">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* TOP BREADCRUMB & HEADER */}
        <div className="border-b border-[#E8B429]/15 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/admin/marketplace"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#94A3B8] hover:text-[#E8B429] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Marketplace Hub</span>
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-xs font-mono text-[#E8B429]">SPONSOR BANNERS</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-wider text-white">
            SPONSOR BANNER <span className="text-[#E8B429]">MANAGEMENT PORTAL</span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            จัดการแบนเนอร์โฆษณาพาร์ตเนอร์ SINOPEC, ควบคุมการหมุนเวียน (Flight Rotation) และติดตาม ROI Metrics
          </p>
        </div>

        {/* BANNER MANAGER COMPONENT */}
        <BannerManager />

      </div>
    </div>
  );
}