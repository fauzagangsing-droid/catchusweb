"use client";

import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Banner, BannerInsert, BannerUpdate } from "@/types/database";

export interface AdminBannerResult<T> {
  data: T | null;
  error: string | null;
}

function toFriendlyError(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "You don't have permission to manage banners. Please sign in again.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Couldn't reach the server. Please check your connection and try again.";
  }
  if (message.includes("relation") && message.includes("banners")) {
    return "Banner management is not installed in Supabase yet. Run banner_management.sql first.";
  }
  return "Something went wrong. Please try again.";
}

export async function getAdminBanners(): Promise<AdminBannerResult<Banner[]>> {
  const { data, error } = await supabaseBrowser
    .from("banners")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { data: null, error: toFriendlyError(error.message) };
  return { data: data ?? [], error: null };
}

export async function createBanner(
  input: BannerInsert
): Promise<AdminBannerResult<Banner>> {
  const { data, error } = await supabaseBrowser
    .from("banners")
    .insert(input)
    .select("*")
    .single();

  if (error) return { data: null, error: toFriendlyError(error.message) };
  return { data, error: null };
}

export async function updateBanner(
  id: string,
  input: BannerUpdate
): Promise<AdminBannerResult<Banner>> {
  const { data, error } = await supabaseBrowser
    .from("banners")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { data: null, error: toFriendlyError(error.message) };
  return { data, error: null };
}

export async function setBannerActive(
  id: string,
  isActive: boolean
): Promise<AdminBannerResult<true>> {
  const { error } = await supabaseBrowser
    .from("banners")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { data: null, error: toFriendlyError(error.message) };
  return { data: true, error: null };
}

export async function deleteBanner(id: string): Promise<AdminBannerResult<true>> {
  const { error } = await supabaseBrowser.from("banners").delete().eq("id", id);

  if (error) return { data: null, error: toFriendlyError(error.message) };
  return { data: true, error: null };
}
