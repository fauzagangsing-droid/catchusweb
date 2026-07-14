import type { Metadata } from "next";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import RedirectIfAuthenticated from "@/components/admin/RedirectIfAuthenticated";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Admin Login | Catchus Official",
};

export default function AdminLoginPage() {
  return (
    <div className={styles.page}>
      <RedirectIfAuthenticated />
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <span className={styles.logoMark}>Catchus</span>
          <span className={styles.logoSub}>Admin</span>
        </div>

        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.subheading}>
          Sign in to manage products, orders, and store settings.
        </p>

        <AdminLoginForm />

        <div className={styles.backLink}>
          <a href="/">&larr; Back to storefront</a>
        </div>
      </div>
    </div>
  );
}
