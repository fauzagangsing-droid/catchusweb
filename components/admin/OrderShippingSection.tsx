"use client";

import { useState, type FormEvent } from "react";
import { createShippingWhatsAppUrl } from "@/lib/whatsapp";
import type { OrderWithItems } from "@/types/database";
import { ORDER_STATUS_LABELS, SHIPPING_COURIER_LABELS } from "@/types/order";
import styles from "./OrderShippingSection.module.css";

interface OrderShippingSectionProps {
  order: OrderWithItems;
  saving: boolean;
  onSave: (trackingNumber: string) => Promise<void>;
}

export default function OrderShippingSection({
  order,
  saving,
  onSave,
}: OrderShippingSectionProps) {
  const [trackingNumber, setTrackingNumber] = useState(
    order.tracking_number ?? ""
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const hasShipping = Boolean(order.shipping_courier && order.tracking_number);
  const whatsappUrl = createShippingWhatsAppUrl(order);

  if (!order.shipping_courier && order.order_status !== "processing") return null;

  async function submitShipping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTrackingNumber = trackingNumber.trim();
    if (!order.shipping_courier) {
      setValidationError("Kurir belum dipilih oleh pelanggan.");
      return;
    }
    if (!normalizedTrackingNumber) {
      setValidationError("Nomor resi wajib diisi.");
      return;
    }

    setValidationError(null);
    await onSave(normalizedTrackingNumber);
  }

  return (
    <section className={styles.section} aria-labelledby={`shipping-${order.id}`}>
      <div className={styles.header}>
        <i className="ri-truck-line" aria-hidden="true" />
        <div>
          <h3 id={`shipping-${order.id}`}>Pengiriman</h3>
          <p>Tambahkan nomor resi dan kirim pemberitahuan kepada pelanggan.</p>
        </div>
      </div>

      {hasShipping && order.shipping_courier && order.tracking_number ? (
        <div className={styles.savedDetails}>
          <dl>
            <div><dt>Kurir</dt><dd>{SHIPPING_COURIER_LABELS[order.shipping_courier]}</dd></div>
            <div><dt>Nomor Resi</dt><dd>{order.tracking_number}</dd></div>
            <div><dt>Status</dt><dd>{ORDER_STATUS_LABELS[order.order_status]}</dd></div>
          </dl>
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <i className="ri-whatsapp-line" aria-hidden="true" />
              Kirim via WhatsApp
            </a>
          )}
        </div>
      ) : order.order_status === "processing" ? (
        <form className={styles.form} onSubmit={submitShipping} noValidate>
          <div className={styles.readOnlyField}>
            <span>Kurir</span>
            <strong>
              {order.shipping_courier
                ? SHIPPING_COURIER_LABELS[order.shipping_courier]
                : "Belum dipilih"}
            </strong>
            <small>Dipilih oleh pelanggan</small>
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
              required
            />
          </div>
          <button type="submit" disabled={saving || !order.shipping_courier}>
            {saving ? "Menyimpan..." : "Simpan Pengiriman"}
          </button>
          {validationError && <p role="alert">{validationError}</p>}
        </form>
      ) : (
        <div className={styles.savedDetails}>
          <dl>
            <div>
              <dt>Kurir</dt>
              <dd>
                {order.shipping_courier
                  ? SHIPPING_COURIER_LABELS[order.shipping_courier]
                  : "Belum dipilih"}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
