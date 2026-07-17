"use client";

import { useState, type FormEvent } from "react";
import { friendlyAuthError, validatePassword } from "@/lib/customer-auth";
import { createCustomerBrowserClient } from "@/lib/supabase/customer-browser";
import styles from "./Account.module.css";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentPassword) {
      setMessage({ type: "error", text: "Enter your current password." });
      return;
    }
    const passwordResult = validatePassword(newPassword);
    if (!passwordResult.valid) {
      setMessage({ type: "error", text: passwordResult.message ?? "Choose a stronger password." });
      return;
    }
    if (newPassword !== confirmation) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    setLoading(true);
    setMessage(null);
    const supabase = createCustomerBrowserClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    });
    if (error) {
      setMessage({ type: "error", text: friendlyAuthError(error.message) });
    } else {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setMessage({ type: "success", text: "Password changed successfully." });
    }
    setLoading(false);
  }

  return (
    <section className={styles.card}>
      <h2>Change Password</h2>
      <p className={styles.cardIntro}>Use a unique password you do not use elsewhere.</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}><label htmlFor="current-password">Current Password</label><input id="current-password" type="password" className={styles.input} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" disabled={loading} required /></div>
        <div className={styles.field}><label htmlFor="new-password">New Password</label><input id="new-password" type="password" className={styles.input} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" disabled={loading} required /></div>
        <div className={styles.field}><label htmlFor="confirm-new-password">Confirm New Password</label><input id="confirm-new-password" type="password" className={styles.input} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" disabled={loading} required /></div>
        {message && <div className={`${styles.message} ${styles[message.type]}`} role={message.type === "error" ? "alert" : "status"}>{message.text}</div>}
        <button type="submit" className={styles.button} disabled={loading}>{loading ? "Updating..." : "Change Password"}</button>
      </form>
    </section>
  );
}
