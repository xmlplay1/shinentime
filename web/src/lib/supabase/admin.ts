import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client for API routes.
 * Prefer SUPABASE_SERVICE_ROLE_KEY in production so inserts bypass RLS safely from the server.
 * Falls back to anon key if service role is not set (requires permissive RLS on `jobs`).
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
