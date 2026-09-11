'use client';

import { useEffect, useState } from 'react';

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  partner_brand: string | null;
  children: CategoryNode[];
}

interface CategoryFilterProps {
  activeSlug: string | null;
  onSelect: (slug: string | null) => void;
}

export function CategoryFilter({ activeSlug, onSelect }: CategoryFilterProps) {
  const [categories, setCategories] = useState<CategoryNode[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/store/categories')
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setCategories(json.data ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs = categories.flatMap((c) => [c, ...c.children]);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
          activeSlug === null ? 'bg-[#E8B429] text-[#0D0E1A]' : 'bg-[#1A1C2E] text-[#94A3B8] hover:text-[#F9EDD8]'
        }`}
      >
        ทั้งหมด
      </button>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.slug)}
          className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
            activeSlug === tab.slug ? 'bg-[#E8B429] text-[#0D0E1A]' : 'bg-[#1A1C2E] text-[#94A3B8] hover:text-[#F9EDD8]'
          }`}
        >
          {tab.partner_brand === 'SINOPEC' ? `🛢️ ${tab.name}` : tab.name}
        </button>
      ))}
    </div>
  );
}
