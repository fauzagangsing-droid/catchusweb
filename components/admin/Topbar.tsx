"use client";

import styles from "./Topbar.module.css";

export interface TopbarProps {
  title: string;
  onOpenMobile: () => void;
}

export default function Topbar({ title, onOpenMobile }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.hamburger}
          onClick={onOpenMobile}
          aria-label="Open sidebar menu"
        >
          <i className="ri-menu-3-line" />
        </button>
        <h1 className={styles.title}>{title}</h1>
      </div>

      <div className={styles.right}>
        <div className={styles.admin}>
          <span className={styles.avatar}>A</span>
          <span className={styles.adminName}>Admin</span>
        </div>
      </div>
    </header>
  );
}
