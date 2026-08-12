"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase-browser";

/**
 * Wrap any /admin page with this to require an authorized admin session.
 *
 * - While the session is being checked, shows a minimal loading state.
 * - If there is no session, redirects to /admin/login.
 * - If the session is not an admin, signs it out and redirects.
 * - Only renders children after the database-backed admin check succeeds.
 *
 * This is a client-side check (no middleware/edge protection in this
 * project yet), so it runs after the page loads in the browser rather than
 * before the response is sent.
 */
export default function RequireAdminAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    let verificationId = 0;

    const verifyAdmin = async (session: Session | null) => {
      const currentVerification = ++verificationId;
      if (!session) {
        if (!isMounted || currentVerification !== verificationId) return;
        setAuthorized(false);
        router.replace("/admin/login");
        return;
      }

      const { data: isAdmin, error } = await supabaseBrowser.rpc("is_admin");
      if (!isMounted || currentVerification !== verificationId) return;

      if (!error && isAdmin === true) {
        setAuthorized(true);
        return;
      }

      setAuthorized(false);
      if (!error && isAdmin !== true) {
        await supabaseBrowser.auth.signOut();
      }
      if (isMounted) router.replace("/admin/login");
    };

    void supabaseBrowser.auth.getSession().then(({ data }) => {
      if (isMounted) void verifyAdmin(data.session);
    });

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) return;
        setAuthorized(undefined);
        window.setTimeout(() => {
          if (isMounted) void verifyAdmin(nextSession);
        }, 0);
      }
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (authorized === undefined) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#666" }}>
        Checking session...
      </div>
    );
  }

  if (!authorized) {
    // Redirect already triggered above; render nothing while it happens.
    return null;
  }

  return <>{children}</>;
}
