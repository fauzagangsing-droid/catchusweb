"use client";

import { useCallback, useEffect, useState } from "react";
import RequireAdminAuth from "@/components/admin/RequireAdminAuth";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import ProductFilters from "@/components/admin/ProductFilters";
import ProductTable from "@/components/admin/ProductTable";
import Pagination from "@/components/admin/Pagination";
import ProductModal from "@/components/admin/ProductModal";
import ProductForm from "@/components/admin/ProductForm";
import DeleteDialog from "@/components/admin/DeleteDialog";
import {
  createProduct,
  deleteProduct,
  getAdminProducts,
  getCategoriesBrowser,
  setProductFeatured,
  setProductStatus,
  updateProduct,
  type ActiveFilter,
  type FeaturedFilter,
  type ProductFormValues,
  type ProductSortField,
  type SortDirection,
} from "@/lib/admin-products";
import type { Category, ProductWithRelations } from "@/types/database";
import styles from "./products.module.css";

const PAGE_SIZE = 10;

function ProductsContent() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [featured, setFeatured] = useState<FeaturedFilter>("all");
  const [active, setActive] = useState<ActiveFilter>("all");
  const [sortField, setSortField] = useState<ProductSortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductWithRelations | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingProduct, setDeletingProduct] = useState<ProductWithRelations | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Debounce the search box so we don't re-query on every keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let isMounted = true;
    getCategoriesBrowser().then(({ data, error }) => {
      if (!isMounted) return;
      if (data) setCategories(data);
      if (error) setListError(error);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setListError(null);

    const { data, error } = await getAdminProducts({
      page,
      pageSize: PAGE_SIZE,
      search,
      categoryId,
      featured,
      active,
      sortField,
      sortDirection,
    });

    if (error) {
      setListError(error);
      setProducts([]);
      setTotalCount(0);
    } else if (data) {
      setProducts(data.products);
      setTotalCount(data.totalCount);
    }

    setLoading(false);
  }, [page, search, categoryId, featured, active, sortField, sortDirection]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleCategoryChange = (value: string) => {
    setCategoryId(value);
    setPage(1);
  };

  const handleFeaturedChange = (value: FeaturedFilter) => {
    setFeatured(value);
    setPage(1);
  };

  const handleActiveChange = (value: ActiveFilter) => {
    setActive(value);
    setPage(1);
  };

  const handleSortChange = (field: ProductSortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    setPage(1);
  };

  const handleToggleFeatured = async (product: ProductWithRelations) => {
    setTogglingId(product.id);
    const nextFeatured = !product.featured;

    // Optimistic update so the UI feels instant; reconciled by loadProducts on success.
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, featured: nextFeatured } : p))
    );

    const { error } = await setProductFeatured(product.id, nextFeatured);

    if (error) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, featured: product.featured } : p))
      );
      setListError(error);
    }

    setTogglingId(null);
  };

  const handleToggleActive = async (product: ProductWithRelations) => {
    setTogglingId(product.id);
    const nextStatus = product.status === "active" ? "inactive" : "active";

    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, status: nextStatus } : p))
    );

    const { error } = await setProductStatus(product.id, nextStatus);

    if (error) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: product.status } : p))
      );
      setListError(error);
    }

    setTogglingId(null);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormError(null);
    setModalMode("add");
  };

  const openEditModal = (product: ProductWithRelations) => {
    setEditingProduct(product);
    setFormError(null);
    setModalMode("edit");
  };

  const closeModal = () => {
    if (formSubmitting) return;
    setModalMode(null);
    setEditingProduct(null);
    setFormError(null);
  };

  const handleFormSubmit = async (values: ProductFormValues) => {
    setFormSubmitting(true);
    setFormError(null);

    const payload = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      price: Number(values.price),
      category_id: values.categoryId,
      description: values.description.trim() || null,
      featured: values.featured,
      status: values.active ? ("active" as const) : ("inactive" as const),
    };

    const result =
      modalMode === "edit" && editingProduct
        ? await updateProduct(editingProduct.id, payload)
        : await createProduct(payload);

    if (result.error) {
      setFormError(result.error);
      setFormSubmitting(false);
      return;
    }

    setFormSubmitting(false);
    setModalMode(null);
    setEditingProduct(null);
    await loadProducts();
  };

  const openDeleteDialog = (product: ProductWithRelations) => {
    setDeleteError(null);
    setDeletingProduct(product);
  };

  const closeDeleteDialog = () => {
    if (deleteSubmitting) return;
    setDeletingProduct(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setDeleteSubmitting(true);
    setDeleteError(null);

    const { error } = await deleteProduct(deletingProduct.id);

    if (error) {
      setDeleteError(error);
      setDeleteSubmitting(false);
      return;
    }

    setDeleteSubmitting(false);
    setDeletingProduct(null);

    // If we just deleted the last item on a page beyond page 1, step back a page.
    if (products.length === 1 && page > 1) {
      setPage((prev) => prev - 1);
    } else {
      await loadProducts();
    }
  };

  return (
    <div className={styles.shell}>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className={styles.main}>
        <Topbar title="Products" onOpenMobile={() => setMobileOpen(true)} />

        <div className={styles.content}>
          {listError && (
            <div className={styles.banner} role="alert">
              <i className="ri-error-warning-line" />
              <span>{listError}</span>
            </div>
          )}

          <ProductFilters
            search={searchInput}
            onSearchChange={setSearchInput}
            categories={categories}
            categoryId={categoryId}
            onCategoryChange={handleCategoryChange}
            featured={featured}
            onFeaturedChange={handleFeaturedChange}
            active={active}
            onActiveChange={handleActiveChange}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            onAddProduct={openAddModal}
          />

          <ProductTable
            products={products}
            loading={loading}
            togglingId={togglingId}
            onEdit={openEditModal}
            onDelete={openDeleteDialog}
            onToggleFeatured={handleToggleFeatured}
            onToggleActive={handleToggleActive}
          />

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        </div>
      </div>

      {modalMode && (
        <ProductModal
          title={modalMode === "edit" ? "Edit Product" : "Add Product"}
          onClose={closeModal}
        >
          <ProductForm
            categories={categories}
            initialProduct={editingProduct}
            submitting={formSubmitting}
            serverError={formError}
            onSubmit={handleFormSubmit}
            onCancel={closeModal}
          />
        </ProductModal>
      )}

      {deletingProduct && (
        <DeleteDialog
          productName={deletingProduct.name}
          deleting={deleteSubmitting}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={closeDeleteDialog}
        />
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <RequireAdminAuth>
      <ProductsContent />
    </RequireAdminAuth>
  );
}
