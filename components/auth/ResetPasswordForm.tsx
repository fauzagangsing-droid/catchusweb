"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import AuthButton from "@/components/auth/AuthButton";
import AuthStatus from "@/components/auth/AuthStatus";
import PasswordInput from "@/components/auth/PasswordInput";
import { validatePassword } from "@/lib/customer-auth";
import { createCustomerBrowserClient } from "@/lib/supabase/customer-browser";
import styles from "./Auth.module.css";

interface ResetPasswordFormProps { callbackError?: boolean; }

export default function ResetPasswordForm({ callbackError }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [checking, setChecking] = useState(!callbackError);
  const [validSession, setValidSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(callbackError ? "This reset link has expired or is invalid." : null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (callbackError) return;
    const supabase = createCustomerBrowserClient();
    supabase.auth.getUser().then(({ data, error: userError }) => {
      setValidSession(Boolean(data.user) && !userError);
      if (!data.user || userError) setError("This reset link has expired or is invalid.");
      setChecking(false);
    });
  }, [callbackError]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      setError(passwordResult.message);
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Catchus-Action": "reset-password",
      },
      credentials: "same-origin",
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      const result: { error?: string } = await response.json().catch(() => ({}));
      setError(result.error ?? "Unable to update your password.");
      setLoading(false);
      return;
    }
    setSuccess("Password updated successfully. You can now continue to your account.");
    setPassword("");
    setConfirmation("");
    setLoading(false);
  }

  return (
    <>
      <h1 className={styles.heading}>Reset password</h1>
      <p className={styles.intro}>Choose a strong new password for your account.</p>
      {checking ? (
        <AuthStatus message="Validating your reset link..." type="success" />
      ) : validSession ? (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <PasswordInput id="reset-password" name="password" label="New Password" value={password} onChange={setPassword} autoComplete="new-password" disabled={loading} helper="Use 8+ characters with uppercase, lowercase, number, and special character." />
          <PasswordInput id="reset-confirmation" name="confirmation" label="Confirm New Password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" disabled={loading} />
          {error && <AuthStatus message={error} type="error" />}
          {success && <AuthStatus message={success} type="success" />}
          <AuthButton loading={loading} idleText="Update Password" loadingText="Updating..." />
        </form>
      ) : (
        <>
          {error && <AuthStatus message={error} type="error" />}
          <Link href="/forgot-password" className={`${styles.textLink} ${styles.back}`}>Request a new reset link</Link>
        </>
      )}
      {success && <Link href="/account" className={`${styles.textLink} ${styles.back}`}>Continue to My Account</Link>}
    </>
  );
}
