"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Product } from "@/types/product";
import styles from "./QuickViewModal.module.css";

interface QuickViewModalProps {
  product: Product;
  onClose: () => void;
}

export default function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close quick view"
        >
          <i className="ri-close-line" />
        </button>

        <div className={styles.imageWrap}>
          <Image
            src={product.image}
            alt={product.alt}
            fill
            sizes="(max-width: 720px) 100vw, 50vw"
            className={styles.image}
          />
          {product.badge && <span className={styles.badge}>{product.badge}</span>}
        </div>

        <div className={styles.content}>
          <span className={styles.eyebrow}>Quick View</span>
          <h2 id="quick-view-title">{product.title}</h2>
          <div className={styles.priceRow}>
            {product.priceOld && <span className={styles.oldPrice}>{product.priceOld}</span>}
            <span className={styles.price}>{product.priceNew}</span>
          </div>
          <p>
            {product.shortDescription ||
              "Explore the complete product information, availability, and shopping options."}
          </p>
          <Link className={styles.detailsButton} href={`/product/${product.slug}`}>
            View Details
            <i className="ri-arrow-right-line" />
          </Link>
        </div>
      </div>
    </div>
  );
}
