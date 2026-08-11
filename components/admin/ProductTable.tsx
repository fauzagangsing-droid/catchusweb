"use client";

import Image from "next/image";

import { formatRupiah, resolveProductImage } from "@/lib/adapters";
import type { ProductWithRelations } from "@/types/database";
import styles from "./ProductTable.module.css";

export interface ProductTableProps {
  products: ProductWithRelations[];
  loading: boolean;
  togglingId: string | null;
  newArrivalCount: number;
  newArrivalLimit: number;
  onEdit: (product: ProductWithRelations) => void;
  onDelete: (product: ProductWithRelations) => void;
  onToggleFeatured: (product: ProductWithRelations) => void;
  onToggleActive: (product: ProductWithRelations) => void;
}

export default function ProductTable({
  products,
  loading,
  togglingId,
  newArrivalCount,
  newArrivalLimit,
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
              <th>Weight</th>
              <th>New Arrival</th>
              <th>Active</th>
              <th className={styles.thActions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className={styles.stateCell}>
                  <span className={styles.spinner} aria-hidden="true" />
                  Loading products...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.stateCell}>
                  No products match your filters.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const isToggling = togglingId === product.id;
                const isActive = product.status === "active";
                const newArrivalLimitReached =
                  !product.featured && newArrivalCount >= newArrivalLimit;
                return (
                  <tr key={product.id}>
                    <td>
                      <div className={styles.productCell}>
                        <div className={styles.thumbWrap}>
                          <Image
                            src={resolveProductImage(product)}
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
                    <td>{product.weight} kg</td>
                    <td>
                      <div className={styles.newArrivalCell}>
                        {product.new_arrival_image_url ? (
                          <div className={styles.newArrivalThumb}>
                            <Image
                              src={product.new_arrival_image_url}
                              alt=""
                              fill
                              sizes="38px"
                              className={styles.thumb}
                              unoptimized
                            />
                          </div>
                        ) : (
                          <span className={styles.thumbnailMissing}>No custom image</span>
                        )}
                        <button
                          type="button"
                          className={`${styles.toggleBtn} ${
                            product.featured ? styles.toggleBtnOn : ""
                          }`}
                          onClick={() => onToggleFeatured(product)}
                          disabled={isToggling || newArrivalLimitReached}
                          aria-pressed={product.featured}
                          aria-label={
                            product.featured
                              ? `Remove ${product.name} from New Arrivals`
                              : `Mark ${product.name} as a New Arrival`
                          }
                          title={
                            product.featured
                              ? "Remove from New Arrivals"
                              : newArrivalLimitReached
                                ? `New Arrivals limit reached (${newArrivalLimit} maximum)`
                                : product.new_arrival_image_url
                                  ? "Mark as a New Arrival"
                                  : "Edit this product and upload a custom New Arrival thumbnail first"
                          }
                        >
                          <i className={product.featured ? "ri-star-fill" : "ri-star-line"} />
                          <span>{product.featured ? "Selected" : "Not selected"}</span>
                        </button>
                      </div>
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
