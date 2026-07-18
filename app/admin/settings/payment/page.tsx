"use client";

import Image from "next/image";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import RequireAdminAuth from "@/components/admin/RequireAdminAuth";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import { getPaymentSettings, updatePaymentSettings } from "@/lib/payment-settings";
import {
  deleteStorageImage,
  getImagePathFromPublicUrl,
  PAYMENT_IMAGE_BUCKET,
  uploadPaymentImage,
  validateImageFile,
} from "@/lib/storage";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { PaymentSettings } from "@/types/database";
import styles from "./payment-settings.module.css";

type FormValues = Omit<PaymentSettings, "id" | "updated_at" | "shipping_cost"> & {
  shipping_cost: string;
};

function PaymentSettingsContent() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [values, setValues] = useState<FormValues | null>(null);
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [qrisPreviewUrl, setQrisPreviewUrl] = useState<string | null>(null);
  const [savedQrisImageUrl, setSavedQrisImageUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getPaymentSettings(supabaseBrowser).then((result) => {
      if (!active) return;
      if (result.data) {
        setValues({
          qris_merchant_name: result.data.qris_merchant_name,
          qris_image_url: result.data.qris_image_url,
          qris_description: result.data.qris_description,
          dana_account_name: result.data.dana_account_name,
          dana_number: result.data.dana_number,
          bank_name: result.data.bank_name,
          bank_account_holder: result.data.bank_account_holder,
          bank_account_number: result.data.bank_account_number,
          shipping_cost: String(result.data.shipping_cost),
        });
        setQrisPreviewUrl(result.data.qris_image_url);
        setSavedQrisImageUrl(result.data.qris_image_url);
      } else {
        setError("Pengaturan pembayaran belum tersedia. Jalankan migrasi checkout terlebih dahulu.");
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (qrisPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(qrisPreviewUrl);
    };
  }, [qrisPreviewUrl]);

  function setField(field: keyof FormValues, value: string | null) {
    setValues((current) => current ? { ...current, [field]: value } : current);
    setError(null);
    setSuccess(null);
  }

  function selectQrisImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(
        file.size > 5 * 1024 * 1024
          ? "Ukuran gambar QRIS maksimal 5 MB."
          : "Gambar QRIS harus berformat JPG, JPEG, PNG, atau WEBP."
      );
      return;
    }

    setQrisFile(file);
    setQrisPreviewUrl(URL.createObjectURL(file));
    setUploadProgress(0);
    setError(null);
    setSuccess(null);
  }

  function removeQrisImage() {
    setQrisFile(null);
    setQrisPreviewUrl(null);
    setField("qris_image_url", null);
    setUploadProgress(0);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values) return;
    const optional = (value: string | null) => value?.trim() || null;
    const qrisMerchantName = optional(values.qris_merchant_name);
    const qrisDescription = optional(values.qris_description);
    const qrisHasImage = Boolean(qrisFile || values.qris_image_url);
    const danaName = optional(values.dana_account_name);
    const danaNumber = optional(values.dana_number);
    const bankName = optional(values.bank_name);
    const bankHolder = optional(values.bank_account_holder);
    const bankNumber = optional(values.bank_account_number);
    const shippingCost = Number(values.shipping_cost);

    if (Boolean(qrisMerchantName) !== qrisHasImage) {
      setError("Lengkapi nama merchant dan gambar QRIS, atau kosongkan keduanya.");
      return;
    }
    if (Boolean(danaName) !== Boolean(danaNumber)) {
      setError("Lengkapi kedua kolom DANA, atau kosongkan keduanya.");
      return;
    }
    const bankFields = [bankName, bankHolder, bankNumber].filter(Boolean).length;
    if (bankFields > 0 && bankFields < 3) {
      setError("Lengkapi seluruh kolom transfer bank, atau kosongkan semuanya.");
      return;
    }
    if (!Number.isFinite(shippingCost) || shippingCost < 0) {
      setError("Biaya pengiriman harus bernilai nol atau lebih.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    let uploadedPath: string | null = null;

    try {
      let qrisImageUrl = values.qris_image_url;
      if (qrisFile) {
        const uploaded = await uploadPaymentImage(
          "qris",
          qrisFile,
          setUploadProgress
        ).promise;
        uploadedPath = uploaded.path;
        qrisImageUrl = uploaded.publicUrl;
      }

      const result = await updatePaymentSettings(supabaseBrowser, {
        qris_merchant_name: qrisMerchantName,
        qris_image_url: qrisImageUrl,
        qris_description: qrisDescription,
        dana_account_name: danaName,
        dana_number: danaNumber,
        bank_name: bankName,
        bank_account_holder: bankHolder,
        bank_account_number: bankNumber,
        shipping_cost: shippingCost,
      });

      if (result.error || !result.data) {
        if (uploadedPath) await deleteStorageImage(uploadedPath, PAYMENT_IMAGE_BUCKET);
        setError("Pengaturan pembayaran tidak dapat disimpan. Periksa sesi admin lalu coba lagi.");
        return;
      }

      if (savedQrisImageUrl && savedQrisImageUrl !== qrisImageUrl) {
        const oldPath = getImagePathFromPublicUrl(
          savedQrisImageUrl,
          PAYMENT_IMAGE_BUCKET
        );
        if (oldPath) await deleteStorageImage(oldPath, PAYMENT_IMAGE_BUCKET);
      }

      setValues((current) => current ? {
        ...current,
        qris_image_url: result.data?.qris_image_url ?? null,
      } : current);
      setSavedQrisImageUrl(result.data.qris_image_url);
      setQrisPreviewUrl(result.data.qris_image_url);
      setQrisFile(null);
      setSuccess("Pengaturan pembayaran berhasil disimpan.");
    } catch {
      if (uploadedPath) await deleteStorageImage(uploadedPath, PAYMENT_IMAGE_BUCKET);
      setError("Gambar QRIS tidak dapat diunggah. Periksa koneksi lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  const field = (
    name: keyof FormValues,
    label: string,
    inputMode?: "text" | "numeric"
  ) => (
    <div className={styles.field}>
      <label htmlFor={`payment-${name}`}>{label}</label>
      <input
        id={`payment-${name}`}
        value={values?.[name] ?? ""}
        onChange={(event) => setField(name, event.target.value)}
        inputMode={inputMode}
        disabled={saving}
      />
    </div>
  );

  return (
    <div className={styles.shell}>
      <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((value) => !value)} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className={styles.main}>
        <Topbar title="Pengaturan Pembayaran" onOpenMobile={() => setMobileOpen(true)} />
        <div className={styles.content}>
          {error && <div className={`${styles.banner} ${styles.error}`} role="alert">{error}</div>}
          {success && <div className={`${styles.banner} ${styles.success}`} role="status">{success}</div>}
          {loading ? <div className={styles.loading}>Memuat pengaturan pembayaran...</div> : values ? (
            <form className={styles.form} onSubmit={save}>
              <section className={styles.card}>
                <div className={styles.cardHeader}><i className="ri-qr-code-line" aria-hidden="true" /><div><h2>QRIS</h2><p>QRIS hanya tersedia saat nama merchant dan gambar sudah disimpan.</p></div></div>
                <div className={styles.cardBody}>
                  {field("qris_merchant_name", "Nama Merchant")}
                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label htmlFor="payment-qris-description">Deskripsi (opsional)</label>
                    <textarea id="payment-qris-description" rows={3} value={values.qris_description ?? ""} onChange={(event) => setField("qris_description", event.target.value)} disabled={saving} />
                  </div>
                  <div className={`${styles.qrisUpload} ${styles.fullWidth}`}>
                    <div className={styles.qrisPreview}>
                      {qrisPreviewUrl ? <Image src={qrisPreviewUrl} alt="Pratinjau QRIS" width={280} height={280} /> : <div><i className="ri-qr-code-line" aria-hidden="true" /><span>Belum ada gambar QRIS</span></div>}
                    </div>
                    <div className={styles.uploadControls}>
                      <label htmlFor="payment-qris-image" className={styles.uploadButton}>Pilih Gambar QRIS</label>
                      <input id="payment-qris-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectQrisImage} disabled={saving} />
                      <small>JPG, PNG, atau WEBP. Maksimal 5 MB.</small>
                      {saving && qrisFile && <div className={styles.progress}><span style={{ width: `${uploadProgress}%` }} /></div>}
                      {qrisPreviewUrl && <button type="button" className={styles.removeButton} onClick={removeQrisImage} disabled={saving}>Hapus Gambar</button>}
                    </div>
                  </div>
                </div>
              </section>
              <section className={styles.card}>
                <div className={styles.cardHeader}><i className="ri-wallet-3-line" aria-hidden="true" /><div><h2>DANA</h2><p>Tujuan pembayaran DANA manual yang ditampilkan kepada pelanggan.</p></div></div>
                <div className={styles.cardBody}>{field("dana_account_name", "Nama Akun")}{field("dana_number", "Nomor DANA", "numeric")}</div>
              </section>
              <section className={styles.card}>
                <div className={styles.cardHeader}><i className="ri-bank-line" aria-hidden="true" /><div><h2>Transfer Bank</h2><p>Rekening yang ditampilkan pada halaman pembayaran pelanggan.</p></div></div>
                <div className={styles.cardBody}>{field("bank_name", "Nama Bank")}{field("bank_account_holder", "Nama Pemilik Rekening")}{field("bank_account_number", "Nomor Rekening", "numeric")}</div>
              </section>
              <section className={styles.card}>
                <div className={styles.cardHeader}><i className="ri-truck-line" aria-hidden="true" /><div><h2>Pengiriman</h2><p>Biaya tetap yang diterapkan database saat checkout.</p></div></div>
                <div className={styles.cardBody}>{field("shipping_cost", "Biaya Pengiriman", "numeric")}</div>
              </section>
              <div className={styles.actions}><button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Pengaturan Pembayaran"}</button></div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AdminPaymentSettingsPage() {
  return <RequireAdminAuth><PaymentSettingsContent /></RequireAdminAuth>;
}
