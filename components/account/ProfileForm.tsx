"use client";

import { useState, type FormEvent } from "react";
import { createCustomerBrowserClient } from "@/lib/supabase/customer-browser";
import styles from "./Account.module.css";

interface ProfileFormProps {
  userId: string;
  email: string;
  initialFullName: string | null;
  onNameChange: (name: string) => void;
}

export default function ProfileForm({ userId, email, initialFullName, onNameChange }: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = fullName.trim();
    if (name.length < 2 || name.length > 100) {
      setMessage({ type: "error", text: "Full name must be between 2 and 100 characters." });
      return;
    }
    setLoading(true);
    setMessage(null);
    const supabase = createCustomerBrowserClient();
    const { error } = await supabase.from("profiles").upsert(
      { id: userId, full_name: name },
      { onConflict: "id" }
    );
    if (error) {
      setMessage({ type: "error", text: "Unable to update your profile." });
    } else {
      await supabase.auth.updateUser({ data: { full_name: name } });
      onNameChange(name);
      setMessage({ type: "success", text: "Profile updated successfully." });
    }
    setLoading(false);
  }

  return (
    <section className={styles.card}>
      <h2>Profile Information</h2>
      <p className={styles.cardIntro}>Update the name associated with your customer account.</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="account-email">Email</label>
          <input id="account-email" className={styles.input} value={email} disabled readOnly />
        </div>
        <div className={styles.field}>
          <label htmlFor="account-name">Full Name</label>
          <input id="account-name" className={styles.input} value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" disabled={loading} required />
        </div>
        {message && <div className={`${styles.message} ${styles[message.type]}`} role={message.type === "error" ? "alert" : "status"}>{message.text}</div>}
        <button type="submit" className={styles.button} disabled={loading}>{loading ? "Saving..." : "Save Profile"}</button>
      </form>
    </section>
  );
}
