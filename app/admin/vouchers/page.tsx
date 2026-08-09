"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import RequireAdminAuth from "@/components/admin/RequireAdminAuth";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import {
  createVoucher,
  deleteVoucher,
  getAdminVouchers,
  updateVoucher,
} from "@/lib/admin-vouchers";
import type { Voucher, VoucherType } from "@/types/database";
import styles from "./vouchers.module.css";

type FormState = {
  code: string;
  type: VoucherType;
  value: string;
  minimum_purchase: string;
  maximum_discount: string;
  usage_limit: string;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  code: "",
  type: "percentage",
  value: "",
  minimum_purchase: "0",
  maximum_discount: "",
  usage_limit: "",
  starts_at: "",
  expires_at: "",
  is_active: true,
};

function dateInput(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}

function VouchersContent() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAdminVouchers();
    setVouchers(result.data);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  function startEdit(voucher?: Voucher) {
    setEditing(voucher ?? null);
    setForm(
      voucher
        ? {
            code: voucher.code,
            type: voucher.type,
            value: String(voucher.value),
            minimum_purchase: String(voucher.minimum_purchase),
            maximum_discount:
              voucher.maximum_discount == null
                ? ""
                : String(voucher.maximum_discount),
            usage_limit:
              voucher.usage_limit == null ? "" : String(voucher.usage_limit),
            starts_at: dateInput(voucher.starts_at),
            expires_at: dateInput(voucher.expires_at),
            is_active: voucher.is_active,
          }
        : EMPTY
    );
    setOpen(true);
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      minimum_purchase: Number(form.minimum_purchase),
      maximum_discount: form.maximum_discount
        ? Number(form.maximum_discount)
        : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      starts_at: form.starts_at
        ? new Date(form.starts_at).toISOString()
        : null,
      expires_at: form.expires_at
        ? new Date(form.expires_at).toISOString()
        : null,
      is_active: form.is_active,
    };
    if (!payload.code || payload.value <= 0 || payload.minimum_purchase < 0) {
      setError("Lengkapi data voucher dengan benar.");
      setSaving(false);
      return;
    }
    const result = editing
      ? await updateVoucher(editing.id, payload)
      : await createVoucher(payload);
    if (result.error) {
      setError(result.error);
    } else {
      setOpen(false);
      notify(editing ? "Voucher diperbarui." : "Voucher dibuat.");
      await load();
    }
    setSaving(false);
  }

  async function remove(voucher: Voucher) {
    if (!window.confirm(`Hapus voucher ${voucher.code}?`)) return;
    const result = await deleteVoucher(voucher.id);
    if (result.error) setError(result.error);
    else {
      notify("Voucher dihapus.");
      await load();
    }
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className={styles.shell}>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className={styles.main}>
        <Topbar title="Voucher" onOpenMobile={() => setMobileOpen(true)} />
        <main className={styles.content}>
          <div className={styles.toolbar}>
            <div>
              <h1>Voucher</h1>
              <p>Kelola kode promo checkout.</p>
            </div>
            <button onClick={() => startEdit()}>Tambah Voucher</button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {loading ? (
            <div className={styles.state}>Memuat voucher...</div>
          ) : (
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Tipe</th>
                    <th>Nilai</th>
                    <th>Minimum</th>
                    <th>Penggunaan</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <strong>{v.code}</strong>
                      </td>
                      <td>{v.type}</td>
                      <td>
                        {v.type === "percentage"
                          ? `${v.value}%`
                          : `Rp ${v.value.toLocaleString("id-ID")}`}
                      </td>
                      <td>
                        Rp {v.minimum_purchase.toLocaleString("id-ID")}
                      </td>
                      <td>
                        {v.used_count}/{v.usage_limit ?? "∞"}
                      </td>
                      <td>{v.is_active ? "Aktif" : "Nonaktif"}</td>
                      <td>
                        <button onClick={() => startEdit(v)}>Edit</button>
                        <button
                          className={styles.danger}
                          onClick={() => void remove(v)}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {open && (
            <div className={styles.overlay}>
              <form className={styles.modal} onSubmit={submit}>
                <h2>{editing ? "Edit Voucher" : "Tambah Voucher"}</h2>
                <div className={styles.grid}>
                  <label>
                    Kode
                    <input
                      value={form.code}
                      onChange={(e) =>
                        set("code", e.target.value.toUpperCase())
                      }
                      required
                    />
                  </label>
                  <label>
                    Tipe
                    <select
                      value={form.type}
                      onChange={(e) =>
                        set("type", e.target.value as VoucherType)
                      }
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </label>
                  <label>
                    Nilai
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.value}
                      onChange={(e) => set("value", e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Minimum Pembelian
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.minimum_purchase}
                      onChange={(e) =>
                        set("minimum_purchase", e.target.value)
                      }
                      required
                    />
                  </label>
                  <label>
                    Maksimum Diskon
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.maximum_discount}
                      onChange={(e) =>
                        set("maximum_discount", e.target.value)
                      }
                    />
                  </label>
                  <label>
                    Usage Limit
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.usage_limit}
                      onChange={(e) => set("usage_limit", e.target.value)}
                    />
                  </label>
                  <label>
                    Mulai
                    <input
                      type="datetime-local"
                      value={form.starts_at}
                      onChange={(e) => set("starts_at", e.target.value)}
                    />
                  </label>
                  <label>
                    Berakhir
                    <input
                      type="datetime-local"
                      value={form.expires_at}
                      onChange={(e) => set("expires_at", e.target.value)}
                    />
                  </label>
                </div>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => set("is_active", e.target.checked)}
                  />{" "}
                  Aktif
                </label>
                <div className={styles.actions}>
                  <button type="button" onClick={() => setOpen(false)}>
                    Batal
                  </button>
                  <button type="submit" disabled={saving}>
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {toast && <div className={styles.toast}>{toast}</div>}
        </main>
      </div>
    </div>
  );
}

export default function VouchersPage() {
  return (
    <RequireAdminAuth>
      <VouchersContent />
    </RequireAdminAuth>
  );
}
