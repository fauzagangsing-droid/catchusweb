import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/queries";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categoriesResult, productsResult] = await Promise.all([
    getCategories(),
    getProducts(),
  ]);

  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: absoluteUrl("/"),
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  };

  const categoryEntries: MetadataRoute.Sitemap = (categoriesResult.data ?? []).map(
    (category) => ({
      url: absoluteUrl(`/category/${category.slug}`),
      lastModified: new Date(category.created_at),
      changeFrequency: "weekly",
      priority: 0.8,
    })
  );

  const productEntries: MetadataRoute.Sitemap = (productsResult.data ?? []).map(
    (product) => ({
      url: absoluteUrl(`/product/${product.slug}`),
      lastModified: new Date(product.updated_at),
      changeFrequency: "weekly",
      priority: product.featured ? 0.9 : 0.7,
      images: product.product_images.map((image) => absoluteUrl(image.image_url)),
    })
  );

  return [homeEntry, ...categoryEntries, ...productEntries];
}
