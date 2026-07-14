"use client";

import { useState } from "react";
import RequireAdminAuth from "@/components/admin/RequireAdminAuth";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import StatCard from "@/components/admin/StatCard";
import QuickAction from "@/components/admin/QuickAction";
import RecentProducts, { type RecentProduct } from "@/components/admin/RecentProducts";
import styles from "./dashboard.module.css";

// Mock data only — CRUD and real data wiring come in a later task.
const MOCK_STATS = {
  totalProducts: 48,
  categories: 6,
  featuredProducts: 12,
  latestUpdate: "2h ago",
};

const MOCK_RECENT_PRODUCTS: RecentProduct[] = [
  {
    id: "1",
    name: "Oversized Knit Sweater",
    category: "Sweater",
    price: "Rp 189.000",
    image: "/images/Sweater.png",
    featured: true,
  },
  {
    id: "2",
    name: "Classic Baju Graphic Tee",
    category: "T-shirt",
    price: "Rp 99.000",
    image: "/images/baju1.png",
  },
  {
    id: "3",
    name: "Ribbed Beanie",
    category: "Beanie",
    price: "Rp 59.000",
    image: "/images/beanie.png",
  },
  {
    id: "4",
    name: "Cropped Sweater 2.0",
    category: "Sweater",
    price: "Rp 199.000",
    image: "/images/Sweater2.jpg",
    featured: true,
  },
  {
    id: "5",
    name: "Everyday Baju Tee",
    category: "T-shirt",
    price: "Rp 89.000",
    image: "/images/baju3.png",
  },
];

function DashboardContent() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className={styles.main}>
        <Topbar title="Dashboard" onOpenMobile={() => setMobileOpen(true)} />

        <div className={styles.content}>
          <section className={styles.statsGrid}>
            <StatCard
              icon="ri-shopping-bag-3-line"
              label="Total Products"
              value={MOCK_STATS.totalProducts}
            />
            <StatCard
              icon="ri-price-tag-3-line"
              label="Categories"
              value={MOCK_STATS.categories}
            />
            <StatCard
              icon="ri-star-line"
              label="Featured Products"
              value={MOCK_STATS.featuredProducts}
            />
            <StatCard
              icon="ri-time-line"
              label="Latest Update"
              value={MOCK_STATS.latestUpdate}
            />
          </section>

          <section className={styles.quickActionsSection}>
            <h2 className={styles.sectionHeading}>Quick Actions</h2>
            <div className={styles.quickActionsGrid}>
              <QuickAction
                icon="ri-add-circle-line"
                label="Add Product"
                href="/admin/products"
              />
              <QuickAction
                icon="ri-price-tag-3-line"
                label="Manage Categories"
                href="/admin/categories"
              />
              <QuickAction
                icon="ri-image-add-line"
                label="Upload Banner"
                href="/admin/banners"
              />
            </div>
          </section>

          <section>
            <RecentProducts products={MOCK_RECENT_PRODUCTS} />
          </section>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <RequireAdminAuth>
      <DashboardContent />
    </RequireAdminAuth>
  );
}
