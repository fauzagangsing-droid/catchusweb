"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { ProductImage } from "@/types/database";
import styles from "./ProductGallery.module.css";

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const orderedImages = useMemo(
    () => [...images].sort((a, b) => Number(b.is_thumbnail) - Number(a.is_thumbnail)),
    [images]
  );
  const fallbackImage = { id: "fallback", image_url: "/images/catchus.PNG" };
  const [selectedId, setSelectedId] = useState(orderedImages[0]?.id ?? fallbackImage.id);
  const selectedImage =
    orderedImages.find((image) => image.id === selectedId) ?? orderedImages[0] ?? fallbackImage;

  return (
    <div className={styles.gallery}>
      <div className={styles.mainImage}>
        <Image
          src={selectedImage.image_url}
          alt={productName}
          fill
          priority
          sizes="(max-width: 900px) 100vw, 52vw"
          className={styles.image}
        />
      </div>

      {orderedImages.length > 1 && (
        <div className={styles.thumbnails} aria-label="Product images">
          {orderedImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className={`${styles.thumbnail} ${image.id === selectedImage.id ? styles.active : ""}`}
              onClick={() => setSelectedId(image.id)}
              aria-label={`View product image ${index + 1}`}
              aria-pressed={image.id === selectedImage.id}
            >
              <Image
                src={image.image_url}
                alt=""
                fill
                sizes="84px"
                className={styles.thumbnailImage}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
