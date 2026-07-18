import { redirect } from "next/navigation";
import CartPageClient from "@/components/cart/CartPageClient";
import { getWebsiteSettings } from "@/lib/queries";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";
import { DEFAULT_WEBSITE_SETTINGS } from "@/lib/website-settings";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const supabase = createCustomerServerClient();
  const [
    {
      data: { user },
    },
    settingsResult,
  ] = await Promise.all([supabase.auth.getUser(), getWebsiteSettings()]);

  if (!user) redirect("/login?next=/cart");

  const settings = settingsResult.data ?? DEFAULT_WEBSITE_SETTINGS;

  return <CartPageClient brandName={settings.brand_name} />;
}
