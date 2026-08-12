/** Returns only navigation URLs that cannot execute script in an href. */
export function safeNavigationHref(value: string | null | undefined): string | null {
  const href = value?.trim();
  if (!href) return null;
  if (/^\/(?!\/)/.test(href) || href.startsWith("#")) return href;

  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:" ? href : null;
  } catch {
    return null;
  }
}

export function isExternalNavigationHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
