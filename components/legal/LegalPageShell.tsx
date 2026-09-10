import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function LegalPageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0D0E1A] text-[#F9EDD8] flex flex-col items-center px-4 py-12 font-mono">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <Image src="/images/seasons/logo.png" alt="Zodiac Arena" width={40} height={40} className="object-contain" />
        <span className="text-sm font-black tracking-widest uppercase text-[#F9EDD8]">
          ZODIAC <span className="text-[#E8B429]">ARENA</span>
        </span>
      </Link>

      <div className="w-full max-w-[800px] rounded-xl border border-[#334B5C] bg-[#1A1C2E] p-6 md:p-10">
        <h1 className="text-2xl md:text-[28px] font-bold text-[#F9EDD8] mb-6">{title}</h1>
        {children}
      </div>

      <footer className="mt-8 text-xs text-[#94A3B8]">
        <Link href="/" className="hover:text-[#E8B429] underline transition-colors">
          กลับสู่หน้าหลัก ZODIAC ARENA
        </Link>
      </footer>
    </main>
  );
}

export function LegalSectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-semibold text-[#E8B429] mt-6 mb-2 first:mt-0">{children}</h2>;
}

export function LegalBody({ children }: { children: ReactNode }) {
  return <p className="text-sm text-[#94A3B8] leading-[1.7] whitespace-pre-line">{children}</p>;
}
