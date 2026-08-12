import type { Metadata } from "next";
import { cookies } from "next/headers";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/supabase/customer-cookie";

export const metadata: Metadata = { title: "Reset Password" };

interface ResetPasswordPageProps { searchParams: Promise<{ error?: string }>; }
export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const [cookieStore, resolvedSearchParams] = await Promise.all([
    cookies(),
    searchParams,
  ]);
  const recoveryAllowed = cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value === "1";
  return <ResetPasswordForm callbackError={Boolean(resolvedSearchParams.error) || !recoveryAllowed} />;
}
