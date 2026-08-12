import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CategoryProducts from "@/components/CategoryProducts";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import Navbar from "@/components/Navbar";
import { toUiProduct } from "@/lib/adapters";
import {
  getCategoryBySlug,
  getProductsByCategory,
  getWebsiteSettings,
} from "@/lib/queries";
import { buildBreadcrumbJsonLd, buildPublicMetadata } from "@/lib/seo";
import { DEFAULT_WEBSITE_SETTINGS } from "@/lib/website-settings";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [categoryResult, settingsResult] = await Promise.all([
    getCategoryBySlug(slug),
    getWebsiteSettings(),
  ]);
  const settings = settingsResult.data ?? DEFAULT_WEBSITE_SETTINGS;
  const category = categoryResult.data;

  if (!category) {
    return {
      title: `Category Not Found | ${settings.brand_name}`,
      robots: { index: false, follow: false },
    };
  }

  const title = `${category.name} | ${settings.brand_name}`;
  const description = `Temukan koleksi ${category.name} dari ${settings.brand_name}. ${settings.website_description}`.slice(0, 160);

  return buildPublicMetadata({
    title,
    description,
    keywords: [
      category.name,
      `${category.name} ${settings.brand_name}`,
      settings.brand_name,
      "apparel Indonesia",
    ],
    settings,
    pathname: `/category/${category.slug}`,
    image: category.banner,
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const [categoryResult, settingsResult] = await Promise.all([
    getCategoryBySlug(slug),
    getWebsiteSettings(),
  ]);
  const category = categoryResult.data;
  const settings = settingsResult.data ?? DEFAULT_WEBSITE_SETTINGS;

  if (categoryResult.error) {
    throw new Error(`Unable to load category: ${categoryResult.error}`);
  }
  if (!category) notFound();

  const productsResult = await getProductsByCategory(category.id);
  const products = (productsResult.data ?? []).map(toUiProduct);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", pathname: "/" },
    { name: category.name, pathname: `/category/${category.slug}` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <Navbar brandName={settings.brand_name} logoUrl={settings.logo_url} />
      <CategoryProducts
        categoryName={category.name}
        products={products}
        errorMessage={productsResult.error}
      />
      <Footer settings={settings} />
    </>
  );
}
