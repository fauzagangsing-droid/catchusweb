"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import AuthButton from "@/components/auth/AuthButton";
import AuthStatus from "@/components/auth/AuthStatus";
import PasswordInput from "@/components/auth/PasswordInput";
import {
  emailPattern,
  friendlyAuthError,
  getVerificationResendRemainingSeconds,
  isEmailNotConfirmedError,
  recordVerificationEmailSent,
  safeNextPath,
  UNVERIFIED_EMAIL_MESSAGE,
} from "@/lib/customer-auth";
import {
  createCustomerBrowserClient,
  setRememberMe,
} from "@/lib/supabase/customer-browser";
import styles from "./Auth.module.css";

interface LoginFormProps {
  nextPath?: string;
  initialError?: string | null;
}

export default function LoginForm({ nextPath, initialError }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailPattern.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setLoading(true);
    setError(null);
    setRememberMe(remember);

    try {
      const supabase = createCustomerBrowserClient();
      const normalizedEmail = email.trim();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (signInError) {
        if (isEmailNotConfirmedError(signInError)) {
          const resendIsCoolingDown =
            getVerificationResendRemainingSeconds(normalizedEmail) > 0;

          if (!resendIsCoolingDown) {
            const { error: resendError } = await supabase.auth.resend({
              type: "signup",
              email: normalizedEmail,
              options: {
                emailRedirectTo: `${window.location.origin}/auth/callback?next=/account?verified=1`,
              },
            });

            if (resendError) {
              setError(
                `Your email has not been verified yet.\n\n${friendlyAuthError(resendError.message)}\n\nPlease use your most recent verification email or try again shortly.`
              );
              setLoading(false);
              return;
            }

            recordVerificationEmailSent(normalizedEmail);
          }

          setError(UNVERIFIED_EMAIL_MESSAGE);
          setLoading(false);
          return;
        }

        setError(friendlyAuthError(signInError.message));
        setLoading(false);
        return;
      }

      router.replace(safeNextPath(nextPath ?? null));
      router.refresh();
    } catch {
      setError("Unable to connect. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className={styles.heading}>Welcome back</h1>
      <p className={styles.intro}>Sign in to access your Catchus account.</p>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="customer-email">Email</label>
          <input
            id="customer-email"
            name="email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            disabled={loading}
            required
          />
        </div>
        <PasswordInput
          id="customer-password"
          name="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          disabled={loading}
        />
        <div className={styles.actions}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              disabled={loading}
            />
            Remember me
          </label>
          <Link href="/forgot-password" className={styles.textLink}>Forgot password?</Link>
        </div>
        {error && <AuthStatus message={error} type="error" />}
        <AuthButton loading={loading} idleText="Login" loadingText="Signing in..." />
      </form>
      <p className={styles.footerText}>
        New to Catchus? <Link href="/register" className={styles.textLink}>Create an account</Link>
      </p>
      <Link href="/" className={`${styles.textLink} ${styles.back}`}>
        <i className="ri-arrow-left-line" /> Back to storefront
      </Link>
    </>
  );
}
