'use client';

import { useEffect, useState } from 'react';
import type { StoreItem, StoreCategory, StoreItemVariant } from '@/types/store';
import { CreateItemForm } from './CreateItemForm';

interface NewVariantDraft {
  name: string;
  priceAp: string;
  priceThb: string;
  stock: string;
}

const EMPTY_NEW_VARIANT: NewVariantDraft = { name: '', priceAp: '0', priceThb: '0', stock: '0' };

export function CatalogManager() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);

  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [editPriceAp, setEditPriceAp] = useState(0);
  const [editPriceThb, setEditPriceThb] = useState(0);
  const [editStock, setEditStock] = useState(0);

  const [addingVariantFor, setAddingVariantFor] = useState<string | null>(null);
  const [newVariant, setNewVariant] = useState<NewVariantDraft>(EMPTY_NEW_VARIANT);
  const [addVariantError, setAddVariantError] = useState<string | null>(null);
  const [addingVariantBusy, setAddingVariantBusy] = useState(false);

  const [deletingItem, setDeletingItem] = useState<StoreItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function loadItems() {
    try {
      const res = await fetch('/api/v1/admin/store/items');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'โหลดสินค้าไม่สำเร็จ');
      setItems(json.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    }
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/v1/admin/store/items').then((r) => r.json()),
      fetch('/api/v1/admin/store/categories').then((r) => r.json()),
    ])
      .then(([itemsJson, categoriesJson]) => {
        if (cancelled) return;
        if (itemsJson.error) throw new Error(itemsJson.error.message ?? 'โหลดสินค้าไม่สำเร็จ');
        if (categoriesJson.error) throw new Error(categoriesJson.error.message ?? 'โหลดหมวดหมู่ไม่สำเร็จ');
        setItems(itemsJson.data ?? []);
        setCategories(categoriesJson.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  function categoryName(categoryId: string | null): string {
    if (!categoryId) return '—';
    return categories.find((c) => c.id === categoryId)?.name ?? '—';
  }

  async function toggleItemActive(item: StoreItem) {
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/store/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.is_active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'อัปเดตไม่สำเร็จ');
      await loadItems();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    }
  }

  function startEditVariant(v: StoreItemVariant) {
    setEditingVariant(v.id);
    setEditPriceAp(v.price_ap);
    setEditPriceThb(v.price_thb);
    setEditStock(v.stock);
  }

  async function saveVariant(variantId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/store/variants/${variantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceAp: editPriceAp, priceThb: editPriceThb, stock: editStock }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'อัปเดตไม่สำเร็จ');
      setEditingVariant(null);
      await loadItems();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    }
  }

  async function toggleVariantActive(v: StoreItemVariant) {
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/store/variants/${v.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !v.is_active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'อัปเดตไม่สำเร็จ');
      await loadItems();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    }
  }

  function startAddVariant(itemId: string) {
    setAddingVariantFor(itemId);
    setNewVariant(EMPTY_NEW_VARIANT);
    setAddVariantError(null);
  }

  async function submitAddVariant(itemId: string) {
    if (!newVariant.name.trim()) return;
    setAddingVariantBusy(true);
    setAddVariantError(null);
    try {
      const res = await fetch(`/api/v1/admin/store/items/${itemId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVariant.name.trim(),
          priceAp: Number(newVariant.priceAp) || 0,
          priceThb: Number(newVariant.priceThb) || 0,
          stock: Number(newVariant.stock) || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'เพิ่ม variant ไม่สำเร็จ');
      setAddingVariantFor(null);
      await loadItems();
    } catch (err: unknown) {
      setAddVariantError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setAddingVariantBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deletingItem) return;
    setDeleteBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/store/items/${deletingItem.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'ลบสินค้าไม่สำเร็จ');
      setDeletingItem(null);
      await loadItems();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setDeleteBusy(false);
    }
  }

  if (loading) return <p className="text-xs text-[#94A3B8]">กำลังโหลด...</p>;

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-red-400">{error}</p>}

      {showCreateForm ? (
        <CreateItemForm
          categories={categories}
          onCancel={() => setShowCreateForm(false)}
          onCreated={() => {
            setShowCreateForm(false);
            loadItems();
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="rounded-lg bg-[#E8B429] px-4 py-2 text-sm font-black text-[#0D0E1A]"
        >
          + เพิ่มสินค้า
        </button>
      )}

      {items.length === 0 && <p className="text-xs text-[#94A3B8]">ยังไม่มีสินค้าในระบบ</p>}

      {items.map((item) => (
        <div key={item.id} className="rounded-xl bg-[#1A1C2E] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#F9EDD8]">{item.name}</p>
              <p className="text-[11px] text-[#94A3B8]">
                {item.type}
                {item.item_type ? ` · ${item.item_type}` : ''}
                {item.partner_brand ? ` · ${item.partner_brand}` : ''}
                {` · หมวดหมู่: ${categoryName(item.category_id)}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleItemActive(item)}
                className={`rounded px-2 py-1 text-[10px] font-bold ${
                  item.is_active ? 'bg-[#4CAF50]/15 text-[#4CAF50]' : 'bg-white/10 text-[#94A3B8]'
                }`}
              >
                {item.is_active ? 'ACTIVE' : 'INACTIVE'}
              </button>
              <button
                type="button"
                onClick={() => setDeletingItem(item)}
                className="rounded bg-[#E3322F]/15 px-2 py-1 text-[10px] font-bold text-[#E3322F]"
              >
                ลบ
              </button>
            </div>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[#94A3B8]">
                <th className="pb-1">Variant</th>
                <th className="pb-1">AP</th>
                <th className="pb-1">THB</th>
                <th className="pb-1">Stock (ว่าง/จอง)</th>
                <th className="pb-1">สถานะ</th>
                <th className="pb-1" />
              </tr>
            </thead>
            <tbody>
              {item.store_item_variants.map((v) => (
                <tr key={v.id} className="border-t border-white/5">
                  <td className="py-1 text-[#F9EDD8]">{v.name}</td>
                  {editingVariant === v.id ? (
                    <>
                      <td className="py-1">
                        <input
                          type="number"
                          value={editPriceAp}
                          onChange={(e) => setEditPriceAp(Number(e.target.value))}
                          className="w-20 rounded bg-[#12142A] px-2 py-1 text-[#F9EDD8]"
                        />
                      </td>
                      <td className="py-1">
                        <input
                          type="number"
                          value={editPriceThb}
                          onChange={(e) => setEditPriceThb(Number(e.target.value))}
                          className="w-20 rounded bg-[#12142A] px-2 py-1 text-[#F9EDD8]"
                        />
                      </td>
                      <td className="py-1">
                        <input
                          type="number"
                          value={editStock}
                          onChange={(e) => setEditStock(Number(e.target.value))}
                          className="w-16 rounded bg-[#12142A] px-2 py-1 text-[#F9EDD8]"
                        />
                        <span className="ml-1 text-[#94A3B8]">/{v.reserved_stock}</span>
                      </td>
                      <td className="py-1 text-[#94A3B8]">{v.is_active ? 'ACTIVE' : 'INACTIVE'}</td>
                      <td className="py-1">
                        <button type="button" onClick={() => saveVariant(v.id)} className="mr-1 rounded bg-[#E8B429] px-2 py-1 text-[10px] font-bold text-[#0D0E1A]">
                          บันทึก
                        </button>
                        <button type="button" onClick={() => setEditingVariant(null)} className="rounded bg-white/10 px-2 py-1 text-[10px] text-[#94A3B8]">
                          ยกเลิก
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-1 font-bold text-[#E8B429]">{v.price_ap}</td>
                      <td className="py-1 text-[#94A3B8]">{v.price_thb}</td>
                      <td className="py-1 text-[#94A3B8]">
                        {v.stock - v.reserved_stock}/{v.reserved_stock}
                      </td>
                      <td className="py-1">
                        <button
                          type="button"
                          onClick={() => toggleVariantActive(v)}
                          className={`rounded px-2 py-1 text-[10px] font-bold ${
                            v.is_active ? 'bg-[#4CAF50]/15 text-[#4CAF50]' : 'bg-white/10 text-[#94A3B8]'
                          }`}
                        >
                          {v.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>
                      <td className="py-1">
                        <button type="button" onClick={() => startEditVariant(v)} className="rounded bg-white/10 px-2 py-1 text-[10px] text-[#F9EDD8]">
                          แก้ไข
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {addingVariantFor === item.id ? (
            <div className="mt-3 grid grid-cols-[1fr_5rem_5rem_5rem_auto_auto] items-center gap-2 rounded-lg bg-[#12142A] p-3">
              <input
                value={newVariant.name}
                onChange={(e) => setNewVariant((v) => ({ ...v, name: e.target.value }))}
                placeholder="ชื่อ variant"
                className="rounded bg-[#0D0E1A] px-2 py-1.5 text-xs text-[#F9EDD8]"
              />
              <input
                type="number"
                value={newVariant.priceAp}
                onChange={(e) => setNewVariant((v) => ({ ...v, priceAp: e.target.value }))}
                placeholder="AP"
                className="rounded bg-[#0D0E1A] px-2 py-1.5 text-xs text-[#F9EDD8]"
              />
              <input
                type="number"
                value={newVariant.priceThb}
                onChange={(e) => setNewVariant((v) => ({ ...v, priceThb: e.target.value }))}
                placeholder="THB"
                className="rounded bg-[#0D0E1A] px-2 py-1.5 text-xs text-[#F9EDD8]"
              />
              <input
                type="number"
                value={newVariant.stock}
                onChange={(e) => setNewVariant((v) => ({ ...v, stock: e.target.value }))}
                placeholder="Stock"
                className="rounded bg-[#0D0E1A] px-2 py-1.5 text-xs text-[#F9EDD8]"
              />
              <button
                type="button"
                disabled={!newVariant.name.trim() || addingVariantBusy}
                onClick={() => submitAddVariant(item.id)}
                className="rounded bg-[#E8B429] px-3 py-1.5 text-[10px] font-bold text-[#0D0E1A] disabled:opacity-40"
              >
                {addingVariantBusy ? '...' : 'เพิ่ม'}
              </button>
              <button type="button" onClick={() => setAddingVariantFor(null)} className="rounded bg-white/10 px-3 py-1.5 text-[10px] text-[#94A3B8]">
                ยกเลิก
              </button>
              {addVariantError && <p className="col-span-6 text-[10px] text-red-400">{addVariantError}</p>}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => startAddVariant(item.id)}
              className="mt-3 rounded bg-white/10 px-3 py-1.5 text-xs text-[#F9EDD8]"
            >
              + เพิ่ม variant
            </button>
          )}
        </div>
      ))}

      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl bg-[#1A1C2E] p-5">
            <h3 className="mb-2 text-sm font-bold text-[#F9EDD8]">ยืนยันลบสินค้า</h3>
            <p className="mb-4 text-xs text-[#94A3B8]">
              ลบ &quot;{deletingItem.name}&quot; จะลบ variant ทั้งหมด ({deletingItem.store_item_variants.length} รายการ) ไปด้วย
              — ย้อนกลับไม่ได้
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={deleteBusy}
                onClick={confirmDelete}
                className="rounded-lg bg-[#E3322F] px-4 py-2 text-sm font-black text-white disabled:opacity-40"
              >
                {deleteBusy ? 'กำลังลบ...' : 'ยืนยันลบ'}
              </button>
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm text-[#94A3B8]"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
