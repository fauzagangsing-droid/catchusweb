"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ShippingAddress } from "@/types/database";
import type { RegionLevel, RegionOption } from "@/types/shipping";
import styles from "./Checkout.module.css";

interface AddressManagerProps {
  addresses: ShippingAddress[];
  selectedAddressId: string;
  initialRecipientName: string;
  disabled: boolean;
  onSelect: (addressId: string) => void;
  onAddressesChange: (addresses: ShippingAddress[], preferredId?: string) => void;
}

type AddressForm = {
  recipient_name: string;
  phone: string;
  label: "home" | "office" | "other";
  province_code: string;
  city_code: string;
  district_code: string;
  village_code: string;
  postal_code: string;
  full_address: string;
  is_default: boolean;
};

const LABELS = { home: "Rumah", office: "Kantor", other: "Lainnya" } as const;
const regionRequests = new Map<string, Promise<RegionOption[]>>();

function regionEndpoint(level: RegionLevel, parentCode?: string): string {
  if (level === "province") return "/api/regions/provinces";
  if (level === "city") {
    return `/api/regions/cities?province_code=${encodeURIComponent(parentCode ?? "")}`;
  }
  if (level === "district") {
    return `/api/regions/districts?city_code=${encodeURIComponent(parentCode ?? "")}`;
  }
  return `/api/regions/villages?district_code=${encodeURIComponent(parentCode ?? "")}`;
}

async function loadRegions(level: RegionLevel, parentCode?: string): Promise<RegionOption[]> {
  const key = `${level}:${parentCode ?? "root"}`;
  const existing = regionRequests.get(key);
  if (existing) return existing;
  const request = fetch(regionEndpoint(level, parentCode))
    .then(async (response) => {
      const result = (await response.json()) as {
        data?: RegionOption[];
        regions?: RegionOption[];
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "Wilayah tidak dapat dimuat.");
      return result.data ?? result.regions ?? [];
    })
    .catch((error) => {
      regionRequests.delete(key);
      throw error;
    });
  regionRequests.set(key, request);
  return request;
}

async function reloadAddresses(): Promise<ShippingAddress[]> {
  const response = await fetch("/api/shipping/addresses", { cache: "no-store" });
  const result = (await response.json()) as { addresses?: ShippingAddress[]; error?: string };
  if (!response.ok) throw new Error(result.error ?? "Alamat tidak dapat dimuat.");
  return result.addresses ?? [];
}

function emptyForm(initialRecipientName: string): AddressForm {
  return {
    recipient_name: initialRecipientName,
    phone: "",
    label: "home",
    province_code: "",
    city_code: "",
    district_code: "",
    village_code: "",
    postal_code: "",
    full_address: "",
    is_default: false,
  };
}

