// app/sponsor/[slug]/page.tsx
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Crown,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface SponsorProfile {
  slug: string;
  name: string;
  badge: string;
  tier: string;
  tagline: string;
  logo: string;
  website: string;
  heroQuote: string;
  description: string;
  services: { title: string; desc: string; icon: string }[];
  targetGroups: string[];
  perks: { title: string; ap: string; desc: string }[];
}

const STATIC_SPONSORS: Record<string, SponsorProfile> = {
  luminary: {
    slug: 'luminary',
    name: 'LUMINARY GLOBAL',
    badge: 'OFFICIAL TITLE SPONSOR / CO-OPERATOR',
    tier: 'TIER 1 • TITLE SPONSOR',
    tagline: 'บริษัทบริการทำความสะอาดครบวงจร',
    logo: '/images/sponser/luminary_global.jpg',
    website: 'https://luminary-global.vercel.app/',
    heroQuote: '“เรียก Luminary แล้วไม่ใช่แค่มีคนมาถูบ้าน แต่มีทีมที่เข้ามาจัดการพื้นที่อย่างเป็นระบบ”',
    description:
      'Luminary วางภาพลักษณ์เป็นบริษัททำความสะอาดที่ให้บริการอย่างเป็นระบบ ตั้งแต่การทำความสะอาดทั่วไป ไปจนถึงงานทำความสะอาดเชิงลึกและงานเฉพาะทาง โดยเน้น มาตรฐานการทำงาน ความเรียบร้อย ความรับผิดชอบ และการบริการที่เป็นมืออาชีพ',
    services: [
      { title: 'General Cleaning', desc: 'บริการทำความสะอาดทั่วไป ดูแลความเรียบร้อยประจำวัน', icon: '🧹' },
      { title: 'Deep Cleaning', desc: 'ทำความสะอาดเชิงลึกทุกซอกมุม ฆ่าเชื้อและฟื้นฟูสภาพพื้นผิว', icon: '✨' },
      { title: 'Big Cleaning', desc: 'ทำความสะอาดครั้งใหญ่ หลังก่อสร้าง รีโนเวท หรือย้ายเข้า-ออก', icon: '🏠' },
      { title: 'Specialized Cleaning', desc: 'งานทำความสะอาดเฉพาะจุด/เฉพาะวัสดุ (พรม โซฟา กระจกสูง)', icon: '🧽' },
      { title: 'Project & Facility Care', desc: 'งานดูแลพื้นที่โครงการและอาคารเชิงพาณิชย์', icon: '🏢' },
      { title: 'Maid & Cleaning Staffing', desc: 'บริการจัดหาแม่บ้านและพนักงานทำความสะอาดมืออาชีพ', icon: '👩🏻‍🔧' },
    ],
    targetGroups: [
      'บ้านพักอาศัยทั่วไป',
      'บ้านหรู / Luxury Residence',
      'คอนโดมิเนียมและหอพัก',
      'สำนักงานและ Co-Working Space',
      'โครงการบ้านจัดสรร',
      'อาคารและพื้นที่ส่วนกลาง',
      'ลูกค้าโครงการที่ต้องการผู้ให้บริการแบบต่อเนื่อง',
    ],
    perks: [
      { title: 'Voucher ส่วนลด Big Cleaning 15%', ap: '1,500 AP', desc: 'ใช้เป็นส่วนลดบริการทำความสะอาดครั้งใหญ่ทุกขนาดพื้นที่' },
      { title: 'สิทธิ์ตรวจประเมินพื้นที่ฟรี 1 ครั้ง', ap: '800 AP', desc: 'ทีมผู้เชี่ยวชาญเข้าสำรวจและวางแผนการดูแลสุขอนามัยพื้นที่' },
      { title: 'แพ็กเกจ Deep Cleaning คอนโดพิเศษ', ap: '3,000 AP', desc: 'บริการทำความสะอาดเชิงลึก 4 ชั่วโมงเต็ม' },
    ],
  },
};

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
  metadata: { 
    website?: string; 
    landing?: { 
      tagline?: string;
      description?: string;
      heroQuote?: string;
      services?: { title: string; desc: string; icon: string }[];
      targetGroups?: string[];
      perks?: { title: string; ap: string; desc: string }[];
    } 
  } | null;
}

interface HeroBannerRow {
  image_url: string;
}

async function loadSponsor(slug: string) {
  const normalizedSlug = slug.toLowerCase();
  const staticData = STATIC_SPONSORS[normalizedSlug];

  try {
    const supabase = await createClient();

    const { data: brand } = await supabase
      .from('brands' as never)
      .select('slug, name, logo_url, badge_icon, sponsor_id, is_active')
      .eq('slug', normalizedSlug)
      .eq('is_active', true)
      .maybeSingle();

    const brandRow = brand as unknown as BrandRow | null;
    if (brandRow && brandRow.sponsor_id) {
      const { data: sponsor } = await supabase
        .from('sponsors')
        .select('id, company_name, brand_logo_url, metadata')
        .eq('id', brandRow.sponsor_id)
        .maybeSingle();

      if (sponsor) {
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

        return {
          brand: brandRow,
          sponsor: sponsorRow,
          heroBanner: heroBanner as unknown as HeroBannerRow | null,
          staticFallback: staticData || null,
        };
      }
    }
  } catch {
    // If DB query fails, fallback safely to static data
  }

  if (staticData) {
    return {
      brand: null,
      sponsor: null,
      heroBanner: null,
      staticFallback: staticData,
    };
  }

  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadSponsor(slug);
  const name = data?.sponsor?.company_name || data?.staticFallback?.name || 'Sponsor';
  return { title: `${name} | Zodiac Arena Official Partner` };
}

