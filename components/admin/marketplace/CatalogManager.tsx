'use client';

import { useEffect, useState } from 'react';

interface Variant {
  id: string;
  name: string;
  price_ap: number;
  price_thb: number;
  stock: number;
  reserved_stock: number;
  is_active: boolean;
}

interface Item {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  partner_brand: string | null;
  store_item_variants: Variant[];
}

export function CatalogManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [editPriceAp, setEditPriceAp] = useState(0);
  const [editStock, setEditStock] = useState(0);

  async function loadItems() {
    try {
      const res = await fetch('/api/v1/admin/store/items');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'โหลดสินค้าไม่สำเร็จ');
      setItems(json.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/admin/store/items')
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) throw new Error(json.error.message ?? 'โหลดสินค้าไม่สำเร็จ');
        setItems(json.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleItemActive(item: Item) {
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

  function startEditVariant(v: Variant) {
    setEditingVariant(v.id);
    setEditPriceAp(v.price_ap);
    setEditStock(v.stock);
  }

  async function saveVariant(variantId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/store/variants/${variantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceAp: editPriceAp, stock: editStock }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'อัปเดตไม่สำเร็จ');
      setEditingVariant(null);
      await loadItems();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    }
  }

  if (loading) return <p className="text-xs text-[#94A3B8]">กำลังโหลด...</p>;

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-red-400">{error}</p>}
      {items.length === 0 && <p className="text-xs text-[#94A3B8]">ยังไม่มีสินค้าในระบบ</p>}
      {items.map((item) => (
        <div key={item.id} className="rounded-xl bg-[#1A1C2E] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#F9EDD8]">{item.name}</p>
              <p className="text-[11px] text-[#94A3B8]">
                {item.type}
                {item.partner_brand ? ` · ${item.partner_brand}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleItemActive(item)}
              className={`rounded px-2 py-1 text-[10px] font-bold ${
                item.is_active ? 'bg-[#4CAF50]/15 text-[#4CAF50]' : 'bg-white/10 text-[#94A3B8]'
              }`}
            >
              {item.is_active ? 'ACTIVE' : 'INACTIVE'}
            </button>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[#94A3B8]">
                <th className="pb-1">Variant</th>
                <th className="pb-1">AP</th>
                <th className="pb-1">THB</th>
                <th className="pb-1">Stock (ว่าง/จอง)</th>
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
                      <td className="py-1 text-[#94A3B8]">{v.price_thb}</td>
                      <td className="py-1">
                        <input
                          type="number"
                          value={editStock}
                          onChange={(e) => setEditStock(Number(e.target.value))}
                          className="w-16 rounded bg-[#12142A] px-2 py-1 text-[#F9EDD8]"
                        />
                        <span className="ml-1 text-[#94A3B8]">/{v.reserved_stock}</span>
                      </td>
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
        </div>
      ))}
    </div>
  );
}
