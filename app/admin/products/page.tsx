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
import { syncProductImages } from "@/lib/product-images";
import { deleteStorageImage, getImagePathFromPublicUrl } from "@/lib/storage";
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

    const basePayload = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      brand: values.brand.trim() || null,
      sku: values.sku.trim() || null,
      price: Number(values.price),
      compare_price: values.comparePrice.trim() ? Number(values.comparePrice) : null,
      category_id: values.categoryId,
      stock: Number(values.stock),
      weight: Number(values.weight),
      short_description: values.shortDescription.trim() || null,
      description: values.description.trim() || null,
      featured: values.featured,
      status: values.status,
      shopee_url: values.shopeeUrl.trim() || null,
      tokopedia_url: values.tokopediaUrl.trim() || null,
      tiktok_shop_url: values.tiktokShopUrl.trim() || null,
      lazada_url: values.lazadaUrl.trim() || null,
      blibli_url: values.blibliUrl.trim() || null,
    };

    const result =
      modalMode === "edit" && editingProduct
        ? await updateProduct(editingProduct.id, basePayload)
        : // Add mode: ImageUploader already uploaded to Storage under this id,
          // so the product row must be created with the same id.
          await createProduct({ ...basePayload, id: values.images.productId });

    if (result.error || !result.data) {
      setFormError(result.error ?? "Something went wrong. Please try again.");
      setFormSubmitting(false);
      return;
    }

    // Product row saved — now reconcile the product_images row to match
    // what the ImageUploader resolved (new upload / unchanged / removed).
    // The product fields already saved successfully at this point, so on an
    // image-step failure we keep the modal open (with the product's other
    // changes intact) instead of discarding that save.
    const productId = result.data.id;
    const imageResult = await syncProductImages(productId, values.images);

    if (imageResult.error) {
      setModalMode("edit");
      setEditingProduct(result.data);
      setFormError(imageResult.error);
      setFormSubmitting(false);
      await loadProducts();
      return;
    }

    // Only purge the previous Storage file once the new state is confirmed
    // saved above — never delete it while its DB row might still reference it.
    values.images.removedImages.forEach((image) => {
      if (image.storagePath) void deleteStorageImage(image.storagePath);
    });

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

    // product_images rows are removed automatically (ON DELETE CASCADE in
    // schema.sql), but the actual file in Supabase Storage is not — purge it
    // first so deleting a product never leaves an orphaned image behind.
    const storagePaths = (deletingProduct.product_images ?? [])
      .map((image) => getImagePathFromPublicUrl(image.image_url))
      .filter((path): path is string => Boolean(path));

    const { error } = await deleteProduct(deletingProduct.id);

    if (error) {
      setDeleteError(error);
      setDeleteSubmitting(false);
      return;
    }

    await Promise.all(storagePaths.map((path) => deleteStorageImage(path)));

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
