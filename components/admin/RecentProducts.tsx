import Image from "next/image";
import styles from "./RecentProducts.module.css";

export interface RecentProduct {
  id: string;
  name: string;
  category: string;
  price: string;
  image: string;
  featured?: boolean;
}

export interface RecentProductsProps {
  products: RecentProduct[];
}

export default function RecentProducts({ products }: RecentProductsProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Recent Products</h2>
        <span className={styles.subheading}>Latest items added to the catalog</span>
      </div>

      {products.length === 0 ? (
        <p className={styles.empty}>No products yet.</p>
      ) : (
        <ul className={styles.list}>
          {products.map((product) => (
            <li key={product.id} className={styles.row}>
              <div className={styles.thumbWrap}>
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="48px"
                  className={styles.thumb}
                />
              </div>

              <div className={styles.info}>
                <span className={styles.name}>{product.name}</span>
                <span className={styles.category}>{product.category}</span>
              </div>

              {product.featured && <span className={styles.badge}>Featured</span>}

              <span className={styles.price}>{product.price}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
