"use client";

import type { CategoryWithProductCount } from "@/lib/admin-categories";
import styles from "./CategoryTable.module.css";

export interface CategoryTableProps {
  categories: CategoryWithProductCount[];
  loading: boolean;
  onEdit: (category: CategoryWithProductCount) => void;
  onDelete: (category: CategoryWithProductCount) => void;
}

export default function CategoryTable({
  categories,
  loading,
  onEdit,
  onDelete,
}: CategoryTableProps) {
  return (
    <div className={styles.card}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thCategory}>Category</th>
              <th>Slug</th>
              <th>Products</th>
              <th className={styles.thActions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className={styles.stateCell}><span className={styles.spinner} />Loading categories...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={4} className={styles.stateCell}>No categories match your search.</td></tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id}>
                  <td className={styles.categoryName}>{category.name}</td>
                  <td><code className={styles.slug}>{category.slug}</code></td>
                  <td><span className={styles.countBadge}>{category.product_count} {category.product_count === 1 ? "product" : "products"}</span></td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button type="button" className={styles.iconBtn} onClick={() => onEdit(category)} aria-label={`Edit ${category.name}`} title="Edit"><i className="ri-pencil-line" /></button>
                      <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => onDelete(category)} aria-label={`Delete ${category.name}`} title="Delete"><i className="ri-delete-bin-6-line" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
