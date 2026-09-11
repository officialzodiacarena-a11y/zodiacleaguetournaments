import { requireMarketplaceAdminPage } from '@/lib/admin/requireMarketplaceAdminPage';
import { CatalogManager } from '@/components/admin/marketplace/CatalogManager';

export default async function MarketplaceCatalogPage() {
  await requireMarketplaceAdminPage();

  return (
    <div className="min-h-screen bg-[#0D0E1A] p-8">
      <h1 className="mb-1 text-2xl font-black text-[#F9EDD8]">Marketplace Catalog</h1>
      <p className="mb-6 text-sm text-[#94A3B8]">จัดการสินค้าและ Variant (ราคา AP / THB / Stock)</p>
      <CatalogManager />
    </div>
  );
}
