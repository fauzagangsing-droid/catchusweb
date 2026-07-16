import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ModelGallery from "@/components/ModelGallery";
import Layanan from "@/components/Layanan";
import ProdukSection from "@/components/ProdukSection";
import Footer from "@/components/Footer";
import { getCategories, getProducts } from "@/lib/queries";
import { toUiProduct } from "@/lib/adapters";

// Product CRUD happens directly in Supabase. Always render the storefront
// catalog from the current database state instead of a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [categoriesResult, productsResult] = await Promise.all([
    getCategories(),
    getProducts(),
  ]);

  const errorMessage = categoriesResult.error || productsResult.error;

  const filters = [
    "All Produk",
    ...(categoriesResult.data?.map((category) => category.slug) ?? []),
  ];

  const products = (productsResult.data ?? []).map(toUiProduct);

  return (
    <>
      <Navbar />
      <Hero />
      <ModelGallery />
      <Layanan />
      <ProdukSection
        products={products}
        filters={filters}
        errorMessage={errorMessage}
      />
      <Footer />
    </>
  );
}
