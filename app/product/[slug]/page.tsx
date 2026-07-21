import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import ProductGallery from "@/components/ProductGallery";
import AddToCartButton from "@/components/cart/AddToCartButton";
import ProductReviews from "@/components/reviews/ProductReviews";
import { formatRupiah } from "@/lib/adapters";
import { getProductBySlug, getRelatedProducts, getWebsiteSettings } from "@/lib/queries";
import {
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
  buildPublicMetadata,
  getProductThumbnail,
} from "@/lib/seo";
import { DEFAULT_WEBSITE_SETTINGS } from "@/lib/website-settings";
import styles from "./product-detail.module.css";

export const dynamic = "force-dynamic";

interface ProductDetailPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const [productResult, settingsResult] = await Promise.all([
    getProductBySlug(params.slug),
    getWebsiteSettings(),
  ]);
  const product = productResult.data;
  const settings = settingsResult.data ?? DEFAULT_WEBSITE_SETTINGS;
  if (!product) {
    return {
      title: `Product Not Found | ${settings.brand_name}`,
      robots: { index: false, follow: false },
    };
  }

  const description = (
    product.short_description ??
    product.description ??
    `${product.name} dari ${settings.brand_name}.`
  ).slice(0, 160);

  return buildPublicMetadata({
    title: `${product.name} | ${settings.brand_name}`,
    description,
    keywords: [
      product.name,
      product.brand ?? settings.brand_name,
      product.category?.name ?? "apparel",
      product.sku ?? "",
      "fashion Indonesia",
    ],
    settings,
    pathname: `/product/${product.slug}`,
    image: getProductThumbnail(product),
  });
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const [productResult, settingsResult] = await Promise.all([
    getProductBySlug(params.slug),
    getWebsiteSettings(),
  ]);
  const { data: product, error } = productResult;
  const settings = settingsResult.data ?? DEFAULT_WEBSITE_SETTINGS;
  if (error) throw new Error(`Unable to load product: ${error}`);
  if (!product) notFound();

  const { data: relatedProducts } = await getRelatedProducts(
    product.category_id,
    product.id
  );

  const marketplaces = [
    { name: "Shopee", url: product.shopee_url, icon: "ri-shopping-bag-3-line" },
    { name: "Tokopedia", url: product.tokopedia_url, icon: "ri-store-2-line" },
    { name: "TikTok Shop", url: product.tiktok_shop_url || product.tiktok_url, icon: "ri-tiktok-line" },
    { name: "Lazada", url: product.lazada_url, icon: "ri-store-3-line" },
    { name: "Blibli", url: product.blibli_url, icon: "ri-shopping-bag-line" },
  ].flatMap((marketplace) => {
    const url = marketplace.url?.trim();
    return url ? [{ ...marketplace, url }] : [];
  });

  const productJsonLd = buildProductJsonLd(product, settings);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", pathname: "/" },
    { name: "Products", pathname: "/#produk" },
    { name: product.name, pathname: `/product/${product.slug}` },
  ]);

  return (
    <div className={styles.page}>
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <header className={styles.header}>
        <div className={`container ${styles.headerInner}`}>
          <Link href="/" className={styles.brand}>{settings.brand_name}</Link>
          <Link href="/#produk" className={styles.backLink}>
            <i className="ri-arrow-left-line" />
            Back to Products
          </Link>
        </div>
      </header>

      <main className={`container ${styles.main}`}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <i className="ri-arrow-right-s-line" />
          <Link href="/#produk">Products</Link>
          <i className="ri-arrow-right-s-line" />
          <span>{product.name}</span>
        </nav>

        <section className={styles.productLayout}>
          <ProductGallery images={product.product_images} productName={product.name} />

          <div className={styles.summary}>
            <div className={styles.labels}>
              {product.category && <span>{product.category.name}</span>}
              {product.featured && <span className={styles.featured}>Featured</span>}
            </div>

            <h1>{product.name}</h1>
            {product.brand && <p className={styles.brandName}>by {product.brand}</p>}

            <div className={styles.priceRow}>
              {product.compare_price && product.compare_price > product.price && (
                <span className={styles.comparePrice}>{formatRupiah(product.compare_price)}</span>
              )}
              <span className={styles.price}>{formatRupiah(product.price)}</span>
            </div>

            <div className={styles.availabilityRow}>
              <span>Availability</span>
              <strong className={product.stock > 0 ? styles.inStock : styles.outOfStock}>
                {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
              </strong>
            </div>

            {product.short_description && (
              <p className={styles.shortDescription}>{product.short_description}</p>
            )}

            <div className={styles.informationBlock}>
              <span className={styles.sectionEyebrow}>Product Information</span>
            <dl className={styles.facts}>
              {product.category && <div><dt>Category</dt><dd>{product.category.name}</dd></div>}
              {product.brand && <div><dt>Brand</dt><dd>{product.brand}</dd></div>}
              {product.sku && <div><dt>SKU</dt><dd>{product.sku}</dd></div>}
              <div><dt>Weight</dt><dd>{product.weight} kg</dd></div>
            </dl>
            </div>

            <AddToCartButton
              productId={product.id}
              productName={product.name}
              stock={product.stock}
            />

            {marketplaces.length > 0 && (
              <div className={styles.marketplaces}>
                <span>Beli di Marketplace</span>
                <div className={styles.marketplaceButtons}>
                  {marketplaces.map((marketplace) => (
                    <a key={marketplace.name} href={marketplace.url} target="_blank" rel="noopener noreferrer">
                      <i className={marketplace.icon} />
                      {marketplace.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <section className={styles.aboutSection}>
              <span className={styles.sectionEyebrow}>Full Description</span>
              <h2>About this product</h2>
              <p>{product.description || product.short_description || "Full product information will be available soon."}</p>
            </section>

            <section className={styles.shippingSection}>
              <span className={styles.sectionEyebrow}>Shipping Information</span>
              <div className={styles.shippingItems}>
                <div>
                  <i className="ri-box-3-line" />
                  <p><strong>Carefully packed</strong><span>Your order is prepared securely before dispatch.</span></p>
                </div>
                <div>
                  <i className="ri-truck-line" />
                  <p><strong>Marketplace delivery</strong><span>Cost and delivery estimates are calculated at checkout.</span></p>
                </div>
              </div>
            </section>
          </div>
        </section>

        <ProductReviews productId={product.id} />

        {(relatedProducts?.length ?? 0) > 0 && (
          <section className={styles.relatedSection}>
            <div className={styles.relatedHeader}>
              <div>
                <span className={styles.sectionEyebrow}>You may also like</span>
                <h2>Related Products</h2>
              </div>
              <Link href="/#produk">View all products <i className="ri-arrow-right-line" /></Link>
            </div>
            <div className={styles.relatedGrid}>
              {relatedProducts?.map((relatedProduct) => {
                const thumbnail =
                  relatedProduct.product_images.find((image) => image.is_thumbnail) ??
                  relatedProduct.product_images[0];

                return (
                  <Link key={relatedProduct.id} href={`/product/${relatedProduct.slug}`} className={styles.relatedCard}>
                    <div className={styles.relatedImage}>
                      <Image
                        src={thumbnail?.image_url ?? "/images/catchus.PNG"}
                        alt={`${relatedProduct.name} product thumbnail`}
                        fill
                        sizes="(max-width: 640px) 50vw, 260px"
                      />
                    </div>
                    <div className={styles.relatedBody}>
                      <span>{relatedProduct.category?.name ?? "Product"}</span>
                      <h3>{relatedProduct.name}</h3>
                      <strong>{formatRupiah(relatedProduct.price)}</strong>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <Footer settings={settings} />
    </div>
  );
}
