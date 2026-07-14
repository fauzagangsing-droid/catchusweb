"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RequireAdminAuth from "@/components/admin/RequireAdminAuth";
import { supabaseBrowser } from "@/lib/supabase-browser";

/**
 * Placeholder only. The real dashboard UI is a separate, later task — this
 * page exists just so the auth flow (protected route + redirect target +
 * sign out) is fully testable end to end.
 */
function DashboardPlaceholder() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await supabaseBrowser.auth.signOut();
    router.replace("/admin/login");
  };

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Admin Dashboard</h1>
      <p>You are signed in. The dashboard UI itself hasn&apos;t been built yet.</p>
      <button onClick={handleSignOut} disabled={isSigningOut}>
        {isSigningOut ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <RequireAdminAuth>
      <DashboardPlaceholder />
    </RequireAdminAuth>
  );
}
