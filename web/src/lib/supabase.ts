/**
 * Supabase Client Setup
 *
 * This file creates a connection to your Supabase project.
 * Supabase is a backend service that handles user authentication (login),
 * database, and more — so you don't have to build those yourself.
 *
 * The URL and KEY come from environment variables (the .env file).
 * These are safe to expose in the browser — the "anon key" only allows
 * actions that your Supabase security rules permit.
 */

import { createClient } from "@supabase/supabase-js"

// Read config from environment variables (defined in .env file)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Show a helpful error if the developer forgot to set up their .env file
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Copy .env.example to .env and fill in your Supabase project URL and anon key. " +
      "See .env.example for instructions."
  )
}

/**
 * The Supabase client — use this to talk to Supabase from anywhere in the app.
 * It handles authentication, database queries, and more.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
