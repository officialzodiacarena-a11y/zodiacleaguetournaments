import { requireMarketplaceAdminPage } from '@/lib/admin/requireMarketplaceAdminPage';
import { CategoryManager } from '@/components/admin/marketplace/CategoryManager';

export default async function MarketplaceCategoriesPage() {
  await requireMarketplaceAdminPage();

  return (
    <div className="min-h-screen bg-[#0D0E1A] p-8">
      <h1 className="mb-1 text-2xl font-black text-[#F9EDD8]">Marketplace Categories</h1>
      <p className="mb-6 text-sm text-[#94A3B8]">จัดการหมวดหมู่สินค้า (Tree: Parent → Child)</p>
      <CategoryManager />
    </div>
  );
}
