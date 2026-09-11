import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireMarketplaceAdminPage } from '@/lib/admin/requireMarketplaceAdminPage';

export default async function MarketplaceAdminDashboardPage() {
  const { role } = await requireMarketplaceAdminPage();
  const supabase = await createClient();

  const [{ count: paidOrdersCount }, { data: paidOrders }, { count: pendingShipments }, { data: variants }] =
    await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'PAID'),
      supabase.from('orders').select('total_price_ap').eq('status', 'PAID'),
      supabase.from('shipments').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
      supabase.from('store_item_variants').select('id, name, stock, reserved_stock').eq('is_active', true),
    ]);

  const totalApRevenue = (paidOrders ?? []).reduce((sum, o) => sum + (o.total_price_ap ?? 0), 0);
  const lowStockVariants = (variants ?? []).filter((v) => v.stock - v.reserved_stock <= 5);

  return (
    <div className="min-h-screen bg-[#0D0E1A] p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#F9EDD8]">Marketplace Admin</h1>
          <p className="text-sm text-[#94A3B8]">{role} · จัดการ Catalog / หมวดหมู่ / การจัดส่งเท่านั้น</p>
        </div>
        <nav className="flex gap-2 text-xs font-bold">
          <Link href="/admin/marketplace/catalog" className="rounded-lg bg-[#1A1C2E] px-3 py-2 text-[#F9EDD8] hover:bg-[#252842]">
            Catalog
          </Link>
          <Link href="/admin/marketplace/categories" className="rounded-lg bg-[#1A1C2E] px-3 py-2 text-[#F9EDD8] hover:bg-[#252842]">
            Categories
          </Link>
          <Link href="/admin/marketplace/shipments" className="rounded-lg bg-[#1A1C2E] px-3 py-2 text-[#F9EDD8] hover:bg-[#252842]">
            Shipments
          </Link>
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="ออเดอร์สำเร็จทั้งหมด" value={(paidOrdersCount ?? 0).toLocaleString()} />
        <StatCard label="ยอดขาย (AP)" value={totalApRevenue.toLocaleString()} accent />
        <StatCard label="รอจัดส่ง (Shipments)" value={(pendingShipments ?? 0).toLocaleString()} />
        <StatCard label="สินค้าใกล้หมดสต็อก" value={lowStockVariants.length.toLocaleString()} warn={lowStockVariants.length > 0} />
      </div>

      {lowStockVariants.length > 0 && (
        <div className="mt-6 rounded-xl bg-[#1A1C2E] p-5">
          <h3 className="mb-3 text-sm font-bold text-[#F59E0B]">สินค้าใกล้หมดสต็อก (เหลือ ≤ 5)</h3>
          <ul className="space-y-1 text-xs text-[#94A3B8]">
            {lowStockVariants.map((v) => (
              <li key={v.id} className="flex justify-between border-b border-white/5 py-1">
                <span>{v.name}</span>
                <span className="font-bold text-[#F59E0B]">{v.stock - v.reserved_stock} คงเหลือ</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-[#1A1C2E] p-5">
      <p className="text-[11px] uppercase tracking-wider text-[#94A3B8]">{label}</p>
      <p
        className={`mt-1 text-2xl font-black ${warn ? 'text-[#F59E0B]' : accent ? 'text-[#E8B429]' : 'text-[#F9EDD8]'}`}
      >
        {value}
      </p>
    </div>
  );
}
