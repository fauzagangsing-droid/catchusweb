"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getAdminPaymentProofUrl } from "@/lib/admin-orders";
import styles from "./AdminPaymentProof.module.css";

export default function AdminPaymentProof({ orderId, notes, uploadedAt }: { orderId:string; notes:string|null; uploadedAt:string|null }) {
  const [url,setUrl]=useState<string|null>(null),[loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;getAdminPaymentProofUrl(orderId).then(value=>{if(active)setUrl(value)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[orderId]);
  return <section className={styles.section}><h3>Bukti Pembayaran</h3>{loading?<p>Memuat bukti...</p>:url?<a href={url} target="_blank" rel="noreferrer"><div className={styles.image}><Image src={url} alt="Bukti pembayaran pelanggan" fill unoptimized sizes="360px"/></div></a>:<p>Bukti pembayaran belum tersedia.</p>}{notes&&<p><strong>Catatan:</strong> {notes}</p>}{uploadedAt&&<small>Diunggah {new Date(uploadedAt).toLocaleString("id-ID")}</small>}</section>
}
