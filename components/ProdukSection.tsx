"use client";

import { useProdukFilter } from "@/hooks/useProdukFilter";
import ProdukCard from "@/components/ProdukCard";
import type { Product } from "@/types/product";

interface ProdukSectionProps {
  products: Product[];
  filters: string[];
  errorMessage?: string | null;
}

export default function ProdukSection({
  products,
  filters,
  errorMessage,
}: ProdukSectionProps) {
  const { activeFilter, setActiveFilter, isVisible } = useProdukFilter();

  return (
    <div className="produk" id="produk">
      <div className="container">
        <div className="produk-box">
          <h2>Produk Kami</h2>

          {errorMessage ? (
            <p>Produk sedang tidak dapat dimuat. Silakan coba lagi nanti.</p>
          ) : (
            <>
              <ul>
                {filters.map((filter) => (
                  <li
                    key={filter}
                    className={activeFilter === filter ? "active" : ""}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter}
                  </li>
                ))}
              </ul>
              <div className="produk-list">
                {products.length === 0 ? (
                  <p>Belum ada produk tersedia saat ini.</p>
                ) : (
                  products.map((product) => (
                    <ProdukCard
                      key={product.id}
                      product={product}
                      visible={isVisible(product)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
