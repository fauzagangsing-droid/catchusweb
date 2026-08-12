"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

/**
 * Renders nothing. Drop this into the login page so an already-authenticated
 * admin visiting /admin/login is sent straight to /admin/dashboard, without
 * touching the login page's markup or styles.
 */
export default function RedirectIfAuthenticated() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    supabaseBrowser.auth.getSession().then(async ({ data }) => {
      if (!isMounted || !data.session) return;

      const { data: isAdmin, error } = await supabaseBrowser.rpc("is_admin");
      if (!isMounted) return;
      if (!error && isAdmin === true) {
        router.replace("/admin/dashboard");
      } else if (!error) {
        await supabaseBrowser.auth.signOut();
      }
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  return null;
}
