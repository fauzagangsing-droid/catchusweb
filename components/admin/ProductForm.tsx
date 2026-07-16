"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { Category, ProductWithRelations } from "@/types/database";
import {
  slugify,
  validateProductForm,
  type ProductFormErrors,
  type ProductFormValues,
} from "@/lib/admin-products";
import ImageUploader, { type ImageUploaderResolvedValue } from "./ImageUploader";
import styles from "./ProductForm.module.css";

export interface ProductFormProps {
  categories: Category[];
  initialProduct?: ProductWithRelations | null;
  submitting: boolean;
  serverError: string | null;
  onSubmit: (values: ProductFormValues) => void;
  onCancel: () => void;
}

type TextFieldValues = Omit<ProductFormValues, "image">;

function toFormValues(product?: ProductWithRelations | null): TextFieldValues {
  if (!product) {
    return {
      name: "",
      slug: "",
      price: "",
      categoryId: "",
      description: "",
      featured: false,
      active: true,
    };
  }

  return {
    name: product.name,
    slug: product.slug,
    price: String(product.price),
    categoryId: product.category_id ?? "",
    description: product.description ?? "",
    featured: product.featured,
    active: product.status === "active",
  };
}

export default function ProductForm({
  categories,
  initialProduct,
  submitting,
  serverError,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const [values, setValues] = useState<TextFieldValues>(() => toFormValues(initialProduct));
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [slugTouched, setSlugTouched] = useState(Boolean(initialProduct));

  // Stable id for the lifetime of this modal instance: the existing product's
  // id when editing, or a freshly generated one when adding (so the image can
  // be uploaded to Storage before the product row itself is created).
  const clientProductId = useMemo(
    () => initialProduct?.id ?? crypto.randomUUID(),
    [initialProduct]
  );

  const initialImage = useMemo(() => {
    const images = initialProduct?.product_images;
    if (!images || images.length === 0) return null;
    const thumbnail = images.find((image) => image.is_thumbnail) ?? images[0];
    return { id: thumbnail.id, url: thumbnail.image_url };
  }, [initialProduct]);

  const [imageValue, setImageValue] = useState<ImageUploaderResolvedValue>(() => ({
    productId: clientProductId,
    imageId: initialImage?.id ?? null,
    imageUrl: initialImage?.url ?? null,
    storagePathToDeleteOnSave: null,
    uploading: false,
  }));

  const handleNameChange = (name: string) => {
    setValues((prev) => ({
      ...prev,
      name,
      slug: slugTouched ? prev.slug : slugify(name),
    }));
  };

  const handleSlugChange = (slug: string) => {
    setSlugTouched(true);
    setValues((prev) => ({ ...prev, slug }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateProductForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0 && !imageValue.uploading) {
      onSubmit({ ...values, image: imageValue });
    }
  };

  const isSubmitDisabled = submitting || imageValue.uploading;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {serverError && (
        <div className={styles.errorBox} role="alert">
          <i className="ri-error-warning-line" />
          <span>{serverError}</span>
        </div>
      )}

      <ImageUploader
        productId={clientProductId}
        initialImage={initialImage}
        disabled={submitting}
        onChange={setImageValue}
      />

      <div className={styles.field}>
        <label className={styles.label} htmlFor="product-name">
          Product Name
        </label>
        <input
          id="product-name"
          className={styles.input}
          value={values.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. Oversized Knit Sweater"
          aria-invalid={Boolean(errors.name)}
          disabled={submitting}
        />
        {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="product-slug">
          Slug
        </label>
        <input
          id="product-slug"
          className={styles.input}
          value={values.slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder="oversized-knit-sweater"
          aria-invalid={Boolean(errors.slug)}
          disabled={submitting}
        />
        <span className={styles.hint}>
          Auto-generated from the name. Used in the product URL, so keep it short and unique.
        </span>
        {errors.slug && <span className={styles.fieldError}>{errors.slug}</span>}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="product-price">
            Price (Rp)
          </label>
          <input
            id="product-price"
            type="number"
            min="0"
            step="1"
            className={styles.input}
            value={values.price}
            onChange={(e) => setValues((prev) => ({ ...prev, price: e.target.value }))}
            placeholder="150000"
            aria-invalid={Boolean(errors.price)}
            disabled={submitting}
          />
          {errors.price && <span className={styles.fieldError}>{errors.price}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="product-category">
            Category
          </label>
          <select
            id="product-category"
            className={styles.input}
            value={values.categoryId}
            onChange={(e) => setValues((prev) => ({ ...prev, categoryId: e.target.value }))}
            aria-invalid={Boolean(errors.categoryId)}
            disabled={submitting}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId && <span className={styles.fieldError}>{errors.categoryId}</span>}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="product-description">
          Description
        </label>
        <textarea
          id="product-description"
          className={styles.textarea}
          value={values.description}
          onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Short description shown to customers..."
          rows={4}
          disabled={submitting}
        />
      </div>

      <div className={styles.toggleRow}>
        <label className={styles.toggleField}>
          <input
            type="checkbox"
            checked={values.featured}
            onChange={(e) => setValues((prev) => ({ ...prev, featured: e.target.checked }))}
            disabled={submitting}
          />
          <span>Featured</span>
        </label>

        <label className={styles.toggleField}>
          <input
            type="checkbox"
            checked={values.active}
            onChange={(e) => setValues((prev) => ({ ...prev, active: e.target.checked }))}
            disabled={submitting}
          />
          <span>Active</span>
        </label>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button type="submit" className={styles.submitBtn} disabled={isSubmitDisabled}>
          {submitting && <span className={styles.spinner} aria-hidden="true" />}
          {submitting
            ? "Saving..."
            : imageValue.uploading
            ? "Uploading image..."
            : initialProduct
            ? "Save Changes"
            : "Add Product"}
        </button>
      </div>
    </form>
  );
}
