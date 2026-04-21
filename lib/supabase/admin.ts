import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cached: SupabaseClient | null = null

/**
 * Server-only Supabase client that uses the service role key.
 *
 * The Skydrive Panel talks to Supabase from Next.js API routes that are
 * called by:
 *  - the admin panel UI (no user session: panel is protected by X-Skydrive-Key)
 *  - the Roblox game server (HttpService, same X-Skydrive-Key header)
 *
 * There is no Supabase Auth session in either case, so we use the service
 * role key and do our own auth in `lib/auth.ts`.
 */
export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    )
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
