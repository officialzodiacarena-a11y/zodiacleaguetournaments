'use client';

import { useState } from 'react';
import type { StoreCategory } from '@/types/store';

interface VariantDraft {
  name: string;
  priceAp: string;
  priceThb: string;
  stock: string;
}

const EMPTY_VARIANT: VariantDraft = { name: '', priceAp: '0', priceThb: '0', stock: '0' };

const ITEM_TYPES = ['PHYSICAL', 'DIGITAL', 'VOUCHER'] as const;

interface CreateItemFormProps {
  categories: StoreCategory[];
  onCreated: () => void;
  onCancel: () => void;
}

// Spec A: "หลัง create item → แสดง form เพิ่ม variant ทันที (ไม่ให้ item ไม่มี
// variant)" — POST /items already requires >= 1 variant atomically with the
// item (types/store.ts CreateStoreItemSchema), so the variant rows below are
// captured as part of this same form/submission rather than a separate
// follow-up step: that satisfies the "never leave an item variant-less"
// requirement without risking an item stuck with 0 variants if the admin
// abandons a two-step flow partway through.
export function CreateItemForm({ categories, onCreated, onCancel }: CreateItemFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [itemType, setItemType] = useState<(typeof ITEM_TYPES)[number]>('PHYSICAL');
  const [partnerBrand, setPartnerBrand] = useState('');
  const [variants, setVariants] = useState<VariantDraft[]>([{ ...EMPTY_VARIANT }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateVariant(index: number, patch: Partial<VariantDraft>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function addVariantRow() {
    setVariants((prev) => [...prev, { ...EMPTY_VARIANT }]);
  }

  function removeVariantRow(index: number) {
    setVariants((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  const canSubmit = name.trim().length >= 2 && categoryId !== '' && variants.every((v) => v.name.trim().length > 0) && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/store/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          categoryId,
          itemType,
          partnerBrand: partnerBrand.trim() || null,
          variants: variants.map((v) => ({
            name: v.name.trim(),
            priceAp: Number(v.priceAp) || 0,
            priceThb: Number(v.priceThb) || 0,
            stock: Number(v.stock) || 0,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'สร้างสินค้าไม่สำเร็จ');
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl bg-[#1A1C2E] p-5">
      <h3 className="mb-3 text-sm font-bold text-[#F9EDD8]">เพิ่มสินค้าใหม่</h3>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อสินค้า"
          className="w-full rounded-lg bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8] md:col-span-2"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="รายละเอียด (เว้นว่างได้)"
          rows={2}
          className="w-full rounded-lg bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8] md:col-span-2"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-lg bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8]"
        >
          <option value="">— เลือกหมวดหมู่ (จำเป็น) —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={itemType}
          onChange={(e) => setItemType(e.target.value as (typeof ITEM_TYPES)[number])}
          className="w-full rounded-lg bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8]"
        >
          {ITEM_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          value={partnerBrand}
          onChange={(e) => setPartnerBrand(e.target.value)}
          placeholder="partner_brand (เว้นว่างได้) เช่น SINOPEC"
          className="w-full rounded-lg bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8] md:col-span-2"
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-bold text-[#94A3B8]">Variant เริ่มต้น (ต้องมีอย่างน้อย 1 รายการ)</p>
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-[1fr_5rem_5rem_5rem_auto] items-center gap-2">
              <input
                value={v.name}
                onChange={(e) => updateVariant(i, { name: e.target.value })}
                placeholder="ชื่อ variant เช่น S / 4L / Digital"
                className="rounded-lg bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8]"
              />
              <input
                type="number"
                value={v.priceAp}
                onChange={(e) => updateVariant(i, { priceAp: e.target.value })}
                placeholder="AP"
                className="rounded-lg bg-[#12142A] px-2 py-2 text-sm text-[#F9EDD8]"
              />
              <input
                type="number"
                value={v.priceThb}
                onChange={(e) => updateVariant(i, { priceThb: e.target.value })}
                placeholder="THB"
                className="rounded-lg bg-[#12142A] px-2 py-2 text-sm text-[#F9EDD8]"
              />
              <input
                type="number"
                value={v.stock}
                onChange={(e) => updateVariant(i, { stock: e.target.value })}
                placeholder="Stock"
                className="rounded-lg bg-[#12142A] px-2 py-2 text-sm text-[#F9EDD8]"
              />
              <button
                type="button"
                onClick={() => removeVariantRow(i)}
                disabled={variants.length === 1}
                className="rounded bg-white/10 px-2 py-2 text-[10px] text-[#94A3B8] disabled:opacity-30"
              >
                ลบ
              </button>
            </div>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-[#F59E0B]">
          stock = 0 หมายถึง &quot;ไม่จำกัด&quot; ตาม spec สำหรับ DIGITAL แต่ checkout RPC (checkout_order) ปัจจุบันยังไม่รองรับค่านี้เป็นพิเศษ —
          ใส่จำนวนจริงไปก่อนจนกว่าจะแก้ RPC
        </p>
        <button type="button" onClick={addVariantRow} className="mt-2 rounded bg-white/10 px-3 py-1.5 text-xs text-[#F9EDD8]">
          + เพิ่ม variant อีก
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="rounded-lg bg-[#E8B429] px-4 py-2 text-sm font-black text-[#0D0E1A] disabled:opacity-40"
        >
          {submitting ? 'กำลังสร้าง...' : 'สร้างสินค้า'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg bg-white/10 px-4 py-2 text-sm text-[#94A3B8]">
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
