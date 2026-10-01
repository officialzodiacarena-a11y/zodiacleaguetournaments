'use client';

import { useEffect, useState } from 'react';

interface ShippingAddress {
  id: string;
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  province: string;
  postal_code: string;
  is_default: boolean;
}

interface Props {
  busy: boolean;
  onConfirm: (addressId: string) => void;
  onCancel: () => void;
}

const EMPTY_FORM = {
  recipientName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  province: '',
  postalCode: '',
};

const inputClass =
  'w-full rounded-md bg-[#12142A] border border-[#334B5C] px-2 py-1.5 text-xs text-[#F9EDD8] placeholder:text-[#94A3B8] focus:border-[#E8B429] focus:outline-none';

export function ShippingAddressPicker({ busy, onConfirm, onCancel }: Props) {
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/players/me/shipping-addresses')
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? 'โหลดที่อยู่ไม่สำเร็จ');
        return (json.data ?? []) as ShippingAddress[];
      })
      .then((rows) => {
        if (cancelled) return;
        setAddresses(rows);
        setSelectedId(rows[0]?.id ?? null);
        setShowForm(rows.length === 0);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'โหลดที่อยู่ไม่สำเร็จ');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/players/me/shipping-addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: form.recipientName.trim(),
          phone: form.phone.trim(),
          addressLine1: form.addressLine1.trim(),
          addressLine2: form.addressLine2.trim() || undefined,
          province: form.province.trim(),
          postalCode: form.postalCode.trim(),
          isDefault: addresses.length === 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error?.code === 'VALIDATION_ERROR'
            ? 'กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง'
            : json.error?.message ?? 'บันทึกที่อยู่ไม่สำเร็จ'
        );
      }
      const saved = json.data as ShippingAddress;
      setAddresses((prev) => [saved, ...prev]);
      setSelectedId(saved.id);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'บันทึกที่อยู่ไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-[#334B5C] bg-[#12142A]/60 p-2">
      <p className="text-[11px] font-bold text-[#F9EDD8]">ที่อยู่จัดส่ง</p>

      {loading ? (
        <p className="text-[11px] text-[#94A3B8]">กำลังโหลดที่อยู่...</p>
      ) : (
        <>
          {addresses.length > 0 && !showForm && (
            <div className="space-y-1">
              {addresses.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-start gap-2 text-[11px] text-[#94A3B8]">
                  <input
                    type="radio"
                    name="shipping-address"
                    checked={selectedId === a.id}
                    onChange={() => setSelectedId(a.id)}
                    className="mt-0.5 accent-[#E8B429]"
                  />
                  <span>
                    <span className="text-[#F9EDD8]">{a.recipient_name}</span> · {a.phone}
                    <br />
                    {a.address_line1}
                    {a.address_line2 ? ` ${a.address_line2}` : ''} {a.province} {a.postal_code}
                  </span>
                </label>
              ))}
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="text-[11px] text-[#E8B429] hover:underline"
              >
                + เพิ่มที่อยู่ใหม่
              </button>
            </div>
          )}

          {showForm && (
            <div className="space-y-1.5">
              <input
                className={inputClass}
                placeholder="ชื่อผู้รับ"
                value={form.recipientName}
                onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
              />
              <input
                className={inputClass}
                type="tel"
                inputMode="tel"
                placeholder="เบอร์โทร"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <input
                className={inputClass}
                placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ"
                value={form.addressLine1}
                onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
              />
              <input
                className={inputClass}
                placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                value={form.addressLine2}
                onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))}
              />
              <input
                className={inputClass}
                placeholder="จังหวัด"
                value={form.province}
                onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
              />
              <input
                className={inputClass}
                inputMode="numeric"
                placeholder="รหัสไปรษณีย์"
                value={form.postalCode}
                onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="flex-1 rounded-md bg-[#E8B429] py-1.5 text-[11px] font-black text-[#0D0E1A] disabled:opacity-40"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกที่อยู่'}
                </button>
                {addresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 rounded-md border border-[#334B5C] py-1.5 text-[11px] text-[#94A3B8]"
                  >
                    ใช้ที่อยู่เดิม
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="text-[11px] text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || loading || showForm || !selectedId}
          onClick={() => {
            if (selectedId) onConfirm(selectedId);
          }}
          className="flex-1 rounded-lg bg-[#E8B429] py-2 text-xs font-black text-[#0D0E1A] disabled:opacity-40"
        >
          {busy ? 'กำลังแลก...' : 'ยืนยันแลก'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-lg border border-[#334B5C] px-3 py-2 text-xs text-[#94A3B8] disabled:opacity-40"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
