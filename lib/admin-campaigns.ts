"use client";

import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Campaign, CampaignInsert, CampaignUpdate } from "@/types/database";

export interface AdminCampaignResult<T> {
  data: T | null;
  error: string | null;
}

function toFriendlyError(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "You don't have permission to manage campaigns. Please sign in again.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Couldn't reach the server. Please check your connection and try again.";
  }
  if (message.includes("relation") && message.includes("campaigns")) {
    return "Campaign management is not installed in Supabase yet. Run campaign_management.sql first.";
  }
  return "Something went wrong. Please try again.";
}

export async function getAdminCampaigns(): Promise<AdminCampaignResult<Campaign[]>> {
  const { data, error } = await supabaseBrowser
    .from("campaigns")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { data: null, error: toFriendlyError(error.message) };
  return { data: data ?? [], error: null };
}

export async function createCampaign(
  input: CampaignInsert
): Promise<AdminCampaignResult<Campaign>> {
  const { data, error } = await supabaseBrowser
    .from("campaigns")
    .insert(input)
    .select("*")
    .single();

  if (error) return { data: null, error: toFriendlyError(error.message) };
  return { data, error: null };
}

export async function updateCampaign(
  id: string,
  input: CampaignUpdate
): Promise<AdminCampaignResult<Campaign>> {
  const { data, error } = await supabaseBrowser
    .from("campaigns")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { data: null, error: toFriendlyError(error.message) };
  return { data, error: null };
}

export async function setCampaignActive(
  id: string,
  isActive: boolean
): Promise<AdminCampaignResult<true>> {
  const { error } = await supabaseBrowser
    .from("campaigns")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { data: null, error: toFriendlyError(error.message) };
  return { data: true, error: null };
}

export async function deleteCampaign(id: string): Promise<AdminCampaignResult<true>> {
  const { error } = await supabaseBrowser.from("campaigns").delete().eq("id", id);

  if (error) return { data: null, error: toFriendlyError(error.message) };
  return { data: true, error: null };
}
