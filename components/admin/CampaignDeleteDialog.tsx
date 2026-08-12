"use client";

import { useEffect } from "react";
import styles from "./DeleteDialog.module.css";

interface CampaignDeleteDialogProps {
  campaignTitle: string;
  deleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CampaignDeleteDialog({
  campaignTitle,
  deleting,
  error,
  onConfirm,
  onCancel,
}: CampaignDeleteDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-label="Delete campaign" onClick={(event) => event.stopPropagation()}>
        <div className={styles.iconWrap}><i className="ri-delete-bin-6-line" /></div>
        <h2 className={styles.title}>Delete this Campaign?</h2>
        <p className={styles.message}><strong>{campaignTitle}</strong> will be permanently removed.</p>
        {error && <div className={styles.errorBox} role="alert"><i className="ri-error-warning-line" /><span>{error}</span></div>}
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={deleting}>Cancel</button>
          <button type="button" className={styles.deleteBtn} onClick={onConfirm} disabled={deleting}>
            {deleting && <span className={styles.spinner} aria-hidden="true" />}
            {deleting ? "Deleting..." : "Delete Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}
