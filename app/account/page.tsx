import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountContent from "@/components/account/AccountContent";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { getWebsiteSettings } from "@/lib/queries";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";
import { DEFAULT_WEBSITE_SETTINGS } from "@/lib/website-settings";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
};

interface AccountPageProps { searchParams: Promise<{ verified?: string }>; }

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createCustomerServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect("/login?next=/account");

  const [profileResult, settingsResult] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle(),
    getWebsiteSettings(),
  ]);
  const settings = settingsResult.data ?? DEFAULT_WEBSITE_SETTINGS;
  const email = user.email ?? "Email unavailable";

  return (
    <div className="account-page">
      <Navbar brandName={settings.brand_name} logoUrl={settings.logo_url} />
      <AccountContent
        userId={user.id}
        email={email}
        initialFullName={profileResult.data?.full_name ?? (typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : null)}
        initialAvatarUrl={profileResult.data?.avatar_url ?? null}
        verified={resolvedSearchParams.verified === "1"}
      />
      <Footer settings={settings} />
    </div>
  );
}
