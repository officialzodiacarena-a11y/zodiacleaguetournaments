import { requireMarketplaceAdminPage } from '@/lib/admin/requireMarketplaceAdminPage';
import { ShipmentManager } from '@/components/admin/marketplace/ShipmentManager';

export default async function MarketplaceShipmentsPage() {
  await requireMarketplaceAdminPage();

  return (
    <div className="min-h-screen bg-[#0D0E1A] p-8">
      <h1 className="mb-1 text-2xl font-black text-[#F9EDD8]">Marketplace Shipments</h1>
      <p className="mb-6 text-sm text-[#94A3B8]">ติดตามและอัปเดตเลขพัสดุของออเดอร์สินค้าจริง</p>
      <ShipmentManager />
    </div>
  );
}
