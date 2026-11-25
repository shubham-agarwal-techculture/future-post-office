import { createClient } from "@supabase/supabase-js";
import { assertServiceRole, getServerEnv } from "@/lib/env";

/** Service-role client — server only. Never import from client components. */
export function createAdminClient() {
  const env = getServerEnv();
  const serviceKey = assertServiceRole();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
