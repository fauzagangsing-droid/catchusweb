"use client";

import { useCallback, useState } from "react";
import { Product } from "@/types/product";
import { useProdukFilter } from "@/hooks/useProdukFilter";
import ProdukCard from "@/components/ProdukCard";
import QuickViewModal from "@/components/QuickViewModal";

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
  const { activeFilter, setActiveFilter, isVisible } = useProdukFilter(products);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const closeQuickView = useCallback(() => setQuickViewProduct(null), []);

  return (
    <div className="produk" id="produk">
      <div className="container">
        <div className="produk-box" data-aos="fade-down" data-aos-duration="1000">
          <h1>Produk Kami</h1>

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
                      onQuickView={setQuickViewProduct}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {quickViewProduct && (
        <QuickViewModal product={quickViewProduct} onClose={closeQuickView} />
      )}
    </div>
  );
}
