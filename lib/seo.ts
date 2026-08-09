import type { Metadata } from "next";

import { resolveProductImage } from "@/lib/adapters";
import type { ProductWithRelations, WebsiteSettings } from "@/types/database";

const DEFAULT_SITE_URL = "http://localhost:3000";
const DEFAULT_SOCIAL_IMAGE = "/images/catchus.PNG";

export interface PublicMetadataInput {
  title: string;
  description: string;
  keywords: string[];
  settings: WebsiteSettings;
  pathname: string;
  image?: string | null;
}

export function getSiteUrl(): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : DEFAULT_SITE_URL);

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function absoluteUrl(pathOrUrl: string): string {
  try {
    return new URL(pathOrUrl).toString();
  } catch {
    const pathname = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
    return new URL(pathname, `${getSiteUrl()}/`).toString();
  }
}

export function getProductThumbnail(product: ProductWithRelations): string {
  return resolveProductImage(product);
}

export function buildPublicMetadata({
  title,
  description,
  keywords,
  settings,
  pathname,
  image,
}: PublicMetadataInput): Metadata {
  const canonical = absoluteUrl(pathname);
  const socialImage = absoluteUrl(image ?? settings.logo_url ?? DEFAULT_SOCIAL_IMAGE);

  return {
    title,
    description,
    keywords: Array.from(new Set(keywords.filter(Boolean))),
    authors: [{ name: settings.brand_name, url: getSiteUrl() }],
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: settings.brand_name,
      images: [{ url: socialImage, alt: `${title} - ${settings.brand_name}` }],
      locale: "id_ID",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export function buildOrganizationJsonLd(settings: WebsiteSettings): Record<string, unknown> {
  const sameAs = [
    settings.instagram_url,
    settings.tiktok_url,
    settings.facebook_url,
    settings.shopee_url,
    settings.tokopedia_url,
    settings.tiktok_shop_url,
  ].filter((url): url is string => Boolean(url));

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${getSiteUrl()}/#organization`,
    name: settings.brand_name,
    url: getSiteUrl(),
    logo: absoluteUrl(settings.logo_url ?? DEFAULT_SOCIAL_IMAGE),
    description: settings.website_description,
    ...(settings.email ? { email: settings.email } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function buildProductJsonLd(
  product: ProductWithRelations,
  settings: WebsiteSettings
): Record<string, unknown> {
  const productUrl = absoluteUrl(`/product/${product.slug}`);
  const images = product.product_images.length > 0
    ? product.product_images.map((image) => absoluteUrl(image.image_url))
    : [absoluteUrl(settings.logo_url ?? DEFAULT_SOCIAL_IMAGE)];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    description: product.short_description ?? product.description ?? product.name,
    image: images,
    url: productUrl,
    category: product.category?.name ?? "Apparel",
    brand: {
      "@type": "Brand",
      name: product.brand ?? settings.brand_name,
    },
    sku: product.sku ?? product.slug,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "IDR",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  pathname: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.pathname),
    })),
  };
}
