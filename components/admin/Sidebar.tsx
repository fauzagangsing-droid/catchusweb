"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import styles from "./Sidebar.module.css";

export interface SidebarProps {
  /** Whether the mobile off-canvas drawer is open. */
  mobileOpen: boolean;
  /** Called when the drawer should close (overlay click, link click, Esc). */
  onCloseMobile: () => void;
  /** Whether the desktop sidebar is in icon-only collapsed mode. */
  collapsed: boolean;
  /** Toggles desktop collapsed mode. */
  onToggleCollapsed: () => void;
}

interface MenuItem {
  label: string;
  href: string;
  icon: string;
  comingSoon?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { label: "Dasbor", href: "/admin/dashboard", icon: "ri-dashboard-line" },
  { label: "Produk", href: "/admin/products", icon: "ri-shopping-bag-3-line" },
  { label: "Kategori", href: "/admin/categories", icon: "ri-price-tag-3-line" },
  { label: "Banner", href: "/admin/banners", icon: "ri-image-2-line", comingSoon: true },
  { label: "Pesanan", href: "/admin/orders", icon: "ri-shopping-cart-2-line" },
  { label: "Voucher", href: "/admin/vouchers", icon: "ri-coupon-3-line" },
  { label: "Pengaturan", href: "/admin/settings", icon: "ri-settings-3-line" },
  { label: "Pembayaran", href: "/admin/settings/payment", icon: "ri-bank-card-line" },
];

export default function Sidebar({
  mobileOpen,
  onCloseMobile,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleLogout = async () => {
    setIsSigningOut(true);
    await supabaseBrowser.auth.signOut();
    router.replace("/admin/login");
  };

  return (
    <>
      {/* Mobile overlay — clicking it closes the drawer */}
      <div
        className={`${styles.overlay} ${mobileOpen ? styles.overlayVisible : ""}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""} ${
          mobileOpen ? styles.mobileOpen : ""
        }`}
      >
        <div className={styles.topRow}>
          <Link
            href="/admin/dashboard"
            className={styles.logoWrap}
            onClick={onCloseMobile}
          >
            <span className={styles.logoMark}>C</span>
            {!collapsed && <span className={styles.logoText}>Catchus Admin</span>}
          </Link>

          <button
            type="button"
            className={styles.collapseBtn}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Perluas menu" : "Ciutkan menu"}
            title={collapsed ? "Perluas menu" : "Ciutkan menu"}
          >
            <i className={collapsed ? "ri-menu-unfold-line" : "ri-menu-fold-line"} />
          </button>
        </div>

        <nav className={styles.nav}>
          <ul className={styles.menu}>
            {MENU_ITEMS.map((item) => {
              const isActive = pathname === item.href;

              if (item.comingSoon) {
                return (
                  <li key={item.href}>
                    <span
                      className={`${styles.link} ${styles.disabled}`}
                      title={`${item.label} — segera hadir`}
                    >
                      <i className={item.icon} />
                      {!collapsed && (
                        <>
                          <span className={styles.linkLabel}>{item.label}</span>
                          <span className={styles.badge}>Segera</span>
                        </>
                      )}
                    </span>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`${styles.link} ${isActive ? styles.active : ""}`}
                    title={item.label}
                  >
                    <i className={item.icon} />
                    {!collapsed && <span className={styles.linkLabel}>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.bottomRow}>
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={handleLogout}
            disabled={isSigningOut}
            title="Keluar"
          >
            <i className="ri-logout-box-r-line" />
            {!collapsed && <span>{isSigningOut ? "Keluar..." : "Keluar"}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
