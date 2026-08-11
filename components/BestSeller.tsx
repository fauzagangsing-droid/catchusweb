import Image from "next/image";
import Link from "next/link";
import type { ProductWithRelations } from "@/types/database";
import styles from "./BestSeller.module.css";

interface BestSellerProps {
  products: ProductWithRelations[];
}

export default function BestSeller({ products }: BestSellerProps) {
  const newArrivals = products.slice(0, 2);

  if (newArrivals.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="new-arrivals-heading">
      <div className={`container ${styles.inner}`}>
        <h2 id="new-arrivals-heading">NEW ARRIVALS</h2>

        <div className={styles.grid}>
          {newArrivals.map((product) => (
            <article className={styles.card} key={product.id}>
              {product.new_arrival_image_url ? (
                <Image
                  src={product.new_arrival_image_url}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className={styles.image}
                  unoptimized
                />
              ) : (
                <div className={styles.imagePlaceholder} role="img" aria-label={`${product.name} image not configured`}>
                  <i className="ri-image-line" aria-hidden="true" />
                  <span>New Arrival image not configured</span>
                </div>
              )}
              <div className={styles.overlay} aria-hidden="true" />
              <div className={styles.content}>
                <span className={styles.label}>
                  {product.category?.name ?? product.brand ?? "Catchus product"}
                </span>
                <h3>{product.name}</h3>
                <Link href={`/product/${product.slug}`}>
                  Lihat Produk
                  <i className="ri-arrow-right-line" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
