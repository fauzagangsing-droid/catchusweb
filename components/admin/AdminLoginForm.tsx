"use client";

import { useState, type FormEvent } from "react";
import styles from "./login.module.css";

/**
 * Admin Login form — Phase 3, UI only.
 *
 * IMPORTANT: There is no authentication wired up here yet. onSubmit does not
 * call Supabase Auth or any API route. It only simulates the loading/error
 * states so the UI can be reviewed and approved before real auth is added
 * in a later phase. Replace the body of handleSubmit with a real Supabase
 * Auth call (e.g. supabase.auth.signInWithPassword) when that phase starts.
 */
export default function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Placeholder-only validation so the error UI is demonstrable.
    // No network/auth call happens here — see note above.
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setError(null);
    setIsLoading(true);

    // Simulated delay to preview the loading state. Remove this timeout
    // and replace with a real Supabase Auth call in the auth phase.
    window.setTimeout(() => {
      setIsLoading(false);
      setError("Login is not implemented yet. This is a UI placeholder.");
    }, 900);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="admin-email">
          Email
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          className={styles.input}
          placeholder="you@catchus.com"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(error)}
          disabled={isLoading}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="admin-password">
          Password
        </label>
        <div className={styles.passwordRow}>
          <input
            id="admin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            className={styles.input}
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(error)}
            disabled={isLoading}
          />
          <button
            type="button"
            className={styles.toggleVisibility}
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            disabled={isLoading}
          >
            <i className={showPassword ? "ri-eye-off-line" : "ri-eye-line"} />
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBox} role="alert">
          <i className="ri-error-warning-line" />
          <span>{error}</span>
        </div>
      )}

      <button type="submit" className={styles.submitBtn} disabled={isLoading}>
        {isLoading && <span className={styles.spinner} aria-hidden="true" />}
        {isLoading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
