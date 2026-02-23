import { createClient } from "@supabase/supabase-js"
import { getRequiredSupabaseEnv } from "../config/env.js"

let client: ReturnType<typeof createClient> | null = null

function getSupabaseAdmin() {
  if (client) return client

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getRequiredSupabaseEnv()
  client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  return client
}

type SupabaseClient = ReturnType<typeof createClient>
type SupabaseAdmin = {
  auth: Pick<SupabaseClient["auth"], "getUser">
  from: SupabaseClient["from"]
}

// Lazy wrapper: exposes only methods used in this project without proxy traps.
export const supabaseAdmin: SupabaseAdmin = {
  get auth() {
    return getSupabaseAdmin().auth
  },
  from: (...args: Parameters<SupabaseClient["from"]>) =>
    getSupabaseAdmin().from(...args),
}
