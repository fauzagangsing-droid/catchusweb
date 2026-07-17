import type { Metadata } from "next";
import { cookies } from "next/headers";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/supabase/customer-cookie";

export const metadata: Metadata = { title: "Reset Password" };

interface ResetPasswordPageProps { searchParams: { error?: string }; }
export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const recoveryAllowed = cookies().get(PASSWORD_RECOVERY_COOKIE)?.value === "1";
  return <ResetPasswordForm callbackError={Boolean(searchParams.error) || !recoveryAllowed} />;
}