export default function AddressManager({
  addresses,
  selectedAddressId,
  initialRecipientName,
  disabled,
  onSelect,
  onAddressesChange,
}: AddressManagerProps) {
  const [formOpen, setFormOpen] = useState(addresses.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressForm>(() => emptyForm(initialRecipientName));
  const [provinces, setProvinces] = useState<RegionOption[]>([]);
  const [cities, setCities] = useState<RegionOption[]>([]);
  const [districts, setDistricts] = useState<RegionOption[]>([]);
  const [villages, setVillages] = useState<RegionOption[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regionRetryKey, setRegionRetryKey] = useState(0);

  useEffect(() => {
    if (!formOpen || provinces.length > 0) return;
    let active = true;
    setLoadingRegions(true);
    setError(null);
    loadRegions("province")
      .then((nextProvinces) => {
        if (active) setProvinces(nextProvinces);
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Provinsi tidak dapat dimuat."
          );
        }
      })
      .finally(() => {
        if (active) setLoadingRegions(false);
      });
    return () => {
      active = false;
    };
  }, [formOpen, provinces.length, regionRetryKey]);

  async function openNewAddress() {
    setEditingId(null);
    setForm(emptyForm(initialRecipientName));
    setCities([]);
    setDistricts([]);
    setVillages([]);
    setFormOpen(true);
    setError(null);
  }

  async function openEditAddress(address: ShippingAddress) {
    setEditingId(address.id);
    setForm({
      recipient_name: address.recipient_name,
      phone: address.phone,
      label: address.label,
      province_code: address.province_code,
      city_code: address.city_code,
      district_code: address.district_code,
      village_code: address.village_code,
      postal_code: address.postal_code,
      full_address: address.full_address,
      is_default: address.is_default,
    });
    setFormOpen(true);
    setError(null);
    setLoadingRegions(true);
    try {
      const [nextProvinces, nextCities, nextDistricts, nextVillages] = await Promise.all([
        loadRegions("province"),
        loadRegions("city", address.province_code),
        loadRegions("district", address.city_code),
        loadRegions("village", address.district_code),
      ]);
      setProvinces(nextProvinces);
      setCities(nextCities);
      setDistricts(nextDistricts);
      setVillages(nextVillages);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Wilayah tidak dapat dimuat.");
    } finally {
      setLoadingRegions(false);
    }
  }

  async function selectProvince(code: string) {
    setError(null);
    setForm((current) => ({
      ...current,
      province_code: code,
      city_code: "",
      district_code: "",
      village_code: "",
    }));
    setCities([]);
    setDistricts([]);
    setVillages([]);
    if (!code) return;
    setLoadingRegions(true);
    try {
      setCities(await loadRegions("city", code));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Kota tidak dapat dimuat.");
    } finally {
      setLoadingRegions(false);
    }
  }

  async function selectCity(code: string) {
    setError(null);
    setForm((current) => ({
      ...current,
      city_code: code,
      district_code: "",
      village_code: "",
    }));
    setDistricts([]);
    setVillages([]);
    if (!code) return;
    setLoadingRegions(true);
    try {
      setDistricts(await loadRegions("district", code));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Kecamatan tidak dapat dimuat.");
    } finally {
      setLoadingRegions(false);
    }
  }

  async function selectDistrict(code: string) {
    setError(null);
    setForm((current) => ({ ...current, district_code: code, village_code: "" }));
    setVillages([]);
    if (!code) return;
    setLoadingRegions(true);
    try {
      setVillages(await loadRegions("village", code));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Kelurahan tidak dapat dimuat.");
    } finally {
      setLoadingRegions(false);
    }
  }

  function selectVillage(code: string) {
    setError(null);
    setForm((current) => ({ ...current, village_code: code }));
  }

  async function submitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.province_code || !form.city_code || !form.district_code || !form.village_code) {
      setError("Pilih provinsi, kota, kecamatan, dan kelurahan.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const endpoint = editingId
        ? `/api/shipping/addresses/${encodeURIComponent(editingId)}`
        : "/api/shipping/addresses";
      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { address?: ShippingAddress; error?: string };
      if (!response.ok || !result.address) {
        throw new Error(result.error ?? "Alamat tidak dapat disimpan.");
      }
      const nextAddresses = await reloadAddresses();
      onAddressesChange(nextAddresses, result.address.id);
      setFormOpen(false);
      setEditingId(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Alamat tidak dapat disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAddress(address: ShippingAddress) {
    if (!window.confirm(`Hapus alamat ${LABELS[address.label]} ini?`)) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/shipping/addresses/${encodeURIComponent(address.id)}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Alamat tidak dapat dihapus.");
      onAddressesChange(await reloadAddresses());
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Alamat tidak dapat dihapus.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.addressManager}>
      {addresses.length > 0 && (
        <div className={styles.addressList}>
          {addresses.map((address) => (
            <label
              className={`${styles.addressCard} ${selectedAddressId === address.id ? styles.addressSelected : ""}`}
              key={address.id}
            >
              <input
                type="radio"
                name="shippingAddress"
                checked={selectedAddressId === address.id}
                onChange={() => onSelect(address.id)}
                disabled={disabled || saving}
              />
              <span className={styles.addressContent}>
                <span className={styles.addressTopline}>
                  <strong>{LABELS[address.label]}</strong>
                  {address.is_default && <small>Utama</small>}
                </span>
                <b>{address.recipient_name} · {address.phone}</b>
                <span>{address.full_address}</span>
                <span>
                  {address.village_name}, {address.district_name}, {address.city_name}, {address.province_name} {address.postal_code}
                </span>
                <code>village_code: {address.village_code}</code>
              </span>
              <span className={styles.addressActions}>
                <button type="button" onClick={() => void openEditAddress(address)} disabled={disabled || saving}>Ubah</button>
                <button type="button" onClick={() => void deleteAddress(address)} disabled={disabled || saving}>Hapus</button>
              </span>
            </label>
          ))}
        </div>
      )}

      {!formOpen && (
        <button className={styles.addAddressButton} type="button" onClick={() => void openNewAddress()} disabled={disabled}>
          <i className="ri-add-line" aria-hidden="true" /> Tambah Alamat
        </button>
      )}

      {formOpen && (
        <form className={styles.addressForm} onSubmit={submitAddress} noValidate>
          <div className={styles.addressFormHeader}>
            <strong>{editingId ? "Ubah Alamat" : "Alamat Baru"}</strong>
            {addresses.length > 0 && (
              <button type="button" onClick={() => setFormOpen(false)} disabled={saving}>Batal</button>
            )}
          </div>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="address-recipient">Nama Penerima</label>
              <input id="address-recipient" value={form.recipient_name} onChange={(event) => setForm((current) => ({ ...current, recipient_name: event.target.value }))} disabled={saving} required />
            </div>
            <div className={styles.field}>
              <label htmlFor="address-phone">Nomor Telepon</label>
              <input id="address-phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} inputMode="tel" disabled={saving} required />
            </div>
          </div>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="address-province">Provinsi</label>
              <select id="address-province" value={form.province_code} onChange={(event) => void selectProvince(event.target.value)} disabled={saving || loadingRegions} required>
                <option value="">Pilih provinsi</option>
                {provinces.map((region) => <option key={region.code} value={region.code}>{region.name}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="address-city">Kota / Kabupaten</label>
              <select id="address-city" value={form.city_code} onChange={(event) => void selectCity(event.target.value)} disabled={saving || loadingRegions || !form.province_code} required>
                <option value="">Pilih kota / kabupaten</option>
                {cities.map((region) => <option key={region.code} value={region.code}>{region.name}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="address-district">Kecamatan</label>
              <select id="address-district" value={form.district_code} onChange={(event) => void selectDistrict(event.target.value)} disabled={saving || loadingRegions || !form.city_code} required>
                <option value="">Pilih kecamatan</option>
                {districts.map((region) => <option key={region.code} value={region.code}>{region.name}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="address-village">Kelurahan / Desa</label>
              <select id="address-village" value={form.village_code} onChange={(event) => selectVillage(event.target.value)} disabled={saving || loadingRegions || !form.district_code} required>
                <option value="">Pilih kelurahan / desa</option>
                {villages.map((region) => (
                  <option key={region.code} value={region.code} disabled={region.isCourierSupported === false}>
                    {region.name}{region.isCourierSupported === false ? " (kurir belum tersedia)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="address-postal">Kode Pos</label>
              <input id="address-postal" value={form.postal_code} onChange={(event) => setForm((current) => ({ ...current, postal_code: event.target.value }))} inputMode="numeric" disabled={saving} required />
            </div>
            <div className={styles.field}>
              <label htmlFor="address-label">Label Alamat</label>
              <select id="address-label" value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value as AddressForm["label"] }))} disabled={saving}>
                <option value="home">Rumah</option>
                <option value="office">Kantor</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="address-full">Alamat Lengkap</label>
            <textarea id="address-full" rows={3} value={form.full_address} onChange={(event) => setForm((current) => ({ ...current, full_address: event.target.value }))} disabled={saving} required />
          </div>
          <label className={styles.defaultCheck}>
            <input type="checkbox" checked={form.is_default} onChange={(event) => setForm((current) => ({ ...current, is_default: event.target.checked }))} disabled={saving} />
            Jadikan alamat utama
          </label>
          {loadingRegions && <p className={styles.inlineStatus}>Memuat data wilayah...</p>}
          {error && <p className={styles.inlineError} role="alert">{error}</p>}
          {error && provinces.length === 0 && (
            <button
              className={styles.addAddressButton}
              type="button"
              onClick={() => setRegionRetryKey((key) => key + 1)}
              disabled={loadingRegions}
            >
              Coba Muat Provinsi Lagi
            </button>
          )}
          <button className={styles.saveAddressButton} type="submit" disabled={saving || loadingRegions}>
            {saving ? "Menyimpan..." : "Simpan Alamat"}
          </button>
        </form>
      )}
      {!formOpen && error && <p className={styles.inlineError} role="alert">{error}</p>}
    </div>
  );
}
