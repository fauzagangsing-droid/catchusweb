import styles from "./Auth.module.css";

interface AuthButtonProps {
  loading: boolean;
  idleText: string;
  loadingText: string;
}

export default function AuthButton({ loading, idleText, loadingText }: AuthButtonProps) {
  return (
    <button type="submit" className={styles.button} disabled={loading}>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {loading ? loadingText : idleText}
    </button>
  );
}
