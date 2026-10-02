import React from 'react';
import Image from 'next/image';

interface RuleTemplateProps {
  title: string;
  formatName: string;
  children: React.ReactNode;
}

export function RuleTemplate({ title, formatName, children }: RuleTemplateProps) {
  return (
    <div className="w-full max-w-4xl mx-auto bg-[#0f1115] text-zinc-300 border border-amber-500/30 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.1)] mb-8 font-sans">
      {/* Header Section */}
      <div className="relative border-b border-amber-500/30 bg-gradient-to-r from-[#161a22] via-[#2a1d0d] to-[#161a22] p-6 md:p-8 flex items-center gap-6">
        <div className="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0">
          <Image
            src="/images/logo/logo.png"
            alt="Zodiac Arena Logo"
            fill
            className="object-contain drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]"
            sizes="(max-width: 96px) 100vw, 96px"
          />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-amber-500 tracking-wider uppercase drop-shadow-md">
            {title}
          </h1>
          <p className="text-zinc-400 text-sm md:text-base mt-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
            รูปแบบการแข่งขัน: <span className="text-amber-100 font-semibold">{formatName}</span>
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 md:p-10 space-y-8 text-sm md:text-base leading-relaxed rules-content">
        {children}
      </div>

      {/* Footer Section */}
      <div className="bg-[#121419] border-t border-amber-500/20 p-4 text-center text-xs text-zinc-500">
        <p>เอกสารฉบับนี้เป็นทรัพย์สินของ Zodiac Arena — คณะกรรมการจัดการแข่งขันสงวนสิทธิ์ในการตัดสินชี้ขาด</p>
        <p className="mt-1 font-mono tracking-widest text-amber-900/60">ZODIAC ARENA ESPORTS PROTOCOL</p>
      </div>
    </div>
  );
}

// Helper components for consistent typography within rules
export function RuleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-amber-400 border-l-4 border-amber-500 pl-3 uppercase">{title}</h2>
      <div className="pl-4 space-y-4">{children}</div>
    </section>
  );
}

export function RuleList({ items, ordered = false }: { items: (React.ReactNode)[]; ordered?: boolean }) {
  const ListTag = ordered ? 'ol' : 'ul';
  return (
    <ListTag className={`space-y-2 ${ordered ? 'list-decimal pl-5' : 'list-none pl-1'}`}>
      {items.map((item, i) => (
        <li key={i} className="relative">
          {!ordered && <span className="absolute -left-5 top-1.5 w-1.5 h-1.5 rounded-full bg-amber-600/60"></span>}
          {item}
        </li>
      ))}
    </ListTag>
  );
}

export function RuleHighlight({ children }: { children: React.ReactNode }) {
  return <span className="text-amber-200 font-semibold">{children}</span>;
}
