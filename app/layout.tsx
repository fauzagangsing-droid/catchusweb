import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import AosInit from "@/components/AosInit";
import CartProvider from "@/components/cart/CartProvider";
import { getWebsiteSettings } from "@/lib/queries";
import { getSiteUrl } from "@/lib/seo";
import { DEFAULT_WEBSITE_SETTINGS } from "@/lib/website-settings";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

export async function generateMetadata(): Promise<Metadata> {
  const result = await getWebsiteSettings();
  const settings = result.data ?? DEFAULT_WEBSITE_SETTINGS;
  return {
    metadataBase: new URL(getSiteUrl()),
    title: settings.website_title,
    description: settings.website_description,
    applicationName: settings.brand_name,
    icons: settings.favicon_url ? { icon: settings.favicon_url } : undefined,
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
        {/* AOS styles - kept as CDN link, exactly as in the original site */}
        <link rel="stylesheet" href="https://unpkg.com/aos@next/dist/aos.css" />
      </head>
      <body
        id="beranda"
        className={`${plusJakartaSans.variable} ${plusJakartaSans.className}`}
      >
        <CartProvider>{children}</CartProvider>
        {/* Replaces the inline <script>AOS.init()</script> from index.html */}
        <AosInit />
      </body>
    </html>
  );
}
