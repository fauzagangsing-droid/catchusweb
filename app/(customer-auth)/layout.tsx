import type { Metadata } from "next";
import AuthLayout from "@/components/auth/AuthLayout";
import { getWebsiteSettings } from "@/lib/queries";
import { DEFAULT_WEBSITE_SETTINGS } from "@/lib/website-settings";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CustomerAuthLayout({ children }: { children: React.ReactNode }) {
  const settingsResult = await getWebsiteSettings();
  const settings = settingsResult.data ?? DEFAULT_WEBSITE_SETTINGS;
  return <AuthLayout brandName={settings.brand_name}>{children}</AuthLayout>;
}
