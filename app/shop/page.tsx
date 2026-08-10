import Navbar from "@/components/Navbar";
import ProdukSection from "@/components/ProdukSection";
import Footer from "@/components/Footer";
import { toUiProduct } from "@/lib/adapters";
import { getCategories, getProducts, getWebsiteSettings } from "@/lib/queries";
import { DEFAULT_WEBSITE_SETTINGS } from "@/lib/website-settings";

// Product CRUD happens directly in Supabase. Always render the shop catalog
// from the current database state instead of a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const [categoriesResult, productsResult, settingsResult] = await Promise.all([
    getCategories(),
    getProducts(),
    getWebsiteSettings(),
  ]);
  const settings = settingsResult.data ?? DEFAULT_WEBSITE_SETTINGS;
  const errorMessage = categoriesResult.error || productsResult.error;
  const filters = [
    "All Produk",
    ...(categoriesResult.data?.map((category) => category.slug) ?? []),
  ];
  const products = (productsResult.data ?? []).map(toUiProduct);

  return (
    <>
      <Navbar brandName={settings.brand_name} logoUrl={settings.logo_url} />
      <ProdukSection
        products={products}
        filters={filters}
        errorMessage={errorMessage}
      />
      <Footer settings={settings} />
    </>
  );
}
