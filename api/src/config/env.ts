import { z } from "zod"

const envSchema = z.object({
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SERPER_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
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

const serperEnvSchema = z.object({
  SERPER_API_KEY: z.string().min(1),
})

export function getRequiredSerperEnv() {
  return serperEnvSchema.parse(process.env)
}

const anthropicEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
})

export function getRequiredAnthropicEnv() {
  return anthropicEnvSchema.parse(process.env)
}

const cronEnvSchema = z.object({
  CRON_SECRET: z.string().min(1),
})

export function getRequiredCronEnv() {
  return cronEnvSchema.parse(process.env)
}
