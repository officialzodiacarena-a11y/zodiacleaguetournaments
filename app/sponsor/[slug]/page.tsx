// app/sponsor/[slug]/page.tsx
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Crown,
  ExternalLink,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface BrandRow {
  slug: string;
  name: string;
  logo_url: string | null;
  badge_icon: string | null;
  sponsor_id: string | null;
  is_active: boolean;
}

interface SponsorRow {
  id: string;
  company_name: string;
  brand_logo_url: string;
  metadata: { website?: string; landing?: { tagline?: string } } | null;
}

interface HeroBannerRow {
  image_url: string;
}

async function loadSponsor(slug: string) {
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from('brands' as never)
    .select('slug, name, logo_url, badge_icon, sponsor_id, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  const brandRow = brand as unknown as BrandRow | null;
  if (!brandRow || !brandRow.sponsor_id) {
    return null;
  }

  const { data: sponsor } = await supabase
    .from('sponsors')
    .select('id, company_name, brand_logo_url, metadata')
    .eq('id', brandRow.sponsor_id)
    .maybeSingle();

  if (!sponsor) {
    return null;
  }

  const sponsorRow = sponsor as unknown as SponsorRow;

  const nowIso = new Date().toISOString();
  const { data: heroBanner } = await supabase
    .from('sponsor_banners' as never)
    .select('image_url')
    .eq('slot_position', 'SPONSOR_LANDING_HERO' as never)
    .eq('sponsor_id', brandRow.sponsor_id)
    .eq('is_active', true)
    .lte('starts_at', nowIso)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order('priority', { ascending: false })
    .order('starts_at', { ascending: false })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();

  return { brand: brandRow, sponsor: sponsorRow, heroBanner: heroBanner as unknown as HeroBannerRow | null };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadSponsor(slug);
  return { title: data?.sponsor.company_name ?? 'Sponsor' };
}

export default async function SponsorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadSponsor(slug);

  if (!data) {
    notFound();
  }

  const { brand, sponsor, heroBanner } = data;
  const logoUrl = brand.logo_url ?? sponsor.brand_logo_url;
  const tagline = sponsor.metadata?.landing?.tagline;
  const website = sponsor.metadata?.website;
  const websiteIsSafe = typeof website === 'string' && website.startsWith('https://');

  return (
    <main className="min-h-screen bg-[#08090F] text-[#F9EDD8] font-sans relative overflow-x-hidden selection:bg-[#E8B429] selection:text-black">
      {/* Ambient Glows */}
      <div className="pointer-events-none fixed -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-[#E8B429]/15 via-[#00D4FF]/5 to-transparent rounded-full blur-[140px] -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-[#E8B429] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับสู่ ZODIAC ARENA</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8B429]/10 border border-[#E8B429]/40 text-xs font-mono font-bold text-[#E8B429]">
            <Crown className="w-3.5 h-3.5 text-[#E8B429]" />
            <span>OFFICIAL PARTNER</span>
          </div>
        </div>

        {heroBanner?.image_url && (
          <div className="relative w-full aspect-[3/1] rounded-3xl overflow-hidden border border-white/10">
            <Image src={heroBanner.image_url} alt={sponsor.company_name} fill sizes="100vw" className="object-cover" priority />
          </div>
        )}

        {/* Hero Section */}
        <section className="relative rounded-3xl border-2 border-[#E8B429]/60 bg-gradient-to-r from-[#151728] via-[#0E101E] to-[#121424] p-8 md:p-12 shadow-[0_0_40px_rgba(232,180,41,0.25)] overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="space-y-4 text-center md:text-left max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#00D4FF]">
                <ShieldCheck className="w-4 h-4 text-[#00D4FF]" />
                <span>VERIFIED ECOSYSTEM PARTNER</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-wide leading-tight">
                {sponsor.company_name}
              </h1>
              {tagline && (
                <p className="text-base md:text-lg text-[#E8B429] font-semibold">
                  {tagline}
                </p>
              )}
            </div>

            {/* Logo Card */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="relative w-44 h-44 md:w-56 md:h-56 rounded-3xl overflow-hidden border-2 border-[#E8B429] shadow-[0_0_35px_rgba(232,180,41,0.35)] bg-white p-2 group hover:scale-105 transition-transform duration-300 flex items-center justify-center">
                <Image
                  src={logoUrl}
                  alt={sponsor.company_name}
                  fill
                  sizes="224px"
                  className="object-contain p-2"
                  priority
                />
              </div>
              {websiteIsSafe && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E8B429] text-[#08090F] font-black text-xs tracking-wider hover:bg-[#f5c84c] hover:shadow-[0_0_20px_rgba(232,180,41,0.4)] transition-all cursor-pointer"
                >
                  <span>เยี่ยมชมเว็บไซต์ทางการ</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
