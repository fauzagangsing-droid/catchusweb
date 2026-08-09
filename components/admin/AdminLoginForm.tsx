"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import styles from "./login.module.css";

/** Authenticates an administrator with Supabase and opens the dashboard. */
function toFriendlyMessage(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "Incorrect email or password. Please try again.";
  }
  if (message.includes("email not confirmed")) {
    return "This account's email hasn't been confirmed yet.";
  }
  if (message.includes("too many requests") || message.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return "Something went wrong signing in. Please try again.";
}

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { error: signInError } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(toFriendlyMessage(signInError.message));
        setIsLoading(false);
        return;
      }

      // Success — keep the button in its loading state while we navigate
      // away so there's no flash of an idle "Sign In" button.
      router.replace("/admin/dashboard");
    } catch {
      setError("Couldn't reach the server. Please check your connection and try again.");
      setIsLoading(false);
    }
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
