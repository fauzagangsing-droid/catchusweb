"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import styles from "./PaymentProofUploader.module.css";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface PaymentProofUploaderProps {
  orderId: string;
  canUpload: boolean;
  hasExistingProof: boolean;
  initialNotes: string;
  rejectionReason: string | null;
}

export default function PaymentProofUploader({
  orderId,
  canUpload,
  hasExistingProof,
  initialNotes,
  rejectionReason,
}: PaymentProofUploaderProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState(initialNotes);
  const [loadingPreview, setLoadingPreview] = useState(hasExistingProof);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!hasExistingProof) return;
    let active = true;
    fetch(`/api/orders/${encodeURIComponent(orderId)}/payment-proof`, { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as { url?: string | null };
        if (active && response.ok) setPreview(result.url ?? null);
      })
      .finally(() => { if (active) setLoadingPreview(false); });
    return () => { active = false; };
  }, [hasExistingProof, orderId]);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    if (!selected) return;
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError("Format harus JPG, JPEG, PNG, atau WEBP.");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError("Ukuran gambar maksimal 5 MB.");
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { setError("Pilih gambar bukti pembayaran."); return; }
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("proof", file);
    formData.set("notes", notes);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/payment-proof`, {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { error?: string; url?: string | null };
      if (!response.ok) throw new Error(result.error ?? "Upload gagal.");
      if (result.url) setPreview(result.url);
      setToast("Bukti pembayaran berhasil dikirim.");
      window.setTimeout(() => setToast(null), 3500);
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload gagal.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className={styles.card}>
      <div><span>Bukti pembayaran</span><h2>Upload Payment Proof</h2></div>
      {rejectionReason && <p className={styles.rejected}>Alasan penolakan: {rejectionReason}</p>}
      {loadingPreview ? <div className={styles.loading}>Memuat bukti...</div> : preview && (
        <div className={styles.preview}><Image src={preview} alt="Bukti pembayaran" fill unoptimized sizes="(max-width: 600px) 100vw, 420px" /></div>
      )}
      {canUpload ? (
        <form onSubmit={upload}>
          <label>Gambar bukti pembayaran<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={selectFile} disabled={uploading} /></label>
          <label>Catatan (opsional)<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={3} disabled={uploading} /></label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button type="submit" disabled={uploading || !file}>{uploading ? "Mengunggah..." : "Upload Bukti"}</button>
        </form>
      ) : <p className={styles.notice}>Bukti sudah dikirim dan sedang menunggu verifikasi admin.</p>}
      {toast && <div className={styles.toast} role="status">{toast}</div>}
    </section>
  );
}
