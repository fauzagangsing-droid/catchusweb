"use client";

import { useEffect } from "react";
import styles from "./DeleteDialog.module.css";

export interface CategoryDeleteDialogProps {
  categoryName: string;
  productCount: number;
  deleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CategoryDeleteDialog({ categoryName, productCount, deleting, error, onConfirm, onCancel }: CategoryDeleteDialogProps) {
  const isInUse = productCount > 0;
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-label={isInUse ? "Category is in use" : "Delete category"} onClick={(event) => event.stopPropagation()}>
        <div className={styles.iconWrap}><i className={isInUse ? "ri-information-line" : "ri-delete-bin-6-line"} /></div>
        <h2 className={styles.title}>{isInUse ? "Category is in use" : "Delete this category?"}</h2>
        <p className={styles.message}>{isInUse ? <><strong>{categoryName}</strong> is assigned to {productCount} {productCount === 1 ? "product" : "products"}. Move those products first before deleting this category.</> : <><strong>{categoryName}</strong> will be permanently removed. This action can&apos;t be undone.</>}</p>
        {error && <div className={styles.errorBox} role="alert"><i className="ri-error-warning-line" /><span>{error}</span></div>}
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={deleting}>{isInUse ? "Close" : "Cancel"}</button>
          {!isInUse && <button type="button" className={styles.deleteBtn} onClick={onConfirm} disabled={deleting}>{deleting && <span className={styles.spinner} />}{deleting ? "Deleting..." : "Delete Category"}</button>}
        </div>
      </div>
    </div>
  );
}
