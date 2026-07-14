import { ModelImage } from "@/types/product";

// NOTE: static `products` and `produkFilters` were removed here — product
// data now comes from Supabase (see lib/queries.ts + lib/adapters.ts) so it
// can be managed without a code deploy. This file keeps only `modelImages`,
// which is unrelated to the categories/products/product_images schema and
// stays static in Phase 2 as per scope.

// Extracted 1:1 from the original <div class="Model-list"> block.
export const modelImages: ModelImage[] = [
  { id: "model-1", image: "/images/model1.JPG", alt: "Model", filter: "T-shirt" },
  { id: "model-2", image: "/images/model2.JPG", alt: "Model", filter: "T-shirt" },
  { id: "model-3", image: "/images/model3.JPG", alt: "Model", filter: "T-shirt" },
  { id: "model-4", image: "/images/Sweater1.jpg", alt: "Model", filter: "Sweater" },
  { id: "model-5", image: "/images/Sweater2.jpg", alt: "Model", filter: "Sweater" },
];
