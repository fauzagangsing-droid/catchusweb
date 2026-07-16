import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WebsiteSettings,
  WebsiteSettingsUpdate,
} from "@/types/database";

export interface WebsiteSettingsResult {
  data: WebsiteSettings | null;
  error: string | null;
}

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  id: 1,
  brand_name: "Catchus",
  website_title: "Catchus Official",
  website_description:
    "Catchus menghadirkan koleksi apparel dengan desain khas dan kualitas terbaik.",
  logo_url: null,
  favicon_url: "/icons/nm.png",
  hero_title: "Catchus Katalog",
  hero_subtitle:
    "Catchus menghadirkan koleksi apparel dengan desain khas dan kualitas terbaik. Setiap produk diproduksi dengan bahan pilihan serta perhatian tinggi pada detail, sehingga memberikan kenyamanan dan daya tahan lebih lama. Kami percaya bahwa fashion bukan hanya tentang pakaian, tetapi tentang bagaimana kamu mengekspresikan diri. Temukan koleksi Catchus yang sesuai dengan gaya.",
  hero_button_text: "Detail Produk",
  hero_button_url: "#produk",
  whatsapp: "https://wa.me/6283865961290",
  email: null,
  instagram_url: "https://www.instagram.com/catchus.club/",
  tiktok_url: null,
  facebook_url: null,
  shopee_url: "https://shopee.co.id/catchus.official",
  tokopedia_url: null,
  tiktok_shop_url: null,
  copyright_text: "© Copyrights 2024 by Catchus Official",
  updated_at: "",
};

export async function getWebsiteSettings(
  client: SupabaseClient<Database>
): Promise<WebsiteSettingsResult> {
  const { data, error } = await client
    .from("website_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updateWebsiteSettings(
  client: SupabaseClient<Database>,
  values: WebsiteSettingsUpdate
): Promise<WebsiteSettingsResult> {
  const { data, error } = await client
    .from("website_settings")
    .upsert({ id: 1, ...values }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}
