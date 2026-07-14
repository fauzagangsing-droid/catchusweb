"use client";

import type { Category } from "@/types/database";
import type {
  ActiveFilter,
  FeaturedFilter,
  ProductSortField,
  SortDirection,
} from "@/lib/admin-products";
import styles from "./ProductFilters.module.css";

export interface ProductFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  categories: Category[];
  categoryId: string;
  onCategoryChange: (value: string) => void;
  featured: FeaturedFilter;
  onFeaturedChange: (value: FeaturedFilter) => void;
  active: ActiveFilter;
  onActiveChange: (value: ActiveFilter) => void;
  sortField: ProductSortField;
  sortDirection: SortDirection;
  onSortChange: (field: ProductSortField, direction: SortDirection) => void;
  onAddProduct: () => void;
}

const SORT_OPTIONS: { value: string; label: string; field: ProductSortField; direction: SortDirection }[] = [
  { value: "created_at-desc", label: "Newest first", field: "created_at", direction: "desc" },
  { value: "created_at-asc", label: "Oldest first", field: "created_at", direction: "asc" },
  { value: "name-asc", label: "Name (A–Z)", field: "name", direction: "asc" },
  { value: "name-desc", label: "Name (Z–A)", field: "name", direction: "desc" },
  { value: "price-asc", label: "Price (Low–High)", field: "price", direction: "asc" },
  { value: "price-desc", label: "Price (High–Low)", field: "price", direction: "desc" },
  { value: "stock-asc", label: "Stock (Low–High)", field: "stock", direction: "asc" },
  { value: "stock-desc", label: "Stock (High–Low)", field: "stock", direction: "desc" },
];

export default function ProductFilters({
  search,
  onSearchChange,
  categories,
  categoryId,
  onCategoryChange,
  featured,
  onFeaturedChange,
  active,
  onActiveChange,
  sortField,
  sortDirection,
  onSortChange,
  onAddProduct,
}: ProductFiltersProps) {
  const sortValue = `${sortField}-${sortDirection}`;

  return (
    <div className={styles.wrap}>
      <div className={styles.searchWrap}>
        <i className={`ri-search-line ${styles.searchIcon}`} />
        <input
          className={styles.searchInput}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or SKU..."
          aria-label="Search products"
        />
      </div>

      <div className={styles.filtersRow}>
        <select
          className={styles.select}
          value={categoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={featured}
          onChange={(e) => onFeaturedChange(e.target.value as FeaturedFilter)}
          aria-label="Filter by featured"
        >
          <option value="all">All Products</option>
          <option value="featured">Featured Only</option>
          <option value="not_featured">Not Featured</option>
        </select>

        <select
          className={styles.select}
          value={active}
          onChange={(e) => onActiveChange(e.target.value as ActiveFilter)}
          aria-label="Filter by active status"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>

        <select
          className={styles.select}
          value={sortValue}
          onChange={(e) => {
            const option = SORT_OPTIONS.find((o) => o.value === e.target.value);
            if (option) {
              onSortChange(option.field, option.direction);
            }
          }}
          aria-label="Sort products"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button type="button" className={styles.addBtn} onClick={onAddProduct}>
          <i className="ri-add-line" />
          Add Product
        </button>
      </div>
    </div>
  );
}
