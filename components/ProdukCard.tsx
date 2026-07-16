import { Product } from "@/types/product";
import styles from "./ProdukCard.module.css";

interface ProdukCardProps {
  product: Product;
  visible: boolean;
  onQuickView: (product: Product) => void;
}

export default function ProdukCard({ product, visible, onQuickView }: ProdukCardProps) {
  return (
    <div
      className="produk-item"
      data-filter={product.filter}
      style={{ display: visible ? "block" : "none" }}
    >
      <div className={`produk-card ${styles.clickable}`}>
        <button
          type="button"
          className={styles.quickViewButton}
          aria-label={`Quick view ${product.title}`}
          onClick={() => onQuickView(product)}
        />
        {product.badge && <span className="badge sale">{product.badge}</span>}
        <img src={product.image} alt={product.alt} />
        <div className="card-body">
          <h3 className="produk-title">{product.title}</h3>
          <div className="price-row">
            {product.priceOld && (
              <span className="price-old">{product.priceOld}</span>
            )}
            <span className="price-new">{product.priceNew}</span>
          </div>
          <a
            className={`btn-buy ${styles.buyButton}`}
            href={product.buyUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Beli
          </a>
        </div>
      </div>
    </div>
  );
}
