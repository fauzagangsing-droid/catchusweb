"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./PaymentConfirmationButton.module.css";

export default function PaymentConfirmationButton({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmPayment() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(orderNumber)}/paid`,
        { method: "POST" }
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Pembayaran tidak dapat dikirim untuk diverifikasi.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung. Silakan coba lagi.");
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <button type="button" onClick={confirmPayment} disabled={submitting}>
        {submitting ? "Mengirim..." : "Saya Sudah Bayar"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
