import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client for API routes.
 * Prefer SUPABASE_SERVICE_ROLE_KEY in production so inserts bypass RLS safely from the server.
 * Falls back to anon key if service role is not set (requires permissive RLS on `jobs`).
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tjqbvafjhtwlujreluxr.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_p8c1CjfR13s_Ba7E6f3G2g_nga15FHa";
  const key = serviceKey || anonKey;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/** Strict server client for admin surfaces: requires service-role style key. */
export function createServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tjqbvafjhtwlujreluxr.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
