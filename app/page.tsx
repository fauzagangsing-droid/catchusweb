import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ModelGallery from "@/components/ModelGallery";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { getActiveBanners, getCategories, getWebsiteSettings } from "@/lib/queries";
import { buildOrganizationJsonLd, buildPublicMetadata } from "@/lib/seo";
import { DEFAULT_WEBSITE_SETTINGS } from "@/lib/website-settings";

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
  const [settingsResult, bannersResult] = await Promise.all([
    getWebsiteSettings(),
    getActiveBanners(),
  ]);
  const settings = settingsResult.data ?? DEFAULT_WEBSITE_SETTINGS;

  return (
    <>
      <JsonLd data={buildOrganizationJsonLd(settings)} />
      <Navbar brandName={settings.brand_name} logoUrl={settings.logo_url} />
      <Hero
        banners={bannersResult.data ?? []}
        title={settings.hero_title}
        subtitle={settings.hero_subtitle}
        buttonText={settings.hero_button_text}
        buttonUrl={settings.hero_button_url}
      />
      <ModelGallery />
      <Footer settings={settings} />
    </>
  );
}
