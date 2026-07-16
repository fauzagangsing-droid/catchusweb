import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ModelGallery from "@/components/ModelGallery";
import Layanan from "@/components/Layanan";
import ProdukSection from "@/components/ProdukSection";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { getCategories, getProducts, getWebsiteSettings } from "@/lib/queries";
import { toUiProduct } from "@/lib/adapters";
import { buildOrganizationJsonLd, buildPublicMetadata } from "@/lib/seo";
import { DEFAULT_WEBSITE_SETTINGS } from "@/lib/website-settings";

// Product CRUD happens directly in Supabase. Always render the storefront
// catalog from the current database state instead of a build-time snapshot.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [settingsResult, categoriesResult] = await Promise.all([
    getWebsiteSettings(),
    getCategories(),
  ]);
  const settings = settingsResult.data ?? DEFAULT_WEBSITE_SETTINGS;
  const categoryKeywords = categoriesResult.data?.map((category) => category.name) ?? [];

  return buildPublicMetadata({
    title: settings.website_title,
    description: settings.website_description,
    keywords: [
      settings.brand_name,
      "apparel Indonesia",
      "fashion lokal",
      "streetwear",
      ...categoryKeywords,
    ],
    settings,
    pathname: "/",
  });
}

export default async function Home() {
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
      <JsonLd data={buildOrganizationJsonLd(settings)} />
      <Navbar brandName={settings.brand_name} logoUrl={settings.logo_url} />
      <Hero title={settings.hero_title} subtitle={settings.hero_subtitle} buttonText={settings.hero_button_text} buttonUrl={settings.hero_button_url} />
      <ModelGallery />
      <Layanan brandName={settings.brand_name} />
      <ProdukSection
        products={products}
        filters={filters}
        errorMessage={errorMessage}
      />
      <Footer settings={settings} />
    </>
  );
}
