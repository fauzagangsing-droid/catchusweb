import styles from "./StatCard.module.css";

export interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  hint?: string;
}

export default function StatCard({ icon, label, value, hint }: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrap}>
        <i className={icon} />
      </div>
      <div className={styles.textWrap}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </div>
    </div>
  );
}
