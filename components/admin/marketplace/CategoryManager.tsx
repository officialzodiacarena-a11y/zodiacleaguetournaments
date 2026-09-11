'use client';

import { useEffect, useState } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  partner_brand: string | null;
  display_order: number;
  is_active: boolean;
}

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [partnerBrand, setPartnerBrand] = useState('');
  const [parentId, setParentId] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  async function loadCategories() {
    try {
      const res = await fetch('/api/v1/admin/store/categories');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'โหลดหมวดหมู่ไม่สำเร็จ');
      setCategories(json.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/admin/store/categories')
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) throw new Error(json.error.message ?? 'โหลดหมวดหมู่ไม่สำเร็จ');
        setCategories(json.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/store/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          partnerBrand: partnerBrand || null,
          parentId: parentId || null,
          displayOrder,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'สร้างหมวดหมู่ไม่สำเร็จ');
      setName('');
      setSlug('');
      setPartnerBrand('');
      setParentId('');
      setDisplayOrder(0);
      await loadCategories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(category: Category) {
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/store/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !category.is_active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'อัปเดตไม่สำเร็จ');
      await loadCategories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-xl bg-[#1A1C2E] p-5 lg:col-span-1">
        <h3 className="mb-3 text-sm font-bold text-[#F9EDD8]">สร้างหมวดหมู่ใหม่</h3>
        <div className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ชื่อหมวดหมู่ เช่น น้ำมันเครื่อง"
            className="w-full rounded-lg bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8]"
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug เช่น sinopec-engine-oil"
            className="w-full rounded-lg bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8]"
          />
          <input
            value={partnerBrand}
            onChange={(e) => setPartnerBrand(e.target.value)}
            placeholder="partner_brand (เว้นว่างได้) เช่น SINOPEC"
            className="w-full rounded-lg bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8]"
          />
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full rounded-lg bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8]"
          >
            <option value="">— ไม่มีหมวดหมู่แม่ —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number(e.target.value))}
            placeholder="display_order"
            className="w-full rounded-lg bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8]"
          />
          <button
            type="button"
            disabled={!name || !slug || submitting}
            onClick={handleCreate}
            className="w-full rounded-lg bg-[#E8B429] px-4 py-2 text-sm font-black text-[#0D0E1A] disabled:opacity-40"
          >
            {submitting ? 'กำลังสร้าง...' : 'สร้างหมวดหมู่'}
          </button>
        </div>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </div>

      <div className="rounded-xl bg-[#1A1C2E] p-5 lg:col-span-2">
        <h3 className="mb-3 text-sm font-bold text-[#F9EDD8]">หมวดหมู่ทั้งหมด</h3>
        {loading ? (
          <p className="text-xs text-[#94A3B8]">กำลังโหลด...</p>
        ) : categories.length === 0 ? (
          <p className="text-xs text-[#94A3B8]">ยังไม่มีหมวดหมู่</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[#94A3B8]">
                <th className="pb-2">ชื่อ</th>
                <th className="pb-2">Slug</th>
                <th className="pb-2">Brand</th>
                <th className="pb-2">ลำดับ</th>
                <th className="pb-2">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="py-2 text-[#F9EDD8]">
                    {c.parent_id ? <span className="mr-1 text-[#94A3B8]">└</span> : null}
                    {c.name}
                  </td>
                  <td className="py-2 text-[#94A3B8]">{c.slug}</td>
                  <td className="py-2 text-[#94A3B8]">{c.partner_brand ?? '—'}</td>
                  <td className="py-2 text-[#94A3B8]">{c.display_order}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(c)}
                      className={`rounded px-2 py-1 text-[10px] font-bold ${
                        c.is_active ? 'bg-[#4CAF50]/15 text-[#4CAF50]' : 'bg-white/10 text-[#94A3B8]'
                      }`}
                    >
                      {c.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
