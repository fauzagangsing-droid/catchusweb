"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createCustomerBrowserClient } from "@/lib/supabase/customer-browser";

interface CustomerNavState {
  user: User;
  fullName: string | null;
  avatarUrl: string | null;
}

export default function CustomerAuthNav() {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerNavState | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createCustomerBrowserClient();
    let active = true;

    async function loadCustomer(user: User | null) {
      if (!active) return;
      if (!user) {
        setCustomer(null);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (active) {
        setCustomer({
          user,
          fullName: profile?.full_name ?? null,
          avatarUrl: profile?.avatar_url ?? null,
        });
      }
    }

    supabase.auth.getUser().then(({ data }) => loadCustomer(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => loadCustomer(session?.user ?? null), 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    const supabase = createCustomerBrowserClient();
    await supabase.auth.signOut();
    setCustomer(null);
    router.replace("/");
    router.refresh();
  }

  if (customer === undefined) {
    return <li className="customer-auth-nav"><span className="customer-auth-placeholder" aria-hidden="true" /></li>;
  }

  if (!customer) {
    return (
      <li className="customer-auth-nav">
        <Link href="/login" className="customer-login-link">Login</Link>
        <Link href="/register" className="customer-register-link">Register</Link>
      </li>
    );
  }

  const label = customer.fullName || customer.user.email || "My Account";
  return (
    <li className="customer-auth-nav customer-authenticated">
      <Link href="/account" className="customer-account-link" title={label}>
        <span className="customer-avatar">
          {customer.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={customer.avatarUrl} alt={`${label} avatar`} />
          ) : (
            <i className="ri-user-3-line" aria-hidden="true" />
          )}
        </span>
        My Account
      </Link>
      <button type="button" className="customer-logout" onClick={logout}>Logout</button>
    </li>
  );
}
