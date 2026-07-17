import styles from "./Auth.module.css";

interface AuthStatusProps {
  message: string;
  type: "error" | "success";
}

export default function AuthStatus({ message, type }: AuthStatusProps) {
  return (
    <div className={`${styles.status} ${styles[type]}`} role={type === "error" ? "alert" : "status"}>
      <i className={type === "error" ? "ri-error-warning-line" : "ri-checkbox-circle-line"} />
      <span>{message}</span>
    </div>
  );
}
