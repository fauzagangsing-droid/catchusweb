"use client";

import { useState, type FormEvent } from "react";
import { createShippingWhatsAppUrl } from "@/lib/whatsapp";
import type { OrderWithItems, ShippingStatus } from "@/types/database";
import { SHIPPING_STATUS_LABELS, getCourierName } from "@/types/order";
import styles from "./OrderShippingSection.module.css";

interface OrderShippingSectionProps {
  order: OrderWithItems;
  saving: boolean;
  onSave: (trackingNumber: string, shippingStatus: ShippingStatus) => Promise<void>;
}

export default function OrderShippingSection({
  order,
  saving,
  onSave,
}: OrderShippingSectionProps) {
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? "");
  const [shippingStatus, setShippingStatus] = useState(order.shipping_status);
  const [validationError, setValidationError] = useState<string | null>(null);
  const whatsappUrl = createShippingWhatsAppUrl(order);

  if (!order.courier_code && !order.shipping_courier) return null;

  async function submitShipping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTrackingNumber = trackingNumber.trim();
    if (["shipped", "delivered"].includes(shippingStatus) && !normalizedTrackingNumber) {
      setValidationError("Nomor resi wajib diisi untuk status ini.");
      return;
    }
    setValidationError(null);
    await onSave(normalizedTrackingNumber, shippingStatus);
  }

  return (
    <section className={styles.section} aria-labelledby={`shipping-${order.id}`}>
      <div className={styles.header}>
        <i className="ri-truck-line" aria-hidden="true" />
        <div>
          <h3 id={`shipping-${order.id}`}>Pengiriman</h3>
          <p>Kurir dan tarif adalah snapshot checkout dan tidak dapat diubah.</p>
        </div>
      </div>

      <div className={styles.savedDetails}>
        <dl>
          <div><dt>Kurir</dt><dd>{getCourierName(order)}</dd></div>
          <div><dt>Biaya</dt><dd>Rp{Number(order.shipping_cost).toLocaleString("id-ID")}</dd></div>
          <div><dt>Estimasi</dt><dd>{order.shipping_estimation ?? "Tidak tersedia"}</dd></div>
          <div><dt>Berat</dt><dd>{order.shipping_weight ?? "-"} kg</dd></div>
          <div><dt>Village Code</dt><dd>{order.destination_village_code ?? "-"}</dd></div>
        </dl>
      </div>

      <form className={styles.form} onSubmit={submitShipping} noValidate>
        <div className={styles.readOnlyField}>
          <span>Kurir</span>
          <strong>{getCourierName(order)}</strong>
          <small>Dipilih pelanggan · tidak dapat diubah</small>
        </div>
        <div className={styles.field}>
          <label htmlFor={`tracking-${order.id}`}>Nomor Resi</label>
          <input
            id={`tracking-${order.id}`}
            value={trackingNumber}
            onChange={(event) => {
              setTrackingNumber(event.target.value);
              setValidationError(null);
            }}
            placeholder="Masukkan nomor resi"
            disabled={saving}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`shipping-status-${order.id}`}>Status Pengiriman</label>
          <select
            id={`shipping-status-${order.id}`}
            value={shippingStatus}
            onChange={(event) => setShippingStatus(event.target.value as ShippingStatus)}
            disabled={saving}
          >
            {Object.entries(SHIPPING_STATUS_LABELS).map(([value, label]) => (
              <option value={value} key={value}>{label}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Pengiriman"}
        </button>
        {validationError && <p role="alert">{validationError}</p>}
      </form>

      {whatsappUrl && (
        <div className={styles.savedDetails}>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <i className="ri-whatsapp-line" aria-hidden="true" />
            Kirim via WhatsApp
          </a>
        </div>
      )}
    </section>
  );
}
