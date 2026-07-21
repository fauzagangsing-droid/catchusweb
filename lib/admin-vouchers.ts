"use client";

import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Voucher, VoucherInsert, VoucherUpdate } from "@/types/database";

export async function getAdminVouchers() {
  const { data, error } = await supabaseBrowser.from("vouchers").select("*").order("created_at", { ascending: false });
  return { data: data ?? [], error: error?.message ?? null } as { data: Voucher[]; error: string | null };
}
export async function createVoucher(input: VoucherInsert) {
  const { data, error } = await supabaseBrowser.from("vouchers").insert(input).select("*").single();
  return { data, error: error?.message ?? null };
}
export async function updateVoucher(id: string, input: VoucherUpdate) {
  const { data, error } = await supabaseBrowser.from("vouchers").update(input).eq("id", id).select("*").single();
  return { data, error: error?.message ?? null };
}
export async function deleteVoucher(id: string) {
  const { error } = await supabaseBrowser.from("vouchers").delete().eq("id", id);
  return { error: error?.message ?? null };
}
