import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { getRequiredSupabaseEnv } from "../config/env.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDatabase = any

let client: SupabaseClient<AnyDatabase> | null = null

function getSupabaseAdmin(): SupabaseClient<AnyDatabase> {
  if (client) return client

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getRequiredSupabaseEnv()
  client = createClient<AnyDatabase>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  return client
}

type TypedSupabaseClient = SupabaseClient<AnyDatabase>
type SupabaseAdminWrapper = {
  auth: Pick<TypedSupabaseClient["auth"], "getUser">
  from: TypedSupabaseClient["from"]
}

// Lazy wrapper: exposes only methods used in this project without proxy traps.
export const supabaseAdmin: SupabaseAdminWrapper = {
  get auth() {
    return getSupabaseAdmin().auth
  },
  from: (...args: Parameters<TypedSupabaseClient["from"]>) =>
    getSupabaseAdmin().from(...args),
}
