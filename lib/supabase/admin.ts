import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Admin client — bypasses RLS, server-side only, never expose to browser
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}
