import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";
import { safeNextPath } from "@/lib/customer-auth";

export const metadata: Metadata = { title: "Customer Login" };

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const initialError = resolvedSearchParams.error
    ? "Your authentication link is invalid or has expired. Please try again."
    : null;
  return <LoginForm nextPath={safeNextPath(resolvedSearchParams.next ?? null)} initialError={initialError} />;
}
