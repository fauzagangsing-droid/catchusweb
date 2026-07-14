"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase-browser";

/**
 * Wrap any /admin page with this to require a signed-in session.
 *
 * - While the session is being checked, shows a minimal loading state.
 * - If there is no session, redirects to /admin/login.
 * - If there is a session, renders the protected children.
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
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      if (!data.session) {
        router.replace("/admin/login");
      }
    });

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) return;
        setSession(nextSession);
        if (!nextSession) {
          router.replace("/admin/login");
        }
      }
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (session === undefined) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#666" }}>
        Checking session...
      </div>
    );
  }

  if (!session) {
    // Redirect already triggered above; render nothing while it happens.
    return null;
  }

  return <>{children}</>;
}
