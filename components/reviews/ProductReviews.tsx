"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import styles from "./ProductReviews.module.css";

type ReviewItem = { id: string; rating: number; review: string; created_at: string; reviewerName: string; isOwn: boolean };
type ReviewResponse = { averageRating: number; reviewCount: number; canReview: boolean; reviews: ReviewItem[]; error?: string };

export default function ProductReviews({ productId }: { productId: string }) {
  const [data, setData] = useState<ReviewResponse>({ averageRating: 0, reviewCount: 0, canReview: false, reviews: [] });
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}/reviews?sort=${sort}`, { cache: "no-store" });
      const result = (await response.json()) as ReviewResponse;
      if (!response.ok) throw new Error(result.error ?? "Review tidak dapat dimuat.");
      setData(result);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Review tidak dapat dimuat."); }
    finally { setLoading(false); }
  }, [productId, sort]);
  useEffect(() => { void load(); }, [load]);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(null), 3000); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    const endpoint = editingId ? `/api/reviews/${editingId}` : `/api/products/${productId}/reviews`;
    try {
      const response = await fetch(endpoint, { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, review, images: [] }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Review tidak dapat disimpan.");
      setReview(""); setRating(5); setEditingId(null); notify("Review berhasil disimpan."); await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Review tidak dapat disimpan."); }
    finally { setSaving(false); }
  }
  async function remove(id: string) {
    if (!window.confirm("Hapus review ini?")) return;
    setSaving(true); const response = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    if (response.ok) { notify("Review berhasil dihapus."); await load(); } else setError("Review tidak dapat dihapus.");
    setSaving(false);
  }

  const ownReview = data.reviews.find((item) => item.isOwn);
  const showForm = data.canReview || Boolean(editingId);
  return (
    <section className={styles.section} id="reviews">
      <div className={styles.header}><div><span>Customer Reviews</span><h2>{"★".repeat(Math.round(data.averageRating))}{"☆".repeat(5 - Math.round(data.averageRating))}</h2><p>{data.averageRating.toFixed(1)} ({data.reviewCount} Reviews)</p></div><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="highest">Highest</option><option value="lowest">Lowest</option></select></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {showForm && <form className={styles.form} onSubmit={submit}><h3>{editingId ? "Edit Review" : "Write a Review"}</h3><div className={styles.stars}>{[1,2,3,4,5].map((value) => <button type="button" key={value} onClick={() => setRating(value)} aria-label={`${value} stars`}>{value <= rating ? "★" : "☆"}</button>)}</div><textarea value={review} onChange={(event) => setReview(event.target.value)} minLength={3} maxLength={2000} required rows={4} placeholder="Bagikan pengalaman Anda..." /><button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Review"}</button></form>}
      {!showForm && !ownReview && <p className={styles.eligibility}>Hanya pembeli terverifikasi yang dapat memberi review.</p>}
      {loading ? <div className={styles.loading}>Memuat review...</div> : <div className={styles.list}>{data.reviews.length === 0 ? <p>Belum ada review.</p> : data.reviews.map((item) => <article key={item.id}><div><strong>{item.reviewerName}</strong><span>{"★".repeat(item.rating)}{"☆".repeat(5-item.rating)}</span></div><p>{item.review}</p><small>{new Date(item.created_at).toLocaleDateString("id-ID")}</small>{item.isOwn && <div className={styles.actions}><button type="button" onClick={() => { setEditingId(item.id); setRating(item.rating); setReview(item.review); }}>Edit</button><button type="button" onClick={() => void remove(item.id)} disabled={saving}>Delete</button></div>}</article>)}</div>}
      {toast && <div className={styles.toast} role="status">{toast}</div>}
    </section>
  );
}
