"use client";

import { useCallback, useEffect, useState } from "react";
import RequireAdminAuth from "@/components/admin/RequireAdminAuth";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import ProductModal from "@/components/admin/ProductModal";
import CategoryFilters from "@/components/admin/CategoryFilters";
import CategoryTable from "@/components/admin/CategoryTable";
import CategoryForm from "@/components/admin/CategoryForm";
import CategoryDeleteDialog from "@/components/admin/CategoryDeleteDialog";
import {
  createCategory,
  deleteCategory,
  findCategoryDuplicate,
  getAdminCategories,
  updateCategory,
  type CategoryFormValues,
  type CategoryWithProductCount,
} from "@/lib/admin-categories";
import styles from "./categories.module.css";

function CategoriesContent() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryWithProductCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryWithProductCount | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryWithProductCount | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setListError(null);
    const { data, error } = await getAdminCategories(search);
    if (error) { setCategories([]); setListError(error); }
    else if (data) setCategories(data);
    setLoading(false);
  }, [search]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const closeModal = () => {
    if (formSubmitting) return;
    setModalMode(null); setEditingCategory(null); setFormError(null);
  };

  const handleSubmit = async (values: CategoryFormValues) => {
    setFormSubmitting(true); setFormError(null);
    const normalizedValues = { name: values.name.trim(), slug: values.slug.trim() };
    const duplicate = await findCategoryDuplicate(normalizedValues, editingCategory?.id);
    if (duplicate.error) { setFormError(duplicate.error); setFormSubmitting(false); return; }
    if (duplicate.data === "name") { setFormError("That category name is already in use."); setFormSubmitting(false); return; }
    if (duplicate.data === "slug") { setFormError("That slug is already in use by another category."); setFormSubmitting(false); return; }

    const result = modalMode === "edit" && editingCategory
      ? await updateCategory(editingCategory.id, normalizedValues)
      : await createCategory(normalizedValues);
    if (result.error) { setFormError(result.error); setFormSubmitting(false); return; }

    setFormSubmitting(false); setModalMode(null); setEditingCategory(null);
    setSuccessMessage(modalMode === "edit" ? "Category updated successfully." : "Category added successfully.");
    await loadCategories();
  };

  const closeDeleteDialog = () => {
    if (deleteSubmitting) return;
    setDeletingCategory(null); setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    setDeleteSubmitting(true); setDeleteError(null);
    const result = await deleteCategory(deletingCategory.id);
    if (result.error) { setDeleteError(result.error); setDeleteSubmitting(false); return; }
    setDeleteSubmitting(false); setDeletingCategory(null);
    setSuccessMessage("Category deleted successfully.");
    await loadCategories();
  };

  return (
    <div className={styles.shell}>
      <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((value) => !value)} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className={styles.main}>
        <Topbar title="Categories" onOpenMobile={() => setMobileOpen(true)} />
        <div className={styles.content}>
          {listError && <div className={`${styles.banner} ${styles.errorBanner}`} role="alert"><i className="ri-error-warning-line" /><span>{listError}</span></div>}
          {successMessage && <div className={`${styles.banner} ${styles.successBanner}`} role="status"><i className="ri-checkbox-circle-line" /><span>{successMessage}</span></div>}
          <CategoryFilters search={searchInput} onSearchChange={setSearchInput} onAddCategory={() => { setEditingCategory(null); setFormError(null); setModalMode("add"); }} />
          <CategoryTable categories={categories} loading={loading} onEdit={(category) => { setEditingCategory(category); setFormError(null); setModalMode("edit"); }} onDelete={(category) => { setDeleteError(null); setDeletingCategory(category); }} />
        </div>
      </div>
      {modalMode && <ProductModal title={modalMode === "edit" ? "Edit Category" : "Add Category"} onClose={closeModal}><CategoryForm initialCategory={editingCategory} submitting={formSubmitting} serverError={formError} onSubmit={handleSubmit} onCancel={closeModal} /></ProductModal>}
      {deletingCategory && <CategoryDeleteDialog categoryName={deletingCategory.name} productCount={deletingCategory.product_count} deleting={deleteSubmitting} error={deleteError} onConfirm={handleConfirmDelete} onCancel={closeDeleteDialog} />}
    </div>
  );
}

export default function AdminCategoriesPage() {
  return <RequireAdminAuth><CategoriesContent /></RequireAdminAuth>;
}
