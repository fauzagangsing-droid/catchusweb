"use client";

import { useState, type FormEvent } from "react";
import {
  slugify,
  validateCategoryForm,
  type CategoryFormErrors,
  type CategoryFormValues,
  type CategoryWithProductCount,
} from "@/lib/admin-categories";
import styles from "./CategoryForm.module.css";

export interface CategoryFormProps {
  initialCategory?: CategoryWithProductCount | null;
  submitting: boolean;
  serverError: string | null;
  onSubmit: (values: CategoryFormValues) => void;
  onCancel: () => void;
}

function toFormValues(category?: CategoryWithProductCount | null): CategoryFormValues {
  return category ? { name: category.name, slug: category.slug } : { name: "", slug: "" };
}

export default function CategoryForm({ initialCategory, submitting, serverError, onSubmit, onCancel }: CategoryFormProps) {
  const [values, setValues] = useState<CategoryFormValues>(() => toFormValues(initialCategory));
  const [errors, setErrors] = useState<CategoryFormErrors>({});
  const [slugTouched, setSlugTouched] = useState(Boolean(initialCategory));

  const handleNameChange = (name: string) => {
    setValues((previous) => ({ ...previous, name, slug: slugTouched ? previous.slug : slugify(name) }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateCategoryForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSubmit(values);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {serverError && <div className={styles.errorBox} role="alert"><i className="ri-error-warning-line" /><span>{serverError}</span></div>}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="category-name">Category Name</label>
        <input id="category-name" className={styles.input} value={values.name} onChange={(event) => handleNameChange(event.target.value)} placeholder="e.g. Sweater" aria-invalid={Boolean(errors.name)} disabled={submitting} autoFocus />
        {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="category-slug">Slug</label>
        <input id="category-slug" className={styles.input} value={values.slug} onChange={(event) => { setSlugTouched(true); setValues((previous) => ({ ...previous, slug: event.target.value })); }} placeholder="sweater" aria-invalid={Boolean(errors.slug)} disabled={submitting} />
        <span className={styles.hint}>Auto-generated from the name. Keep it short and unique.</span>
        {errors.slug && <span className={styles.fieldError}>{errors.slug}</span>}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={submitting}>Cancel</button>
        <button type="submit" className={styles.submitBtn} disabled={submitting}>{submitting && <span className={styles.spinner} />}{submitting ? "Saving..." : initialCategory ? "Save Changes" : "Add Category"}</button>
      </div>
    </form>
  );
}
