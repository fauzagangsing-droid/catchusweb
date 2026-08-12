import { redirect } from "next/navigation";
import CheckoutClient from "@/components/checkout/CheckoutClient";
import { getPaymentSettings } from "@/lib/payment-settings";
import { getWebsiteSettings } from "@/lib/queries";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";
import { DEFAULT_WEBSITE_SETTINGS } from "@/lib/website-settings";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const supabase = await createCustomerServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (!user || userError) redirect("/login?next=/checkout");

  const [profileResult, paymentResult, settingsResult, addressesResult] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    getPaymentSettings(supabase),
    getWebsiteSettings(),
    supabase
      .from("shipping_addresses")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),
  ]);
  const settings = settingsResult.data ?? DEFAULT_WEBSITE_SETTINGS;

  return (
    <CheckoutClient
      brandName={settings.brand_name}
      email={user.email ?? ""}
      initialFullName={
        profileResult.data?.full_name ??
        (typeof user.user_metadata.full_name === "string"
          ? user.user_metadata.full_name
          : "")
      }
      paymentSettings={paymentResult.data}
      initialAddresses={addressesResult.data ?? []}
    />
  );
}
