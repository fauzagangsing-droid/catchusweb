import RequireAdminAuth from "@/components/admin/RequireAdminAuth";
import DashboardContent from "@/components/admin/DashboardContent";
import { getCategories, getProducts } from "@/lib/queries";
import { toDashboardStats, toRecentProducts } from "@/lib/dashboard";

export default async function AdminDashboardPage() {
  const [categoriesResult, productsResult] = await Promise.all([
    getCategories(),
    getProducts(),
  ]);

  const products = productsResult.data ?? [];
  const categories = categoriesResult.data ?? [];

  // getProducts() already orders by created_at DESC, so the first 5 are the
  // latest 5 — no extra sorting needed here.
  const stats = toDashboardStats(products, categories.length);
  const recentProducts = toRecentProducts(products, 5);

  return (
    <RequireAdminAuth>
      <DashboardContent stats={stats} recentProducts={recentProducts} />
    </RequireAdminAuth>
  );
}
