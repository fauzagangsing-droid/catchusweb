import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Customer-management-only access to Supabase Auth Admin and user storage. */
export function createCustomerAdminClient() {
  return createServiceRoleClient();
}
