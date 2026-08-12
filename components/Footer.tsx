import type { WebsiteSettings } from "@/types/database";
import { safeNavigationHref } from "@/lib/safe-url";

interface FooterProps { settings: WebsiteSettings; }

function whatsappHref(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://wa.me/${value.replace(/\D/g, "")}`;
}

export default function Footer({ settings }: FooterProps) {
  const links = [
    settings.whatsapp && { href: whatsappHref(settings.whatsapp), label: "WhatsApp", icon: "ri-whatsapp-fill" },
    settings.email && { href: `mailto:${settings.email}`, label: "Email", icon: "ri-mail-fill" },
    settings.instagram_url && { href: settings.instagram_url, label: "Instagram", icon: "ri-instagram-fill" },
    settings.tiktok_url && { href: settings.tiktok_url, label: "TikTok", icon: "ri-tiktok-fill" },
    settings.facebook_url && { href: settings.facebook_url, label: "Facebook", icon: "ri-facebook-circle-fill" },
    settings.shopee_url && { href: settings.shopee_url, label: "Shopee", icon: "ri-shopping-bag-3-fill" },
    settings.tokopedia_url && { href: settings.tokopedia_url, label: "Tokopedia", icon: "ri-store-2-fill" },
    settings.tiktok_shop_url && { href: settings.tiktok_shop_url, label: "TikTok Shop", icon: "ri-shopping-cart-2-fill" },
  ].flatMap((link) => {
    if (!link) return [];
    const href = link.href.startsWith("mailto:")
      ? (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(link.href) ? link.href : null)
      : safeNavigationHref(link.href);
    return href ? [{ ...link, href }] : [];
  });

  return (
    <div className="footer" id="kontak">
      <div className="box">
        <p>{settings.copyright_text}</p>
      </div>
      <div className="box">
        {links.map((link) => (
          <a key={`${link.label}-${link.href}`} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label} title={link.label}>
            <i className={`${link.icon} ri-2x`}></i>
          </a>
        ))}
      </div>
    </div>
  );
}
