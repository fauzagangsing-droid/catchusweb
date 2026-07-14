import Link from "next/link";
import styles from "./QuickAction.module.css";

export interface QuickActionProps {
  icon: string;
  label: string;
  href: string;
}

export default function QuickAction({ icon, label, href }: QuickActionProps) {
  return (
    <Link href={href} className={styles.action}>
      <span className={styles.iconWrap}>
        <i className={icon} />
      </span>
      <span className={styles.label}>{label}</span>
      <i className={`ri-arrow-right-line ${styles.arrow}`} />
    </Link>
  );
}
