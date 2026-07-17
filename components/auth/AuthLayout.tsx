import Link from "next/link";
import styles from "./Auth.module.css";

interface AuthLayoutProps {
  brandName: string;
  children: React.ReactNode;
}

export default function AuthLayout({ brandName, children }: AuthLayoutProps) {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-label="Customer account">
        <Link href="/" className={styles.brand}>{brandName}</Link>
        {children}
      </section>
    </main>
  );
}
