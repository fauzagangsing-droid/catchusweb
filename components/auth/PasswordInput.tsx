"use client";

import { useState } from "react";
import styles from "./Auth.module.css";

interface PasswordInputProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  disabled?: boolean;
  helper?: string;
}

export default function PasswordInput({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete,
  disabled,
  helper,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={styles.inputWrap}>
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          className={`${styles.input} ${styles.passwordInput}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          required
        />
        <button
          type="button"
          className={styles.passwordToggle}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          disabled={disabled}
        >
          <i className={visible ? "ri-eye-off-line" : "ri-eye-line"} />
        </button>
      </div>
      {helper && <span className={styles.helper}>{helper}</span>}
    </div>
  );
}
