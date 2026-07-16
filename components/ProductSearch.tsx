"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { formatRupiah } from "@/lib/adapters";
import { searchProducts, type ProductSearchResult } from "@/lib/product-search";
import styles from "./ProductSearch.module.css";

const SEARCH_DEBOUNCE_MS = 300;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, query: string): ReactNode {
  const term = query.trim();
  if (!term) return text;

  const parts = text.split(new RegExp(`(${escapeRegExp(term)})`, "ig"));
  return parts.map((part, index) =>
    part.toLocaleLowerCase() === term.toLocaleLowerCase() ? (
      <mark key={`${part}-${index}`}>{part}</mark>
    ) : (
      part
    )
  );
}

export default function ProductSearch() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setLoading(false);
      setError(null);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    setOpen(true);
    setLoading(true);
    setError(null);
    setActiveIndex(-1);

    const timeout = window.setTimeout(() => {
      searchProducts(term, controller.signal)
        .then((nextResults) => {
          setResults(nextResults);
          setLoading(false);
        })
        .catch((searchError: unknown) => {
          if (controller.signal.aborted) return;
          setResults([]);
          setLoading(false);
          setError(
            searchError instanceof Error
              ? "Search is temporarily unavailable."
              : "Unable to search products."
          );
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? results.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const product = results[activeIndex];
      setOpen(false);
      router.push(`/product/${product.slug}`);
    }
  };

  const hasQuery = Boolean(query.trim());
  const showEmpty = hasQuery && !loading && !error && results.length === 0;

  return (
    <div className={styles.search} ref={rootRef}>
      <div className={styles.inputWrap}>
        <i className={`ri-search-line ${styles.searchIcon}`} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => hasQuery && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search products..."
          aria-label="Search products by name, brand, or category"
          aria-expanded={open}
          aria-controls="product-search-results"
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `product-search-result-${activeIndex}` : undefined}
          role="combobox"
        />
        {hasQuery && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear product search"
          >
            <i className="ri-close-line" />
          </button>
        )}
      </div>

      {open && hasQuery && (
        <div className={styles.dropdown} id="product-search-results" role="listbox">
          {loading ? (
            <div className={styles.state} role="status">
              <span className={styles.spinner} aria-hidden="true" />
              Searching products...
            </div>
          ) : error ? (
            <div className={styles.state} role="alert">{error}</div>
          ) : showEmpty ? (
            <div className={styles.state}>No products found</div>
          ) : (
            results.map((product, index) => (
              <Link
                key={product.id}
                id={`product-search-result-${index}`}
                href={`/product/${product.slug}`}
                className={`${styles.result} ${activeIndex === index ? styles.resultActive : ""}`}
                role="option"
                aria-selected={activeIndex === index}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => setOpen(false)}
              >
                <span className={styles.resultIcon}><i className="ri-t-shirt-2-line" /></span>
                <span className={styles.resultContent}>
                  <strong>{highlightText(product.name, query)}</strong>
                  <span>
                    {product.brand && <>{highlightText(product.brand, query)} · </>}
                    {product.categoryName
                      ? highlightText(product.categoryName, query)
                      : "Uncategorized"}
                  </span>
                </span>
                <span className={styles.resultPrice}>{formatRupiah(product.price)}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
