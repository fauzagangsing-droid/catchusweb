"use client";

import { useState, type FormEvent } from "react";
import { friendlyAuthError } from "@/lib/customer-auth";
import { createCustomerBrowserClient } from "@/lib/supabase/customer-browser";
import styles from "./Account.module.css";

interface DeleteAccountProps { email: string; }

export default function DeleteAccount({ email }: DeleteAccountProps) {
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmation !== "DELETE") {
      setError("Type DELETE exactly to confirm account deletion.");
      return;
    }
    if (!password) {
      setError("Enter your password to confirm your identity.");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createCustomerBrowserClient();
    const { error: verificationError } = await supabase.auth.signInWithPassword({ email, password });
    if (verificationError) {
      setError(friendlyAuthError(verificationError.message));
      setLoading(false);
      return;
    }

    const response = await fetch("/api/account", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-Catchus-Action": "delete-account",
      },
      credentials: "same-origin",
    });
    if (!response.ok) {
      const result: { error?: string } = await response.json().catch(() => ({}));
      setError(result.error ?? "Unable to delete your account.");
      setLoading(false);
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    window.location.assign("/");
  }

  return (
    <section className={`${styles.card} ${styles.dangerCard}`}>
      <h2>Delete Account</h2>
      <p className={styles.cardIntro}>Permanently remove your profile and authentication account. This cannot be undone.</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <p className={styles.confirmation}>Enter your current password and type <strong>DELETE</strong> to confirm.</p>
        <div className={styles.field}><label htmlFor="delete-password">Current Password</label><input id="delete-password" type="password" className={styles.input} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" disabled={loading} required /></div>
        <div className={styles.field}><label htmlFor="delete-confirmation">Confirmation</label><input id="delete-confirmation" className={styles.input} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" disabled={loading} placeholder="DELETE" required /></div>
        {error && <div className={`${styles.message} ${styles.error}`} role="alert">{error}</div>}
        <button type="submit" className={`${styles.button} ${styles.dangerButton}`} disabled={loading}>{loading ? "Deleting..." : "Delete My Account"}</button>
      </form>
    </section>
  );
}
