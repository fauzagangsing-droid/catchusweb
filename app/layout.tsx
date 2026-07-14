import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import AosInit from "@/components/AosInit";

// Original site loaded Poppins 400/500/600/700 from Google Fonts via <link> tags.
// next/font/google fetches + self-hosts the same weights with zero visual difference
// and no layout shift, while removing the external network request.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Catchus Official",
  icons: {
    icon: "/icons/nm.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Remix Icon - kept as CDN link, exactly as in the original site */}
        <link
          href="https://cdn.jsdelivr.net/npm/remixicon@4.7.0/fonts/remixicon.css"
          rel="stylesheet"
        />
        {/* AOS styles - kept as CDN link, exactly as in the original site */}
        <link rel="stylesheet" href="https://unpkg.com/aos@next/dist/aos.css" />
      </head>
      <body id="beranda" className={poppins.className}>
        {children}
        {/* Replaces the inline <script>AOS.init()</script> from index.html */}
        <AosInit />
      </body>
    </html>
  );
}
