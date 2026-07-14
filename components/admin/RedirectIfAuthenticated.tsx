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

    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (isMounted && data.session) {
        router.replace("/admin/dashboard");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  return null;
}
