import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/product";
import styles from "./ProdukCard.module.css";

interface ProdukCardProps {
  product: Product;
  visible: boolean;
}

export default function ProdukCard({ product, visible }: ProdukCardProps) {
  return (
    <div
      className={`produk-item ${styles.item}`}
      data-filter={product.filter}
      style={{ display: visible ? "block" : "none" }}
    >
      <Link
        href={`/product/${product.slug}`}
        className={styles.card}
        aria-label={`Lihat detail ${product.title}`}
      >
        <div className={styles.imageArea}>
          {product.badge && <span className={styles.badge}>{product.badge}</span>}
          <Image
            src={product.image}
            alt={product.alt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 300px"
          />
        </div>
        <div className={styles.body}>
          <h3 className={styles.title}>{product.title}</h3>
          <div className={styles.priceRow}>
            {product.priceOld && (
              <span className={styles.oldPrice}>{product.priceOld}</span>
            )}
            <span className={styles.price}>{product.priceNew}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