export default async function SponsorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadSponsor(slug);

  if (!data) {
    notFound();
  }

  const { brand, sponsor, heroBanner, staticFallback } = data;

  const companyName = sponsor?.company_name || staticFallback?.name || 'Official Partner';
  const logoUrl = brand?.logo_url || sponsor?.brand_logo_url || staticFallback?.logo || '/images/sponser/luminary_global.jpg';
  const tagline = sponsor?.metadata?.landing?.tagline || staticFallback?.tagline;
  const description = sponsor?.metadata?.landing?.description || staticFallback?.description;
  const heroQuote = sponsor?.metadata?.landing?.heroQuote || staticFallback?.heroQuote;
  const website = sponsor?.metadata?.website || staticFallback?.website || 'https://luminary-global.vercel.app/';
  const badge = staticFallback?.badge || 'OFFICIAL ECOSYSTEM PARTNER';
  const services = sponsor?.metadata?.landing?.services || staticFallback?.services || [];
  const targetGroups = sponsor?.metadata?.landing?.targetGroups || staticFallback?.targetGroups || [];
  const perks = sponsor?.metadata?.landing?.perks || staticFallback?.perks || [];

  const websiteIsSafe = typeof website === 'string' && (website.startsWith('https://') || website.startsWith('http://'));

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
            <span>{badge}</span>
          </div>
        </div>

        {heroBanner?.image_url && (
          <div className="relative w-full aspect-[3/1] rounded-3xl overflow-hidden border border-white/10">
            <Image src={heroBanner.image_url} alt={companyName} fill sizes="100vw" className="object-cover" priority />
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
                {companyName}
              </h1>
              {tagline && (
                <p className="text-base md:text-lg text-[#E8B429] font-semibold">
                  {tagline}
                </p>
              )}
              {description && (
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {description}
                </p>
              )}
              {heroQuote && (
                <blockquote className="border-l-4 border-[#E8B429] pl-4 py-1 text-sm md:text-base italic text-zinc-200 bg-[#E8B429]/5 rounded-r-lg font-sans">
                  {heroQuote}
                </blockquote>
              )}
            </div>

            {/* Logo Card */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="relative w-44 h-44 md:w-56 md:h-56 rounded-3xl overflow-hidden border-2 border-[#E8B429] shadow-[0_0_35px_rgba(232,180,41,0.35)] bg-white p-2 group hover:scale-105 transition-transform duration-300 flex items-center justify-center">
                <Image
                  src={logoUrl}
                  alt={companyName}
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

        {/* Services Grid */}
        {services.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-mono font-bold text-white uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#E8B429]" />
              <span>บริการหลักที่วางไว้ (CORE SERVICES)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((srv, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/10 bg-[#121424] p-5 space-y-2.5 hover:border-[#E8B429]/60 hover:bg-[#1A1C30] transition-all duration-300"
                >
                  <div className="text-2xl">{srv.icon}</div>
                  <h3 className="text-base font-bold text-white tracking-wide">{srv.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{srv.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Target Customers & Segments */}
        {targetGroups.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-[#101223] p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-2 text-sm font-mono font-bold text-[#00D4FF] uppercase tracking-wider">
              <Building className="w-4 h-4 text-[#00D4FF]" />
              <span>กลุ่มลูกค้าเป้าหมาย (TARGET CLIENTELE)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {targetGroups.map((grp, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#E8B429] shrink-0" />
                  <span className="font-semibold">{grp}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Marketplace Rewards / AP Exchange Perks */}
        {perks.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-mono font-bold text-[#E8B429] uppercase tracking-wider">
                <Crown className="w-4 h-4 text-[#E8B429]" />
                <span>สิทธิพิเศษแลกแต้ม AP (ZODIAC MARKETPLACE REWARDS)</span>
              </div>
              <Link
                href="/store"
                className="text-xs font-mono text-[#00D4FF] hover:underline inline-flex items-center gap-1"
              >
                <span>ไปยังหน้าร้านค้า</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {perks.map((p, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-[#E8B429]/30 bg-gradient-to-b from-[#181A2C] to-[#121424] p-5 space-y-3 flex flex-col justify-between shadow-lg"
                >
                  <div className="space-y-1.5">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#E8B429]/20 text-[#E8B429] text-[10px] font-mono font-bold">
                      {p.ap}
                    </span>
                    <h4 className="text-sm font-bold text-white">{p.title}</h4>
                    <p className="text-xs text-zinc-400">{p.desc}</p>
                  </div>

                  <Link
                    href="/store"
                    className="w-full text-center py-2 rounded-xl bg-white/10 hover:bg-[#E8B429] hover:text-[#08090F] text-xs font-bold text-white transition-all cursor-pointer block"
                  >
                    แลกรับใน Marketplace
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
