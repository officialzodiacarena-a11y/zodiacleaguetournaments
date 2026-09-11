'use client';

import { useEffect, useState } from 'react';

interface Shipment {
  id: string;
  order_id: string;
  status: 'PENDING' | 'SHIPPED' | 'DELIVERED';
  carrier: string | null;
  tracking_number: string | null;
}

const CARRIERS = ['THAILAND_POST', 'KERRY', 'FLASH'];

export function ShipmentManager() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { carrier: string; trackingNumber: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadShipments() {
    try {
      const res = await fetch('/api/v1/admin/store/shipments');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'โหลดข้อมูลจัดส่งไม่สำเร็จ');
      const rows: Shipment[] = json.data ?? [];
      setShipments(rows);
      setDrafts((prev) => {
        const next = { ...prev };
        for (const s of rows) {
          if (!next[s.id]) {
            next[s.id] = { carrier: s.carrier ?? CARRIERS[0], trackingNumber: s.tracking_number ?? '' };
          }
        }
        return next;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/admin/store/shipments')
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) throw new Error(json.error.message ?? 'โหลดข้อมูลจัดส่งไม่สำเร็จ');
        const rows: Shipment[] = json.data ?? [];
        setShipments(rows);
        setDrafts((prev) => {
          const next = { ...prev };
          for (const s of rows) {
            if (!next[s.id]) {
              next[s.id] = { carrier: s.carrier ?? CARRIERS[0], trackingNumber: s.tracking_number ?? '' };
            }
          }
          return next;
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function markShipped(shipmentId: string) {
    const draft = drafts[shipmentId];
    if (!draft?.trackingNumber) {
      setError('กรุณากรอกเลขพัสดุก่อนอัปเดตสถานะ');
      return;
    }
    setSavingId(shipmentId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/store/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carrier: draft.carrier, trackingNumber: draft.trackingNumber, status: 'SHIPPED' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'อัปเดตไม่สำเร็จ');
      await loadShipments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <p className="text-xs text-[#94A3B8]">กำลังโหลด...</p>;

  return (
    <div className="rounded-xl bg-[#1A1C2E] p-5">
      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
      {shipments.length === 0 ? (
        <p className="text-xs text-[#94A3B8]">ไม่มีรายการจัดส่ง</p>
      ) : (
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[#94A3B8]">
              <th className="pb-2">Order ID</th>
              <th className="pb-2">สถานะ</th>
              <th className="pb-2">ขนส่ง</th>
              <th className="pb-2">เลขพัสดุ</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => (
              <tr key={s.id} className="border-t border-white/5">
                <td className="py-2 text-[#94A3B8]">{s.order_id.slice(0, 8)}…</td>
                <td className="py-2">
                  <span
                    className={`rounded px-2 py-1 text-[10px] font-bold ${
                      s.status === 'DELIVERED'
                        ? 'bg-[#4CAF50]/15 text-[#4CAF50]'
                        : s.status === 'SHIPPED'
                          ? 'bg-[#6366F1]/15 text-[#6366F1]'
                          : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="py-2">
                  <select
                    value={drafts[s.id]?.carrier ?? CARRIERS[0]}
                    onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: { ...d[s.id], carrier: e.target.value } }))}
                    disabled={s.status !== 'PENDING'}
                    className="rounded bg-[#12142A] px-2 py-1 text-[#F9EDD8] disabled:opacity-40"
                  >
                    {CARRIERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2">
                  <input
                    value={drafts[s.id]?.trackingNumber ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: { ...d[s.id], trackingNumber: e.target.value } }))}
                    disabled={s.status !== 'PENDING'}
                    placeholder="เลข Tracking"
                    className="w-32 rounded bg-[#12142A] px-2 py-1 text-[#F9EDD8] disabled:opacity-40"
                  />
                </td>
                <td className="py-2">
                  {s.status === 'PENDING' && (
                    <button
                      type="button"
                      disabled={savingId === s.id}
                      onClick={() => markShipped(s.id)}
                      className="rounded bg-[#E8B429] px-2 py-1 text-[10px] font-bold text-[#0D0E1A] disabled:opacity-40"
                    >
                      {savingId === s.id ? '...' : 'บันทึกจัดส่งแล้ว'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
