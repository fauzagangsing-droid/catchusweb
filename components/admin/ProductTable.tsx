"use client";

import Image from "next/image";
import type { ProductWithRelations } from "@/types/database";
import styles from "./ProductTable.module.css";

export interface ProductTableProps {
  products: ProductWithRelations[];
  loading: boolean;
  togglingId: string | null;
  onEdit: (product: ProductWithRelations) => void;
  onDelete: (product: ProductWithRelations) => void;
  onToggleFeatured: (product: ProductWithRelations) => void;
  onToggleActive: (product: ProductWithRelations) => void;
}

function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

export default function ProductTable({
  products,
  loading,
  togglingId,
  onEdit,
  onDelete,
  onToggleFeatured,
  onToggleActive,
}: ProductTableProps) {
  return (
    <div className={styles.card}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thProduct}>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Featured</th>
              <th>Active</th>
              <th className={styles.thActions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className={styles.stateCell}>
                  <span className={styles.spinner} aria-hidden="true" />
                  Loading products...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.stateCell}>
                  No products match your filters.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const isToggling = togglingId === product.id;
                const isActive = product.status === "active";

                return (
                  <tr key={product.id}>
                    <td>
                      <div className={styles.productCell}>
                        <div className={styles.thumbWrap}>
                          <Image
                            src="/images/catchus.PNG"
                            alt={product.name}
                            fill
                            sizes="44px"
                            className={styles.thumb}
                          />
                        </div>
                        <div className={styles.productInfo}>
                          <span className={styles.productName}>{product.name}</span>
                          <span className={styles.productSlug}>{product.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.categoryBadge}>
                        {product.category?.name ?? "Uncategorized"}
                      </span>
                    </td>
                    <td className={styles.priceCell}>{formatRupiah(product.price)}</td>
                    <td>{product.stock}</td>
                    <td>
                      <button
                        type="button"
                        className={`${styles.toggleBtn} ${
                          product.featured ? styles.toggleBtnOn : ""
                        }`}
                        onClick={() => onToggleFeatured(product)}
                        disabled={isToggling}
                        aria-pressed={product.featured}
                        title={product.featured ? "Unmark as featured" : "Mark as featured"}
                      >
                        <i className={product.featured ? "ri-star-fill" : "ri-star-line"} />
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`${styles.statusPill} ${
                          isActive ? styles.statusActive : styles.statusInactive
                        }`}
                        onClick={() => onToggleActive(product)}
                        disabled={isToggling}
                        title={isActive ? "Set to inactive" : "Set to active"}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td>
                      <div className={styles.actionsCell}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => onEdit(product)}
                          aria-label={`Edit ${product.name}`}
                          title="Edit"
                        >
                          <i className="ri-pencil-line" />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          onClick={() => onDelete(product)}
                          aria-label={`Delete ${product.name}`}
                          title="Delete"
                        >
                          <i className="ri-delete-bin-6-line" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
