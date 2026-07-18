import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  PaymentSettings,
  PaymentSettingsUpdate,
} from "@/types/database";

export interface PaymentSettingsResult {
  data: PaymentSettings | null;
  error: string | null;
}

export async function getPaymentSettings(
  client: SupabaseClient<Database>
): Promise<PaymentSettingsResult> {
  const { data, error } = await client
    .from("payment_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updatePaymentSettings(
  client: SupabaseClient<Database>,
  values: PaymentSettingsUpdate
): Promise<PaymentSettingsResult> {
  const { data, error } = await client
    .from("payment_settings")
    .upsert({ id: 1, ...values }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export function isDanaConfigured(settings: PaymentSettings): boolean {
  return Boolean(settings.dana_account_name && settings.dana_number);
}

export function isQrisConfigured(settings: PaymentSettings): boolean {
  return Boolean(settings.qris_merchant_name && settings.qris_image_url);
}

export function isBankTransferConfigured(settings: PaymentSettings): boolean {
  return Boolean(
    settings.bank_name &&
      settings.bank_account_holder &&
      settings.bank_account_number
  );
}
