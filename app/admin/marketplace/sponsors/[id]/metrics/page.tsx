// app/admin/marketplace/sponsors/[id]/metrics/page.tsx
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Eye, MousePointerClick, TrendingUp, BarChart3, Layers } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireMarketplaceAdminPage } from '@/lib/admin/requireMarketplaceAdminPage';

export const dynamic = 'force-dynamic';

export default async function SponsorMetricsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMarketplaceAdminPage();
  const { id } = await params;

  const supabase = await createClient();

  const { data: sponsor } = await supabase
    .from('sponsors')
    .select('id, company_name, tier, status')
    .eq('id', id)
    .single();

  if (!sponsor) notFound();

  const { data: banners } = await supabase
    .from('sponsor_banners')
    .select('id, title, slot_position, impression_count, click_count')
    .eq('sponsor_id', id);

  const bannerRows = banners ?? [];
  const totalImpressions = bannerRows.reduce((sum, b) => sum + Number(b.impression_count || 0), 0);
  const totalClicks = bannerRows.reduce((sum, b) => sum + Number(b.click_count || 0), 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

  const { data: coupons } = await supabase.from('partner_coupons').select('id').eq('sponsor_id', id);
  const couponIds = (coupons ?? []).map((c) => c.id);

  let redemptionsCount = 0;
  if (couponIds.length > 0) {
    const { count } = await supabase
      .from('partner_coupon_redemptions')
      .select('id', { count: 'exact', head: true })
      .in('coupon_id', couponIds);
    redemptionsCount = count ?? 0;
  }

  return (
    <div className="min-h-screen bg-[#0D0E1A] p-6 md:p-10 font-sans select-none text-[#F9EDD8]">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="border-b border-[#E8B429]/15 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/admin/marketplace/sponsors"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#94A3B8] hover:text-[#E8B429] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sponsors</span>
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-xs font-mono text-[#E8B429]">{sponsor.tier}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-wider text-white">
            TELEMETRY: <span className="text-[#E8B429]">{sponsor.company_name.toUpperCase()}</span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">สถานะ: {sponsor.status} · High-Throughput Batch Metrics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[#1A1C2E] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between text-[#94A3B8] text-xs font-mono mb-2">
              IMPRESSIONS <Eye className="w-4 h-4 text-[#00D4FF]" />
            </div>
            <div className="text-3xl font-black text-white">{totalImpressions.toLocaleString()}</div>
          </div>

          <div className="bg-[#1A1C2E] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between text-[#94A3B8] text-xs font-mono mb-2">
              TOTAL CLICKS <MousePointerClick className="w-4 h-4 text-[#E8B429]" />
            </div>
            <div className="text-3xl font-black text-[#E8B429]">{totalClicks.toLocaleString()}</div>
          </div>

          <div className="bg-[#1A1C2E] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between text-[#94A3B8] text-xs font-mono mb-2">
              CTR % <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-emerald-400">{ctr}%</div>
          </div>

          <div className="bg-[#1A1C2E] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between text-[#94A3B8] text-xs font-mono mb-2">
              COUPONS REDEEMED <BarChart3 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-black text-purple-400">{redemptionsCount.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-[#1A1C2E] border border-white/5 rounded-2xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8] mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#E8B429]" /> แบนเนอร์ที่ผูกกับสปอนเซอร์นี้
          </h2>
          {bannerRows.length === 0 ? (
            <p className="text-xs text-zinc-500">ยังไม่มีแบนเนอร์ที่ผูกกับสปอนเซอร์นี้ — ไปที่หน้า Banner Management เพื่อผูก sponsor_id</p>
          ) : (
            <div className="space-y-2">
              {bannerRows.map((b) => (
                <div key={b.id} className="flex items-center justify-between border-b border-white/5 py-2 text-xs">
                  <span className="text-white font-bold">{b.title}</span>
                  <span className="font-mono text-[#00D4FF]">{b.slot_position}</span>
                  <span className="font-mono text-zinc-400">
                    {Number(b.impression_count || 0).toLocaleString()} views · {Number(b.click_count || 0).toLocaleString()} clicks
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
