export interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  featuredProducts: number;
  latestUpdate: string;
}

export interface RecentProduct {
  id: string;
  name: string;
  category: string;
  price: string;
  image: string;
  featured?: boolean;
}
