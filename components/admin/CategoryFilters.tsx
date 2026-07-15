"use client";

import styles from "./CategoryFilters.module.css";

export interface CategoryFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  onAddCategory: () => void;
}

export default function CategoryFilters({
  search,
  onSearchChange,
  onAddCategory,
}: CategoryFiltersProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.searchWrap}>
        <i className={`ri-search-line ${styles.searchIcon}`} />
        <input
          className={styles.searchInput}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name or slug..."
          aria-label="Search categories"
        />
      </div>

      <button type="button" className={styles.addBtn} onClick={onAddCategory}>
        <i className="ri-add-line" />
        Add Category
      </button>
    </div>
  );
}
