"use client";

import { useCallback, useState } from "react";
import ProdukCard from "@/components/ProdukCard";
import QuickViewModal from "@/components/QuickViewModal";
import type { Product } from "@/types/product";

interface CategoryProductsProps {
  categoryName: string;
  products: Product[];
  errorMessage?: string | null;
}

export default function CategoryProducts({
  categoryName,
  products,
  errorMessage,
}: CategoryProductsProps) {
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const closeQuickView = useCallback(() => setQuickViewProduct(null), []);

  return (
    <main className="produk" id="produk">
      <div className="container">
        <div className="produk-box">
          <h1>{categoryName}</h1>
          <h2 className="seo-section-heading">Products in {categoryName}</h2>
          <div className="produk-list">
            {errorMessage ? (
              <p>Produk sedang tidak dapat dimuat. Silakan coba lagi nanti.</p>
            ) : products.length === 0 ? (
              <p>Belum ada produk tersedia dalam kategori ini.</p>
            ) : (
              products.map((product) => (
                <ProdukCard
                  key={product.id}
                  product={product}
                  visible
                  onQuickView={setQuickViewProduct}
                />
              ))
            )}
          </div>
        </div>
      </div>
      {quickViewProduct && (
        <QuickViewModal product={quickViewProduct} onClose={closeQuickView} />
      )}
    </main>
  );
}
