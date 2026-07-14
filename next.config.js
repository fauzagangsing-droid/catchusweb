// Product images are served from the Supabase Storage public bucket
// (product-images), so next/image needs that host allow-listed. Derived from
// NEXT_PUBLIC_SUPABASE_URL so this works against any Supabase project
// without hardcoding a project ref; falls back to the general *.supabase.co
// pattern if the env var isn't set at config-eval time.
function getSupabaseImageRemotePattern() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    try {
      const { hostname } = new URL(url);
      return { protocol: "https", hostname, pathname: "/storage/v1/object/public/**" };
    } catch {
      // fall through to the default pattern below
    }
  }
  return { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" };
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [getSupabaseImageRemotePattern()],
  },
};

module.exports = nextConfig;
