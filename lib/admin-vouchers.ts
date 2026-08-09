"use client";

import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Voucher, VoucherInsert, VoucherUpdate } from "@/types/database";

interface VoucherListResult {
  data: Voucher[];
  error: string | null;
}

interface VoucherMutationResult {
  data: Voucher | null;
  error: string | null;
}

interface VoucherDeleteResult {
  error: string | null;
}

export async function getAdminVouchers(): Promise<VoucherListResult> {
  const { data, error } = await supabaseBrowser
    .from("vouchers")
    .select("*")
    .order("created_at", { ascending: false });

  return { data: data ?? [], error: error?.message ?? null };
}

export async function createVoucher(
  input: VoucherInsert
): Promise<VoucherMutationResult> {
  const { data, error } = await supabaseBrowser
    .from("vouchers")
    .insert(input)
    .select("*")
    .single();

  return { data, error: error?.message ?? null };
}

export async function updateVoucher(
  id: string,
  input: VoucherUpdate
): Promise<VoucherMutationResult> {
  const { data, error } = await supabaseBrowser
    .from("vouchers")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  return { data, error: error?.message ?? null };
}

export async function deleteVoucher(id: string): Promise<VoucherDeleteResult> {
  const { error } = await supabaseBrowser.from("vouchers").delete().eq("id", id);
  return { error: error?.message ?? null };
}
