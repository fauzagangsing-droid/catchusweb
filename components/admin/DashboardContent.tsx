"use client";

import { useState } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import StatCard from "@/components/admin/StatCard";
import QuickAction from "@/components/admin/QuickAction";
import RecentProducts, { type RecentProduct } from "@/components/admin/RecentProducts";
import type { DashboardStats } from "@/lib/dashboard";
import styles from "@/app/admin/dashboard/dashboard.module.css";

export interface DashboardContentProps {
  stats: DashboardStats;
  recentProducts: RecentProduct[];
}

export default function DashboardContent({ stats, recentProducts }: DashboardContentProps) {
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
              value={stats.totalProducts}
            />
            <StatCard
              icon="ri-price-tag-3-line"
              label="Total Categories"
              value={stats.totalCategories}
            />
            <StatCard
              icon="ri-star-line"
              label="Featured Products"
              value={stats.featuredProducts}
            />
            <StatCard
              icon="ri-time-line"
              label="Latest Update"
              value={stats.latestUpdate}
            />
          </section>

          <section>
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
              <QuickAction
                icon="ri-layout-masonry-line"
                label="Manage Campaigns"
                href="/admin/campaigns"
              />
            </div>
          </section>

          <section>
            <RecentProducts products={recentProducts} />
          </section>
        </div>
      </div>
    </div>
  );
}
