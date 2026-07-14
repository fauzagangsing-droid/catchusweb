import styles from "./Pagination.module.css";

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className={styles.wrap}>
      <span className={styles.summary}>
        {totalCount === 0
          ? "No products"
          : `Showing ${rangeStart}–${rangeEnd} of ${totalCount}`}
      </span>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoPrev}
          aria-label="Previous page"
        >
          <i className="ri-arrow-left-s-line" />
        </button>

        {pageNumbers.map((entry, index) =>
          entry === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className={styles.ellipsis}>
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              className={`${styles.pageBtn} ${entry === page ? styles.pageBtnActive : ""}`}
              onClick={() => onPageChange(entry)}
              aria-current={entry === page ? "page" : undefined}
            >
              {entry}
            </button>
          )
        )}

        <button
          type="button"
          className={styles.navBtn}
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoNext}
          aria-label="Next page"
        >
          <i className="ri-arrow-right-s-line" />
        </button>
      </div>
    </div>
  );
}

function getPageNumbers(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const result: (number | "ellipsis")[] = [1];

  if (page > 3) {
    result.push("ellipsis");
  }

  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  for (let i = start; i <= end; i += 1) {
    result.push(i);
  }

  if (page < totalPages - 2) {
    result.push("ellipsis");
  }

  result.push(totalPages);

  return result;
}
