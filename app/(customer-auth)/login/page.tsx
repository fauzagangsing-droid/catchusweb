import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";
import { safeNextPath } from "@/lib/customer-auth";

export const metadata: Metadata = { title: "Customer Login" };

interface LoginPageProps {
  searchParams: { next?: string; error?: string };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const initialError = searchParams.error
    ? "Your authentication link is invalid or has expired. Please try again."
    : null;
  return <LoginForm nextPath={safeNextPath(searchParams.next ?? null)} initialError={initialError} />;
}
