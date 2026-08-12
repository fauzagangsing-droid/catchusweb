import { redirect } from "next/navigation";
import CustomerOrders from "@/components/orders/CustomerOrders";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { getCustomerOrders } from "@/lib/orders";
import { getWebsiteSettings } from "@/lib/queries";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";
import { DEFAULT_WEBSITE_SETTINGS } from "@/lib/website-settings";

export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage() {
  const supabase = await createCustomerServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (!user || userError) redirect("/login?next=/account/orders");

  const [ordersResult, settingsResult] = await Promise.all([
    getCustomerOrders(supabase),
    getWebsiteSettings(),
  ]);
  const settings = settingsResult.data ?? DEFAULT_WEBSITE_SETTINGS;

  return (
    <div>
      <Navbar brandName={settings.brand_name} logoUrl={settings.logo_url} />
      <CustomerOrders orders={ordersResult.data} error={ordersResult.error} />
      <Footer settings={settings} />
    </div>
  );
}
