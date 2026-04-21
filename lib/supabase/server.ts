import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Client Supabase cote serveur - utilise la cle service_role pour bypass RLS.
// Ne JAMAIS importer ce fichier depuis un composant client.

declare global {
   
  var __skydriveSupabase: SupabaseClient | undefined
}

function buildClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      "Supabase non configure : definissez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY",
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function getSupabase(): SupabaseClient {
  if (!globalThis.__skydriveSupabase) {
    globalThis.__skydriveSupabase = buildClient()
  }
  return globalThis.__skydriveSupabase
}
