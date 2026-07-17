"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import AuthButton from "@/components/auth/AuthButton";
import AuthStatus from "@/components/auth/AuthStatus";
import { emailPattern, friendlyAuthError } from "@/lib/customer-auth";
import { createCustomerBrowserClient } from "@/lib/supabase/customer-browser";
import styles from "./Auth.module.css";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailPattern.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createCustomerBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (resetError) {
        setError(friendlyAuthError(resetError.message));
      } else {
        setSuccess("If an account exists for that email, a reset link has been sent.");
      }
    } catch {
      setError("Unable to connect. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className={styles.heading}>Forgot password</h1>
      <p className={styles.intro}>Enter your email and we’ll send a secure password reset link.</p>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="forgot-email">Email</label>
          <input id="forgot-email" name="email" type="email" className={styles.input} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" disabled={loading} required />
        </div>
        {error && <AuthStatus message={error} type="error" />}
        {success && <AuthStatus message={success} type="success" />}
        <AuthButton loading={loading} idleText="Send Reset Link" loadingText="Sending..." />
      </form>
      <Link href="/login" className={`${styles.textLink} ${styles.back}`}><i className="ri-arrow-left-line" /> Back to login</Link>
    </>
  );
}
