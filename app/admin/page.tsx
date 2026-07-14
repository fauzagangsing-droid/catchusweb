"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAdminAuth from "@/components/admin/RequireAdminAuth";

function ForwardToDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);

  return null;
}

/**
 * /admin has no UI of its own — it requires auth (via RequireAdminAuth,
 * which sends unauthenticated visitors to /admin/login) and then forwards
 * authenticated visitors on to /admin/dashboard.
 */
export default function AdminIndexPage() {
  return (
    <RequireAdminAuth>
      <ForwardToDashboard />
    </RequireAdminAuth>
  );
}
