"use client";

import { useState } from "react";
import styles from "./QrisDownloadButton.module.css";

export default function QrisDownloadButton({ imageUrl }: { imageUrl: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadQris() {
    setDownloading(true);
    setError(null);

    try {
      const response = await fetch(imageUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("download_failed");

      const blob = await response.blob();
      const extension = blob.type === "image/png"
        ? "png"
        : blob.type === "image/webp"
          ? "webp"
          : "jpg";
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `QRIS-Catchus.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError("QRIS tidak dapat diunduh. Silakan coba lagi.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <button type="button" onClick={downloadQris} disabled={downloading}>
        <i className="ri-download-2-line" aria-hidden="true" />
        {downloading ? "Mengunduh..." : "Unduh QRIS"}
      </button>
      {error && <span role="alert">{error}</span>}
    </div>
  );
}
