import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import CartProvider from "@/components/cart/CartProvider";
import { getWebsiteSettings } from "@/lib/queries";
import { getSiteUrl } from "@/lib/seo";
import { DEFAULT_WEBSITE_SETTINGS } from "@/lib/website-settings";

const DEFAULT_FAVICON_URL = "/icons/logo.png";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

export async function generateMetadata(): Promise<Metadata> {
  const result = await getWebsiteSettings();
  const settings = result.data ?? DEFAULT_WEBSITE_SETTINGS;
  const faviconUrl = settings.favicon_url?.trim() || DEFAULT_FAVICON_URL;

  return {
    metadataBase: new URL(getSiteUrl()),
    title: settings.website_title,
    description: settings.website_description,
    applicationName: settings.brand_name,
    icons: {
      icon: [{ url: faviconUrl }],
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        {/* Remix Icon - kept as CDN link, exactly as in the original site */}
        <link
          href="https://cdn.jsdelivr.net/npm/remixicon@4.7.0/fonts/remixicon.css"
          rel="stylesheet"
        />
      </head>
      <body
        id="beranda"
        className={`${plusJakartaSans.variable} ${plusJakartaSans.className}`}
      >
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
