import { z } from "zod"

const envSchema = z.object({
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  PORT: z.coerce.number().default(3001),
})

export const env = envSchema.parse(process.env)

const supabaseEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

export function getRequiredSupabaseEnv() {
  return supabaseEnvSchema.parse(process.env)
}
