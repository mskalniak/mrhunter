# Cauliflower Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a LinkedIn lead generation system that finds high-intent B2B leads via Serper.dev Google Search, scores them with Claude AI, and presents them in a ranked dashboard.

**Architecture:** Serper.dev searches Google's index of LinkedIn content using targeted dork queries generated from a user's natural-language ICP. Results are stored as signals in Supabase, scored/deduplicated by Claude Haiku, and displayed in a React dashboard. Vercel Cron runs daily searches; users can also trigger manually.

**Tech Stack:** React 19 + Vite + TanStack Query + Radix UI + Tailwind (frontend), Express 5 + TypeScript (API), Supabase PostgreSQL + Auth (DB), Serper.dev (search), Anthropic Claude API (ICP parsing + lead scoring), Vercel Cron (scheduling).

---

### Task 1: Delete habit tracker and notes features

Remove all old feature code. Keep auth, layouts, shared infrastructure.

**Files to delete:**
- `web/src/features/habits/` (entire directory)
- `web/src/features/notes/` (entire directory)
- `web/src/lib/mock-api.ts`
- `api/src/routes/habits.ts`
- `api/src/services/habits.service.ts`
- `api/supabase/migrations/001_habits_schema.sql`
- `packages/shared/src/types/habits.ts`
- `packages/shared/src/hooks/habits/` (entire directory)
- `packages/shared/src/constants/colors.ts`

**Files to modify:**

**`web/src/routes.tsx`** — Remove habit/notes imports and routes:
```typescript
import { Route, Routes, Navigate } from "react-router-dom"
import { AppLayout } from "@/layouts/app-layout"
import { LoginPage, AuthGuard } from "@/features/auth"
import { useAuth } from "@/features/auth"

function LoginRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <LoginPage />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<div>Dashboard coming soon</div>} />
        </Route>
      </Route>
    </Routes>
  )
}
```

**`web/src/config/navigation.ts`** — Clear old nav items:
```typescript
export type NavItem = {
  label: string
  path: string
}

export const navigationItems: NavItem[] = [
  { label: "Dashboard", path: "/" },
]
```

**`api/src/index.ts`** — Remove habits router:
```typescript
import express from "express"
import cors from "cors"
import { errorHandler } from "./middleware/error-handler.js"

export const app = express()

app.use(cors())
app.use(express.json())

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

app.get("/api/health", (_req, res) => {
  res.json({ ok: true })
})

app.use(errorHandler)

if (process.env.VERCEL !== "1") {
  const port = Number(process.env.PORT ?? 3001)
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`)
  })
}

export default app
```

**`packages/shared/src/index.ts`** — Remove habit exports, keep auth:
```typescript
// Types
export type { AuthState } from "./types"

// API
export { configureApi } from "./api"

// Lib
export { createQueryClient } from "./lib"

// Hooks
export {
  AuthProvider,
  useAuth,
  useLogin,
  useVerifyOtp,
  useLogout,
} from "./hooks"
```

**`packages/shared/src/types/index.ts`** — Remove habit types:
```typescript
export type { AuthState } from "./auth"
```

**`packages/shared/src/hooks/index.ts`** — Remove habit hook exports (keep auth hooks only).

**`packages/shared/src/api/client.ts`** — Remove `habitApi`, keep `configureApi` and create a generic `apiClient`:
```typescript
let getApiUrl: () => string = () => {
  throw new Error("API not configured. Call configureApi() at app startup.")
}
let getAuthToken: () => Promise<string | null> = async () => null

export function configureApi(config: {
  apiUrl: string | (() => string)
  authToken: () => Promise<string | null>
}) {
  const { apiUrl } = config
  getApiUrl = typeof apiUrl === "string" ? () => apiUrl : apiUrl
  getAuthToken = config.authToken
}

export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken()

  const res = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `API error: ${res.status}`)
  }

  return res.json()
}
```

**`packages/shared/src/api/index.ts`** — Update exports:
```typescript
export { configureApi, apiClient } from "./client"
```

**`web/src/app.tsx`** — Remove `habitApi` import, update `configureApi` import:
```typescript
import { QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { queryClient } from "@/lib/query-client"
import { AuthProvider } from "@/features/auth"
import { configureApi } from "@solomakers/shared"
import { supabase } from "@/lib/supabase"
import { AppRoutes } from "@/routes"

function getApiUrl() {
  const configured = import.meta.env.VITE_API_URL
  if (configured) return configured
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3001`
  }
  return "http://localhost:3001"
}

configureApi({
  apiUrl: getApiUrl,
  authToken: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider supabase={supabase}>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

**`web/src/layouts/app-layout.tsx`** — Rebrand to Cauliflower, remove habit-specific bottom nav. Will be fully redesigned in Task 9, but for now make it compile:
```typescript
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { LogOut, LayoutGrid, Settings } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/features/auth"
import { useLogout } from "@/features/auth"

export function AppLayout() {
  const { user } = useAuth()
  const logout = useLogout()
  const location = useLocation()
  const navigate = useNavigate()

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        navigate("/login")
        toast.success("Signed out")
      },
      onError: () => {
        toast.error("Failed to sign out")
      },
    })
  }

  const initial = user?.email?.charAt(0).toUpperCase() || "?"
  const displayEmail = user?.email || "User"

  return (
    <div className="app-shell">
      <div className="app-bg">
        <div className="app-blob app-blob-1" />
        <div className="app-blob app-blob-2" />
        <div className="app-blob app-blob-3" />
      </div>

      <header className="app-navbar-wrapper">
        <nav className="app-navbar">
          <Link to="/" className="app-brand-group">
            <div className="app-brand-text">
              <span className="app-brand-name">Cauliflower</span>
              <span className="app-brand-sub">Lead Intelligence</span>
            </div>
          </Link>

          <div className="app-navbar-right">
            <button
              className="app-icon-btn"
              onClick={handleLogout}
              disabled={logout.isPending}
              title="Sign out"
            >
              <LogOut size={16} />
            </button>

            <div className="app-user-pill">
              <div className="app-avatar">{initial}</div>
              <span className="app-user-name">{displayEmail}</span>
            </div>
          </div>
        </nav>
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <nav className="app-bottom-nav">
        <div className="app-bottom-bar">
          <Link
            to="/"
            className={`app-bottom-btn ${location.pathname === "/" ? "app-bottom-btn-active" : ""}`}
          >
            <LayoutGrid size={22} />
          </Link>
          <Link
            to="/settings"
            className={`app-bottom-btn ${location.pathname === "/settings" ? "app-bottom-btn-active" : ""}`}
          >
            <Settings size={22} />
          </Link>
        </div>
      </nav>
    </div>
  )
}
```

**Step 1:** Delete all files listed above.

**Step 2:** Apply all file modifications listed above.

**Step 3:** Verify the app compiles:
```bash
cd /Users/mskalniak001/Documents/mrhunter/web && npm run build
cd /Users/mskalniak001/Documents/mrhunter/api && npm run build
```

**Step 4:** Commit:
```bash
git add -A && git commit -m "chore: remove habit tracker and notes features, rebrand to Cauliflower"
```

---

### Task 2: Install new dependencies

**Files:**
- Modify: `api/package.json`
- Modify: `api/src/config/env.ts`

**Step 1:** Install API dependencies:
```bash
cd /Users/mskalniak001/Documents/mrhunter/api && npm install @anthropic-ai/sdk
```

Note: Serper.dev uses a simple REST API — no SDK needed, just `fetch`.

**Step 2:** Update `api/src/config/env.ts` to include new env vars:
```typescript
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
```

**Step 3:** Update `api/.env.example`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SERPER_API_KEY=your-serper-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
CRON_SECRET=your-cron-secret
PORT=3001
```

**Step 4:** Update `api/.env` with the same new keys (empty values for user to fill).

**Step 5:** Commit:
```bash
git add -A && git commit -m "feat: add Serper.dev and Anthropic API dependencies and env config"
```

---

### Task 3: Create Supabase database migration

**Files:**
- Create: `api/supabase/migrations/002_cauliflower_schema.sql`

**Step 1:** Write the migration:
```sql
-- Cauliflower Lead Generation Schema

-- ICP Profiles: user's ideal customer profile configuration
CREATE TABLE icp_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_prompt TEXT NOT NULL,
  parsed_config JSONB NOT NULL DEFAULT '{}',
  search_queries JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_icp_profiles_user_id ON icp_profiles(user_id);

-- Search Runs: tracks each search execution
CREATE TABLE search_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  icp_profile_id UUID NOT NULL REFERENCES icp_profiles(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('cron', 'manual')),
  queries_used INTEGER NOT NULL DEFAULT 0,
  signals_found INTEGER NOT NULL DEFAULT 0,
  leads_created INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_search_runs_user_id ON search_runs(user_id);

-- Signals: raw search results from Serper.dev
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  icp_profile_id UUID NOT NULL REFERENCES icp_profiles(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('hiring', 'pain_point', 'competitor_engagement', 'funding', 'role_change', 'event')),
  title TEXT NOT NULL,
  snippet TEXT NOT NULL DEFAULT '',
  raw_data JSONB NOT NULL DEFAULT '{}',
  search_batch_id UUID REFERENCES search_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_signals_user_id ON signals(user_id);
CREATE INDEX idx_signals_batch_id ON signals(search_batch_id);

-- Leads: scored and deduplicated leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linkedin_url TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  headline TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  intent_score INTEGER NOT NULL DEFAULT 0 CHECK (intent_score >= 0 AND intent_score <= 100),
  intent_summary TEXT NOT NULL DEFAULT '',
  signal_types TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'saved', 'dismissed')),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, linkedin_url)
);

CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_score ON leads(user_id, intent_score DESC);
CREATE INDEX idx_leads_status ON leads(user_id, status);

-- Lead Signals: junction table linking leads to their source signals
CREATE TABLE lead_signals (
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, signal_id)
);

-- Row Level Security
ALTER TABLE icp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own data
CREATE POLICY "Users can manage own ICP profiles"
  ON icp_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own search runs"
  ON search_runs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own signals"
  ON signals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own leads"
  ON leads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own lead signals"
  ON lead_signals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_signals.lead_id
      AND leads.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_signals.lead_id
      AND leads.user_id = auth.uid()
    )
  );

-- Service role bypass for API server (uses service role key)
-- The API server uses supabaseAdmin with service role key, which bypasses RLS.
-- RLS policies above protect direct client access only.
```

**Step 2:** Commit:
```bash
git add -A && git commit -m "feat: add Cauliflower database schema migration"
```

**Step 3:** Run migration in Supabase Dashboard (SQL Editor) or via CLI. This is a manual step — document it in the commit message.

---

### Task 4: Build shared types for Cauliflower

**Files:**
- Create: `packages/shared/src/types/leads.ts`
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/index.ts`

**Step 1:** Create `packages/shared/src/types/leads.ts`:
```typescript
export type SignalType =
  | "hiring"
  | "pain_point"
  | "competitor_engagement"
  | "funding"
  | "role_change"
  | "event"

export type LeadStatus = "new" | "viewed" | "saved" | "dismissed"

export type IcpProfile = {
  id: string
  user_id: string
  raw_prompt: string
  parsed_config: ParsedIcpConfig
  search_queries: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ParsedIcpConfig = {
  titles: string[]
  industries: string[]
  keywords: string[]
  competitors: string[]
  company_size?: string
  location?: string
}

export type Signal = {
  id: string
  source_url: string
  signal_type: SignalType
  title: string
  snippet: string
  created_at: string
}

export type Lead = {
  id: string
  linkedin_url: string
  name: string
  headline: string
  company: string
  intent_score: number
  intent_summary: string
  signal_types: SignalType[]
  status: LeadStatus
  first_seen_at: string
  last_seen_at: string
  signals?: Signal[]
}

export type LeadsResponse = {
  leads: Lead[]
  total: number
  page: number
  per_page: number
}

export type LeadDetailResponse = Lead & {
  signals: Signal[]
}

export type SearchRun = {
  id: string
  trigger_type: "cron" | "manual"
  queries_used: number
  signals_found: number
  leads_created: number
  status: "running" | "completed" | "failed"
  error: string | null
  started_at: string
  completed_at: string | null
}

export type CreateIcpInput = {
  raw_prompt: string
}

export type UpdateIcpInput = {
  raw_prompt?: string
  competitors?: string[]
}
```

**Step 2:** Update `packages/shared/src/types/index.ts`:
```typescript
export type { AuthState } from "./auth"
export type {
  SignalType,
  LeadStatus,
  IcpProfile,
  ParsedIcpConfig,
  Signal,
  Lead,
  LeadsResponse,
  LeadDetailResponse,
  SearchRun,
  CreateIcpInput,
  UpdateIcpInput,
} from "./leads"
```

**Step 3:** Update `packages/shared/src/index.ts` to export new types:
```typescript
// Types
export type {
  AuthState,
  SignalType,
  LeadStatus,
  IcpProfile,
  ParsedIcpConfig,
  Signal,
  Lead,
  LeadsResponse,
  LeadDetailResponse,
  SearchRun,
  CreateIcpInput,
  UpdateIcpInput,
} from "./types"

// API
export { configureApi, apiClient } from "./api"

// Lib
export { createQueryClient } from "./lib"

// Hooks
export {
  AuthProvider,
  useAuth,
  useLogin,
  useVerifyOtp,
  useLogout,
} from "./hooks"
```

**Step 4:** Commit:
```bash
git add -A && git commit -m "feat: add shared types for leads, signals, ICP profiles"
```

---

### Task 5: Build Serper.dev search client

**Files:**
- Create: `api/src/lib/serper.ts`

**Step 1:** Create `api/src/lib/serper.ts`:
```typescript
import { getRequiredSerperEnv } from "../config/env.js"

type SerperResult = {
  title: string
  link: string
  snippet: string
  position: number
}

type SerperResponse = {
  organic: SerperResult[]
  searchParameters: {
    q: string
    num: number
  }
}

export async function searchGoogle(query: string, num: number = 20): Promise<SerperResult[]> {
  const { SERPER_API_KEY } = getRequiredSerperEnv()

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": SERPER_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      num,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Serper API error (${response.status}): ${errorText}`)
  }

  const data: SerperResponse = await response.json()
  return data.organic ?? []
}

export async function searchLinkedInSignals(queries: string[]): Promise<{
  results: Array<{
    query: string
    items: SerperResult[]
  }>
  totalQueries: number
}> {
  const results = await Promise.all(
    queries.map(async (query) => {
      const items = await searchGoogle(query, 20)
      return { query, items }
    })
  )

  return {
    results,
    totalQueries: queries.length,
  }
}
```

**Step 2:** Commit:
```bash
git add -A && git commit -m "feat: add Serper.dev Google Search API client"
```

---

### Task 6: Build Claude AI service (ICP parsing + lead scoring)

**Files:**
- Create: `api/src/lib/claude.ts`
- Create: `api/src/services/icp.service.ts`
- Create: `api/src/services/scoring.service.ts`

**Step 1:** Create `api/src/lib/claude.ts`:
```typescript
import Anthropic from "@anthropic-ai/sdk"
import { getRequiredAnthropicEnv } from "../config/env.js"

let client: Anthropic | null = null

export function getClaudeClient(): Anthropic {
  if (client) return client
  const { ANTHROPIC_API_KEY } = getRequiredAnthropicEnv()
  client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
  return client
}
```

**Step 2:** Create `api/src/services/icp.service.ts`:
```typescript
import { getClaudeClient } from "../lib/claude.js"
import { supabaseAdmin } from "../lib/supabase.js"

type ParsedIcpConfig = {
  titles: string[]
  industries: string[]
  keywords: string[]
  competitors: string[]
  company_size?: string
  location?: string
}

type IcpParseResult = {
  parsed_config: ParsedIcpConfig
  search_queries: string[]
}

export async function parseIcpPrompt(rawPrompt: string): Promise<IcpParseResult> {
  const claude = getClaudeClient()

  const response = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are an expert B2B lead generation specialist. Parse the following Ideal Customer Profile (ICP) description into structured search parameters, then generate Google search queries to find these people on LinkedIn.

ICP Description: "${rawPrompt}"

Return ONLY valid JSON with this exact structure:
{
  "parsed_config": {
    "titles": ["job title 1", "job title 2"],
    "industries": ["industry 1", "industry 2"],
    "keywords": ["keyword 1", "keyword 2"],
    "competitors": ["competitor 1"],
    "company_size": "10-200 or null if not specified",
    "location": "location or null if not specified"
  },
  "search_queries": [
    "site:linkedin.com/posts query for pain points",
    "site:linkedin.com/jobs query for hiring signals",
    "site:linkedin.com/posts query for role changes",
    "site:linkedin.com query for funding signals",
    "site:linkedin.com/posts query for event attendance"
  ]
}

Rules for generating search queries:
1. Always use site:linkedin.com or site:linkedin.com/posts or site:linkedin.com/jobs
2. Use OR operators for multiple titles/keywords
3. Include intent keywords like "looking for", "struggling with", "need help", "hiring", "excited to announce", "new role", "raised", "funding", "Series A/B/C", "attending", "speaking at"
4. Generate 5-15 diverse queries covering: pain_point, hiring, role_change, funding, event signal types
5. If competitors are mentioned, add queries for competitor engagement
6. Keep queries focused and specific — avoid overly broad queries
7. Use quotes around multi-word phrases`,
      },
    ],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("Failed to parse ICP: Claude did not return valid JSON")
  }

  const result: IcpParseResult = JSON.parse(jsonMatch[0])
  return result
}

export async function createIcpProfile(userId: string, rawPrompt: string) {
  const { parsed_config, search_queries } = await parseIcpPrompt(rawPrompt)

  const { data, error } = await supabaseAdmin
    .from("icp_profiles")
    .insert({
      user_id: userId,
      raw_prompt: rawPrompt,
      parsed_config,
      search_queries,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getActiveIcpProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("icp_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") throw error // PGRST116 = no rows
  return data ?? null
}

export async function updateIcpProfile(userId: string, icpId: string, rawPrompt: string) {
  const { parsed_config, search_queries } = await parseIcpPrompt(rawPrompt)

  const { data, error } = await supabaseAdmin
    .from("icp_profiles")
    .update({
      raw_prompt: rawPrompt,
      parsed_config,
      search_queries,
      updated_at: new Date().toISOString(),
    })
    .eq("id", icpId)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) throw error
  return data
}
```

**Step 3:** Create `api/src/services/scoring.service.ts`:
```typescript
import { getClaudeClient } from "../lib/claude.js"

type ScoredLead = {
  name: string
  headline: string
  company: string
  linkedin_url: string
  intent_score: number
  intent_summary: string
  signal_types: string[]
}

type SearchResult = {
  title: string
  link: string
  snippet: string
  query_signal_type: string
}

export async function scoreLeads(
  parsedConfig: {
    titles: string[]
    industries: string[]
    keywords: string[]
    competitors: string[]
    company_size?: string
    location?: string
  },
  searchResults: SearchResult[]
): Promise<ScoredLead[]> {
  if (searchResults.length === 0) return []

  const claude = getClaudeClient()

  // Batch in groups of 30 to stay within token limits
  const batches: SearchResult[][] = []
  for (let i = 0; i < searchResults.length; i += 30) {
    batches.push(searchResults.slice(i, i + 30))
  }

  const allLeads: ScoredLead[] = []

  for (const batch of batches) {
    const response = await claude.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `You are a B2B lead scoring expert. Score these LinkedIn search results against the given Ideal Customer Profile.

ICP:
- Target titles: ${parsedConfig.titles.join(", ")}
- Industries: ${parsedConfig.industries.join(", ")}
- Keywords: ${parsedConfig.keywords.join(", ")}
- Competitors: ${parsedConfig.competitors.join(", ") || "none specified"}
${parsedConfig.company_size ? `- Company size: ${parsedConfig.company_size}` : ""}
${parsedConfig.location ? `- Location: ${parsedConfig.location}` : ""}

Search results:
${batch.map((r, i) => `[${i}] Title: ${r.title}\n    URL: ${r.link}\n    Snippet: ${r.snippet}\n    Signal: ${r.query_signal_type}`).join("\n\n")}

For each result that represents a real person (not a company page, article, or irrelevant result), return a scored lead. Skip non-person results.

Return ONLY a JSON array:
[
  {
    "name": "Full Name",
    "headline": "Job Title at Company",
    "company": "Company Name",
    "linkedin_url": "https://linkedin.com/in/...",
    "intent_score": 0-100,
    "intent_summary": "One sentence explaining why this person is a lead",
    "signal_types": ["pain_point", "hiring"]
  }
]

Scoring guide:
- 80-100: Strong ICP match + clear buying intent signal
- 60-79: Good ICP match OR moderate intent signal
- 40-59: Partial match, worth monitoring
- Below 40: Skip (don't include in results)

If no valid leads exist in this batch, return an empty array [].`,
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        const leads: ScoredLead[] = JSON.parse(jsonMatch[0])
        allLeads.push(...leads)
      } catch {
        console.error("Failed to parse scoring response:", text.slice(0, 200))
      }
    }
  }

  return allLeads
}
```

**Step 4:** Commit:
```bash
git add -A && git commit -m "feat: add Claude AI services for ICP parsing and lead scoring"
```

---

### Task 7: Build search pipeline service

**Files:**
- Create: `api/src/services/search-pipeline.service.ts`

This orchestrates the full search flow: create search run → execute Serper queries → score with Claude → store leads.

**Step 1:** Create `api/src/services/search-pipeline.service.ts`:
```typescript
import { supabaseAdmin } from "../lib/supabase.js"
import { searchLinkedInSignals } from "../lib/serper.js"
import { scoreLeads } from "./scoring.service.js"

type SignalType = "hiring" | "pain_point" | "competitor_engagement" | "funding" | "role_change" | "event"

function classifyQuerySignalType(query: string): SignalType {
  const q = query.toLowerCase()
  if (q.includes("/jobs") || q.includes("hiring") || q.includes("looking to hire")) return "hiring"
  if (q.includes("struggling") || q.includes("looking for") || q.includes("need help") || q.includes("challenge")) return "pain_point"
  if (q.includes("competitor") || q.includes("liked") || q.includes("commented")) return "competitor_engagement"
  if (q.includes("raised") || q.includes("funding") || q.includes("series")) return "funding"
  if (q.includes("excited to announce") || q.includes("new role") || q.includes("just joined")) return "role_change"
  if (q.includes("attending") || q.includes("speaking at") || q.includes("event") || q.includes("conference")) return "event"
  return "pain_point" // default
}

export async function runSearchPipeline(
  userId: string,
  icpProfileId: string,
  triggerType: "cron" | "manual"
) {
  // 1. Get ICP profile
  const { data: icp, error: icpError } = await supabaseAdmin
    .from("icp_profiles")
    .select("*")
    .eq("id", icpProfileId)
    .eq("user_id", userId)
    .single()

  if (icpError || !icp) throw new Error("ICP profile not found")

  // 2. Create search run record
  const { data: searchRun, error: runError } = await supabaseAdmin
    .from("search_runs")
    .insert({
      user_id: userId,
      icp_profile_id: icpProfileId,
      trigger_type: triggerType,
      status: "running",
    })
    .select()
    .single()

  if (runError) throw runError

  try {
    // 3. Execute Serper searches
    const queries: string[] = icp.search_queries ?? []
    const { results, totalQueries } = await searchLinkedInSignals(queries)

    // 4. Flatten results into signals with type classification
    const allSearchResults: Array<{
      title: string
      link: string
      snippet: string
      query_signal_type: string
    }> = []

    for (const { query, items } of results) {
      const signalType = classifyQuerySignalType(query)
      for (const item of items) {
        allSearchResults.push({
          title: item.title,
          link: item.link,
          snippet: item.snippet,
          query_signal_type: signalType,
        })
      }
    }

    // 5. Store raw signals
    const signalInserts = allSearchResults.map((r) => ({
      user_id: userId,
      icp_profile_id: icpProfileId,
      source_url: r.link,
      signal_type: r.query_signal_type,
      title: r.title,
      snippet: r.snippet,
      raw_data: r,
      search_batch_id: searchRun.id,
    }))

    let insertedSignals: Array<{ id: string }> = []
    if (signalInserts.length > 0) {
      const { data: signals, error: sigError } = await supabaseAdmin
        .from("signals")
        .insert(signalInserts)
        .select("id")

      if (sigError) throw sigError
      insertedSignals = signals ?? []
    }

    // 6. Score leads with Claude
    const scoredLeads = await scoreLeads(icp.parsed_config, allSearchResults)

    // 7. Upsert leads and link signals
    let leadsCreated = 0

    for (const lead of scoredLeads) {
      // Check if lead already exists for this user
      const { data: existing } = await supabaseAdmin
        .from("leads")
        .select("id, intent_score, signal_types")
        .eq("user_id", userId)
        .eq("linkedin_url", lead.linkedin_url)
        .single()

      if (existing) {
        // Update existing lead: bump score if higher, merge signal types, update last_seen
        const mergedSignals = [...new Set([...existing.signal_types, ...lead.signal_types])]
        const newScore = Math.max(existing.intent_score, lead.intent_score)

        await supabaseAdmin
          .from("leads")
          .update({
            intent_score: newScore,
            intent_summary: lead.intent_summary,
            signal_types: mergedSignals,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)

        // Link new signals to existing lead
        const signalLinks = insertedSignals
          .filter((_, i) => {
            const result = allSearchResults[i]
            return result && result.link === lead.linkedin_url
          })
          .map((s) => ({ lead_id: existing.id, signal_id: s.id }))

        if (signalLinks.length > 0) {
          await supabaseAdmin.from("lead_signals").upsert(signalLinks, { onConflict: "lead_id,signal_id" })
        }
      } else {
        // Insert new lead
        const { data: newLead, error: leadError } = await supabaseAdmin
          .from("leads")
          .insert({
            user_id: userId,
            linkedin_url: lead.linkedin_url,
            name: lead.name,
            headline: lead.headline,
            company: lead.company,
            intent_score: lead.intent_score,
            intent_summary: lead.intent_summary,
            signal_types: lead.signal_types,
            status: "new",
          })
          .select("id")
          .single()

        if (leadError) throw leadError
        leadsCreated++

        // Link signals to new lead
        const signalLinks = insertedSignals
          .filter((_, i) => {
            const result = allSearchResults[i]
            return result && result.link === lead.linkedin_url
          })
          .map((s) => ({ lead_id: newLead.id, signal_id: s.id }))

        if (signalLinks.length > 0) {
          await supabaseAdmin.from("lead_signals").upsert(signalLinks, { onConflict: "lead_id,signal_id" })
        }
      }
    }

    // 8. Update search run as completed
    await supabaseAdmin
      .from("search_runs")
      .update({
        queries_used: totalQueries,
        signals_found: insertedSignals.length,
        leads_created: leadsCreated,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", searchRun.id)

    return {
      searchRunId: searchRun.id,
      queriesUsed: totalQueries,
      signalsFound: insertedSignals.length,
      leadsCreated,
    }
  } catch (err) {
    // Mark search run as failed
    await supabaseAdmin
      .from("search_runs")
      .update({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        completed_at: new Date().toISOString(),
      })
      .eq("id", searchRun.id)

    throw err
  }
}
```

**Step 2:** Commit:
```bash
git add -A && git commit -m "feat: add search pipeline service orchestrating Serper + Claude + Supabase"
```

---

### Task 8: Build API routes

**Files:**
- Create: `api/src/routes/icp.ts`
- Create: `api/src/routes/leads.ts`
- Create: `api/src/routes/search.ts`
- Create: `api/src/routes/cron.ts`
- Modify: `api/src/index.ts`

**Step 1:** Create `api/src/routes/icp.ts`:
```typescript
import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../middleware/auth.js"
import { validate } from "../middleware/validate.js"
import * as icpService from "../services/icp.service.js"
import { runSearchPipeline } from "../services/search-pipeline.service.js"

export const icpRouter = Router()
icpRouter.use(requireAuth)

// GET /api/icp — get active ICP profile
icpRouter.get("/", async (req, res, next) => {
  try {
    const profile = await icpService.getActiveIcpProfile(req.userId)
    res.json({ profile })
  } catch (err) {
    next(err)
  }
})

// POST /api/icp — create ICP profile and trigger first search
const createSchema = z.object({
  raw_prompt: z.string().min(10).max(2000),
})

icpRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    // Deactivate any existing ICP profiles
    await icpService.deactivateAllProfiles?.(req.userId).catch(() => {})

    const profile = await icpService.createIcpProfile(req.userId, req.body.raw_prompt)

    // Trigger first search in background (don't await)
    runSearchPipeline(req.userId, profile.id, "manual").catch((err) => {
      console.error("First search pipeline failed:", err)
    })

    res.status(201).json({ profile })
  } catch (err) {
    next(err)
  }
})

// PUT /api/icp/:id — update ICP profile
const updateSchema = z.object({
  raw_prompt: z.string().min(10).max(2000),
})

icpRouter.put("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const profile = await icpService.updateIcpProfile(req.userId, req.params.id as string, req.body.raw_prompt)
    res.json({ profile })
  } catch (err) {
    next(err)
  }
})
```

**Step 2:** Add `deactivateAllProfiles` to `api/src/services/icp.service.ts` (append to the file):
```typescript
export async function deactivateAllProfiles(userId: string) {
  const { error } = await supabaseAdmin
    .from("icp_profiles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_active", true)

  if (error) throw error
}
```

**Step 3:** Create `api/src/routes/leads.ts`:
```typescript
import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../middleware/auth.js"
import { validate } from "../middleware/validate.js"
import { supabaseAdmin } from "../lib/supabase.js"

export const leadsRouter = Router()
leadsRouter.use(requireAuth)

// GET /api/leads — list leads with pagination and filters
leadsRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const perPage = Math.min(100, Math.max(1, Number(req.query.per_page) || 20))
    const status = req.query.status as string | undefined
    const signalType = req.query.signal_type as string | undefined
    const minScore = Number(req.query.min_score) || 0
    const offset = (page - 1) * perPage

    let query = supabaseAdmin
      .from("leads")
      .select("*", { count: "exact" })
      .eq("user_id", req.userId)
      .gte("intent_score", minScore)
      .order("intent_score", { ascending: false })
      .range(offset, offset + perPage - 1)

    if (status) {
      query = query.eq("status", status)
    }

    if (signalType) {
      query = query.contains("signal_types", [signalType])
    }

    const { data: leads, error, count } = await query

    if (error) throw error

    res.json({
      leads: leads ?? [],
      total: count ?? 0,
      page,
      per_page: perPage,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/leads/:id — get lead detail with signals
leadsRouter.get("/:id", async (req, res, next) => {
  try {
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", req.userId)
      .single()

    if (leadError) throw leadError

    // Get linked signals
    const { data: signalLinks } = await supabaseAdmin
      .from("lead_signals")
      .select("signal_id")
      .eq("lead_id", lead.id)

    const signalIds = (signalLinks ?? []).map((l) => l.signal_id)

    let signals: Array<{
      id: string
      source_url: string
      signal_type: string
      title: string
      snippet: string
      created_at: string
    }> = []

    if (signalIds.length > 0) {
      const { data: signalData } = await supabaseAdmin
        .from("signals")
        .select("id, source_url, signal_type, title, snippet, created_at")
        .in("id", signalIds)
        .order("created_at", { ascending: false })

      signals = signalData ?? []
    }

    res.json({ ...lead, signals })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/leads/:id — update lead status
const updateSchema = z.object({
  status: z.enum(["new", "viewed", "saved", "dismissed"]),
})

leadsRouter.patch("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const { data: lead, error } = await supabaseAdmin
      .from("leads")
      .update({
        status: req.body.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.params.id)
      .eq("user_id", req.userId)
      .select()
      .single()

    if (error) throw error
    res.json(lead)
  } catch (err) {
    next(err)
  }
})
```

**Step 4:** Create `api/src/routes/search.ts`:
```typescript
import { Router } from "express"
import { requireAuth } from "../middleware/auth.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { runSearchPipeline } from "../services/search-pipeline.service.js"
import * as icpService from "../services/icp.service.js"

export const searchRouter = Router()
searchRouter.use(requireAuth)

// POST /api/search/run — trigger manual search
searchRouter.post("/run", async (req, res, next) => {
  try {
    const icp = await icpService.getActiveIcpProfile(req.userId)
    if (!icp) {
      res.status(400).json({ error: "No active ICP profile. Create one first." })
      return
    }

    // Start pipeline (don't await — return immediately)
    const resultPromise = runSearchPipeline(req.userId, icp.id, "manual")

    // Return the search run ID quickly
    // The pipeline creates the search_run record synchronously at the start
    const { data: latestRun } = await supabaseAdmin
      .from("search_runs")
      .select("id")
      .eq("user_id", req.userId)
      .eq("icp_profile_id", icp.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .single()

    // Still await the result so errors are logged
    resultPromise.catch((err) => {
      console.error("Manual search pipeline failed:", err)
    })

    res.json({ search_run_id: latestRun?.id, status: "running" })
  } catch (err) {
    next(err)
  }
})

// GET /api/search/history — list past search runs
searchRouter.get("/history", async (req, res, next) => {
  try {
    const { data: runs, error } = await supabaseAdmin
      .from("search_runs")
      .select("*")
      .eq("user_id", req.userId)
      .order("started_at", { ascending: false })
      .limit(50)

    if (error) throw error
    res.json({ runs: runs ?? [] })
  } catch (err) {
    next(err)
  }
})
```

**Step 5:** Create `api/src/routes/cron.ts`:
```typescript
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { getRequiredCronEnv } from "../config/env.js"
import { runSearchPipeline } from "../services/search-pipeline.service.js"

export const cronRouter = Router()

// POST /api/cron/search — called by Vercel Cron daily
cronRouter.post("/search", async (req, res, next) => {
  try {
    // Verify cron secret
    const { CRON_SECRET } = getRequiredCronEnv()
    const authHeader = req.headers.authorization

    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }

    // Get all active ICP profiles
    const { data: profiles, error } = await supabaseAdmin
      .from("icp_profiles")
      .select("id, user_id")
      .eq("is_active", true)

    if (error) throw error
    if (!profiles || profiles.length === 0) {
      res.json({ message: "No active ICP profiles", runs: 0 })
      return
    }

    // Run pipeline for each active profile
    const results = await Promise.allSettled(
      profiles.map((p) => runSearchPipeline(p.user_id, p.id, "cron"))
    )

    const succeeded = results.filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected").length

    res.json({ message: "Cron search completed", succeeded, failed, total: profiles.length })
  } catch (err) {
    next(err)
  }
})
```

**Step 6:** Update `api/src/index.ts` to register all new routers:
```typescript
import express from "express"
import cors from "cors"
import { icpRouter } from "./routes/icp.js"
import { leadsRouter } from "./routes/leads.js"
import { searchRouter } from "./routes/search.js"
import { cronRouter } from "./routes/cron.js"
import { errorHandler } from "./middleware/error-handler.js"

export const app = express()

app.use(cors())
app.use(express.json())

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

app.get("/api/health", (_req, res) => {
  res.json({ ok: true })
})

app.use("/api/icp", icpRouter)
app.use("/api/leads", leadsRouter)
app.use("/api/search", searchRouter)
app.use("/api/cron", cronRouter)

app.use(errorHandler)

if (process.env.VERCEL !== "1") {
  const port = Number(process.env.PORT ?? 3001)
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`)
  })
}

export default app
```

**Step 7:** Verify API compiles:
```bash
cd /Users/mskalniak001/Documents/mrhunter/api && npm run build
```

**Step 8:** Commit:
```bash
git add -A && git commit -m "feat: add API routes for ICP, leads, search, and cron"
```

---

### Task 9: Build frontend — shared hooks and API client

**Files:**
- Create: `web/src/features/leads/lib/api-client.ts`
- Create: `web/src/features/leads/hooks/use-icp.ts`
- Create: `web/src/features/leads/hooks/use-create-icp.ts`
- Create: `web/src/features/leads/hooks/use-update-icp.ts`
- Create: `web/src/features/leads/hooks/use-leads.ts`
- Create: `web/src/features/leads/hooks/use-lead.ts`
- Create: `web/src/features/leads/hooks/use-update-lead.ts`
- Create: `web/src/features/leads/hooks/use-search-run.ts`
- Create: `web/src/features/leads/hooks/use-search-history.ts`
- Create: `web/src/features/leads/types.ts`
- Create: `web/src/features/leads/index.ts`

**Step 1:** Create `web/src/features/leads/types.ts`:
```typescript
export type {
  SignalType,
  LeadStatus,
  IcpProfile,
  ParsedIcpConfig,
  Signal,
  Lead,
  LeadsResponse,
  LeadDetailResponse,
  SearchRun,
  CreateIcpInput,
  UpdateIcpInput,
} from "@solomakers/shared"
```

**Step 2:** Create `web/src/features/leads/lib/api-client.ts`:
```typescript
import { apiClient } from "@solomakers/shared"

export function leadsApi<T>(path: string, options?: RequestInit) {
  return apiClient<T>(`/api${path}`, options)
}
```

**Step 3:** Create hooks — `web/src/features/leads/hooks/use-icp.ts`:
```typescript
import { useQuery } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"
import type { IcpProfile } from "../types"

export function useIcp() {
  return useQuery({
    queryKey: ["icp"],
    queryFn: () => leadsApi<{ profile: IcpProfile | null }>("/icp"),
    select: (data) => data.profile,
  })
}
```

**Step 4:** Create `web/src/features/leads/hooks/use-create-icp.ts`:
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"
import type { IcpProfile } from "../types"

export function useCreateIcp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (rawPrompt: string) =>
      leadsApi<{ profile: IcpProfile }>("/icp", {
        method: "POST",
        body: JSON.stringify({ raw_prompt: rawPrompt }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["icp"] })
      queryClient.invalidateQueries({ queryKey: ["leads"] })
    },
  })
}
```

**Step 5:** Create `web/src/features/leads/hooks/use-update-icp.ts`:
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"
import type { IcpProfile } from "../types"

export function useUpdateIcp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ icpId, rawPrompt }: { icpId: string; rawPrompt: string }) =>
      leadsApi<{ profile: IcpProfile }>(`/icp/${icpId}`, {
        method: "PUT",
        body: JSON.stringify({ raw_prompt: rawPrompt }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["icp"] })
    },
  })
}
```

**Step 6:** Create `web/src/features/leads/hooks/use-leads.ts`:
```typescript
import { useQuery } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"
import type { LeadsResponse } from "../types"

type LeadsFilters = {
  page?: number
  per_page?: number
  status?: string
  signal_type?: string
  min_score?: number
}

export function useLeads(filters: LeadsFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page) params.set("page", String(filters.page))
  if (filters.per_page) params.set("per_page", String(filters.per_page))
  if (filters.status) params.set("status", filters.status)
  if (filters.signal_type) params.set("signal_type", filters.signal_type)
  if (filters.min_score) params.set("min_score", String(filters.min_score))

  const queryString = params.toString()
  const path = `/leads${queryString ? `?${queryString}` : ""}`

  return useQuery({
    queryKey: ["leads", filters],
    queryFn: () => leadsApi<LeadsResponse>(path),
  })
}
```

**Step 7:** Create `web/src/features/leads/hooks/use-lead.ts`:
```typescript
import { useQuery } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"
import type { LeadDetailResponse } from "../types"

export function useLead(leadId: string | undefined) {
  return useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => leadsApi<LeadDetailResponse>(`/leads/${leadId}`),
    enabled: !!leadId,
  })
}
```

**Step 8:** Create `web/src/features/leads/hooks/use-update-lead.ts`:
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"
import type { Lead, LeadStatus } from "../types"

export function useUpdateLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: LeadStatus }) =>
      leadsApi<Lead>(`/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
    },
  })
}
```

**Step 9:** Create `web/src/features/leads/hooks/use-search-run.ts`:
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"

export function useSearchRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      leadsApi<{ search_run_id: string; status: string }>("/search/run", {
        method: "POST",
      }),
    onSuccess: () => {
      // Refetch leads after a delay to allow pipeline to complete
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["leads"] })
        queryClient.invalidateQueries({ queryKey: ["search-history"] })
      }, 5000)
    },
  })
}
```

**Step 10:** Create `web/src/features/leads/hooks/use-search-history.ts`:
```typescript
import { useQuery } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"
import type { SearchRun } from "../types"

export function useSearchHistory() {
  return useQuery({
    queryKey: ["search-history"],
    queryFn: () => leadsApi<{ runs: SearchRun[] }>("/search/history"),
    select: (data) => data.runs,
  })
}
```

**Step 11:** Create `web/src/features/leads/index.ts`:
```typescript
export { useIcp } from "./hooks/use-icp"
export { useCreateIcp } from "./hooks/use-create-icp"
export { useUpdateIcp } from "./hooks/use-update-icp"
export { useLeads } from "./hooks/use-leads"
export { useLead } from "./hooks/use-lead"
export { useUpdateLead } from "./hooks/use-update-lead"
export { useSearchRun } from "./hooks/use-search-run"
export { useSearchHistory } from "./hooks/use-search-history"
```

**Step 12:** Commit:
```bash
git add -A && git commit -m "feat: add frontend hooks and API client for leads feature"
```

---

### Task 10: Build frontend — Onboarding page

**Files:**
- Create: `web/src/features/leads/components/onboarding.tsx`

**Step 1:** Create `web/src/features/leads/components/onboarding.tsx`:
```typescript
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { useCreateIcp } from "../hooks/use-create-icp"

export function Onboarding() {
  const [prompt, setPrompt] = useState("")
  const createIcp = useCreateIcp()
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (prompt.trim().length < 10) {
      toast.error("Please describe your ideal customer in more detail")
      return
    }

    createIcp.mutate(prompt.trim(), {
      onSuccess: () => {
        toast.success("ICP created! Finding your first leads...")
        navigate("/")
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create ICP profile")
      },
    })
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Welcome to Cauliflower
          </h1>
          <p className="mt-2 text-base text-white/60">
            Describe your ideal customer and we'll start finding high-intent leads on LinkedIn.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="icp-prompt"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              Who is your ideal customer?
            </label>
            <textarea
              id="icp-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. CTOs and VPs of Engineering at B2B SaaS startups with 10-200 employees who need better developer tooling. Competitors include LinearB and Sleuth."
              rows={5}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 backdrop-blur-sm focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
              disabled={createIcp.isPending}
            />
            <p className="mt-1 text-xs text-white/40">
              Include job titles, industries, company size, pain points, and competitor names for best results.
            </p>
          </div>

          <button
            type="submit"
            disabled={createIcp.isPending || prompt.trim().length < 10}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createIcp.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing your ICP...
              </>
            ) : (
              <>
                <Search size={16} />
                Start Hunting
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Step 2:** Commit:
```bash
git add -A && git commit -m "feat: add onboarding page for ICP creation"
```

---

### Task 11: Build frontend — Dashboard page

**Files:**
- Create: `web/src/features/leads/components/dashboard.tsx`
- Create: `web/src/features/leads/components/lead-card.tsx`
- Create: `web/src/features/leads/components/lead-filters.tsx`

**Step 1:** Create `web/src/features/leads/components/lead-card.tsx`:
```typescript
import { ExternalLink, Bookmark, X, Eye } from "lucide-react"
import type { Lead, SignalType } from "../types"

const SIGNAL_LABELS: Record<SignalType, string> = {
  hiring: "Hiring",
  pain_point: "Pain Point",
  competitor_engagement: "Competitor",
  funding: "Funding",
  role_change: "New Role",
  event: "Event",
}

const SIGNAL_COLORS: Record<SignalType, string> = {
  hiring: "bg-blue-500/20 text-blue-300",
  pain_point: "bg-orange-500/20 text-orange-300",
  competitor_engagement: "bg-purple-500/20 text-purple-300",
  funding: "bg-green-500/20 text-green-300",
  role_change: "bg-yellow-500/20 text-yellow-300",
  event: "bg-pink-500/20 text-pink-300",
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : score >= 50
        ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
        : "bg-white/10 text-white/50 border-white/10"

  return (
    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-bold ${color}`}>
      {score}
    </span>
  )
}

type LeadCardProps = {
  lead: Lead
  onSave: (id: string) => void
  onDismiss: (id: string) => void
  onClick: (id: string) => void
}

export function LeadCard({ lead, onSave, onDismiss, onClick }: LeadCardProps) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.07] cursor-pointer"
      onClick={() => onClick(lead.id)}
    >
      <ScoreBadge score={lead.intent_score} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-white">
            {lead.name || "Unknown"}
          </h3>
          {lead.status === "new" && (
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-300">
              NEW
            </span>
          )}
        </div>
        <p className="truncate text-xs text-white/50">
          {lead.headline || "No headline"}{lead.company ? ` at ${lead.company}` : ""}
        </p>
        <p className="mt-1 line-clamp-2 text-xs text-white/40">
          {lead.intent_summary}
        </p>

        <div className="mt-2 flex flex-wrap gap-1">
          {lead.signal_types.map((type) => (
            <span
              key={type}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SIGNAL_COLORS[type] ?? "bg-white/10 text-white/50"}`}
            >
              {SIGNAL_LABELS[type] ?? type}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <a
          href={lead.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
          title="View on LinkedIn"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={14} />
        </a>
        {lead.status !== "saved" && (
          <button
            className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-emerald-400"
            title="Save lead"
            onClick={(e) => { e.stopPropagation(); onSave(lead.id) }}
          >
            <Bookmark size={14} />
          </button>
        )}
        {lead.status !== "dismissed" && (
          <button
            className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-red-400"
            title="Dismiss lead"
            onClick={(e) => { e.stopPropagation(); onDismiss(lead.id) }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
```

**Step 2:** Create `web/src/features/leads/components/lead-filters.tsx`:
```typescript
import type { SignalType, LeadStatus } from "../types"

type FiltersState = {
  status?: string
  signal_type?: string
  min_score?: number
}

type LeadFiltersProps = {
  filters: FiltersState
  onChange: (filters: FiltersState) => void
  total: number
}

const SIGNAL_OPTIONS: { value: SignalType; label: string }[] = [
  { value: "hiring", label: "Hiring" },
  { value: "pain_point", label: "Pain Point" },
  { value: "competitor_engagement", label: "Competitor" },
  { value: "funding", label: "Funding" },
  { value: "role_change", label: "New Role" },
  { value: "event", label: "Event" },
]

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "viewed", label: "Viewed" },
  { value: "saved", label: "Saved" },
  { value: "dismissed", label: "Dismissed" },
]

export function LeadFilters({ filters, onChange, total }: LeadFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs text-white/40">{total} leads</span>

      <select
        value={filters.signal_type ?? ""}
        onChange={(e) => onChange({ ...filters, signal_type: e.target.value || undefined })}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 focus:outline-none"
      >
        <option value="">All Signals</option>
        {SIGNAL_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <select
        value={filters.status ?? ""}
        onChange={(e) => onChange({ ...filters, status: e.target.value || undefined })}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 focus:outline-none"
      >
        <option value="">All Status</option>
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <select
        value={filters.min_score ?? 0}
        onChange={(e) => onChange({ ...filters, min_score: Number(e.target.value) || undefined })}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 focus:outline-none"
      >
        <option value="0">Any Score</option>
        <option value="50">50+</option>
        <option value="70">70+</option>
        <option value="80">80+</option>
        <option value="90">90+</option>
      </select>
    </div>
  )
}
```

**Step 3:** Create `web/src/features/leads/components/dashboard.tsx`:
```typescript
import { useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useLeads } from "../hooks/use-leads"
import { useUpdateLead } from "../hooks/use-update-lead"
import { useSearchRun } from "../hooks/use-search-run"
import { useSearchHistory } from "../hooks/use-search-history"
import { LeadCard } from "./lead-card"
import { LeadFilters } from "./lead-filters"

type FiltersState = {
  status?: string
  signal_type?: string
  min_score?: number
}

export function LeadsDashboard() {
  const [filters, setFilters] = useState<FiltersState>({})
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const { data, isLoading, error } = useLeads({
    ...filters,
    per_page: 50,
  })
  const updateLead = useUpdateLead()
  const searchRun = useSearchRun()
  const { data: searchHistory } = useSearchHistory()

  const latestRun = searchHistory?.[0]
  const isSearching = latestRun?.status === "running"

  function handleRunSearch() {
    searchRun.mutate(undefined, {
      onSuccess: () => {
        toast.success("Search started! New leads will appear shortly.")
      },
      onError: (error) => {
        toast.error(error.message || "Failed to start search")
      },
    })
  }

  function handleSave(leadId: string) {
    updateLead.mutate({ leadId, status: "saved" }, {
      onSuccess: () => toast.success("Lead saved"),
    })
  }

  function handleDismiss(leadId: string) {
    updateLead.mutate({ leadId, status: "dismissed" }, {
      onSuccess: () => toast.success("Lead dismissed"),
    })
  }

  function handleLeadClick(leadId: string) {
    setSelectedLeadId(leadId === selectedLeadId ? null : leadId)
    // Mark as viewed
    const lead = data?.leads.find((l) => l.id === leadId)
    if (lead?.status === "new") {
      updateLead.mutate({ leadId, status: "viewed" })
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-white/40" size={32} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-red-400">Failed to load leads: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Leads</h1>
          {latestRun && (
            <p className="text-xs text-white/40">
              Last search: {new Date(latestRun.started_at).toLocaleString()}
              {latestRun.status === "completed" && ` · ${latestRun.leads_created} new leads`}
            </p>
          )}
        </div>

        <button
          onClick={handleRunSearch}
          disabled={searchRun.isPending || isSearching}
          className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isSearching ? "animate-spin" : ""} />
          {isSearching ? "Searching..." : "Run Search"}
        </button>
      </div>

      {/* Filters */}
      <LeadFilters
        filters={filters}
        onChange={setFilters}
        total={data?.total ?? 0}
      />

      {/* Lead list */}
      {data?.leads.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-white/50">No leads found yet.</p>
            <p className="mt-1 text-xs text-white/30">
              {isSearching
                ? "A search is running — leads will appear soon."
                : "Click 'Run Search' to find leads matching your ICP."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onSave={handleSave}
              onDismiss={handleDismiss}
              onClick={handleLeadClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4:** Update `web/src/features/leads/index.ts` to also export components:
```typescript
// Hooks
export { useIcp } from "./hooks/use-icp"
export { useCreateIcp } from "./hooks/use-create-icp"
export { useUpdateIcp } from "./hooks/use-update-icp"
export { useLeads } from "./hooks/use-leads"
export { useLead } from "./hooks/use-lead"
export { useUpdateLead } from "./hooks/use-update-lead"
export { useSearchRun } from "./hooks/use-search-run"
export { useSearchHistory } from "./hooks/use-search-history"

// Components
export { Onboarding } from "./components/onboarding"
export { LeadsDashboard } from "./components/dashboard"
```

**Step 5:** Commit:
```bash
git add -A && git commit -m "feat: add leads dashboard, lead cards, and filters"
```

---

### Task 12: Build frontend — Settings and Search History pages

**Files:**
- Create: `web/src/features/leads/components/settings.tsx`
- Create: `web/src/features/leads/components/search-history.tsx`

**Step 1:** Create `web/src/features/leads/components/settings.tsx`:
```typescript
import { useState, useEffect } from "react"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { useIcp } from "../hooks/use-icp"
import { useUpdateIcp } from "../hooks/use-update-icp"

export function Settings() {
  const { data: icp, isLoading } = useIcp()
  const updateIcp = useUpdateIcp()
  const [prompt, setPrompt] = useState("")

  useEffect(() => {
    if (icp?.raw_prompt) {
      setPrompt(icp.raw_prompt)
    }
  }, [icp?.raw_prompt])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!icp) return

    updateIcp.mutate(
      { icpId: icp.id, rawPrompt: prompt.trim() },
      {
        onSuccess: () => toast.success("ICP updated! Run a new search to find updated leads."),
        onError: (error) => toast.error(error.message || "Failed to update ICP"),
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-white/40" size={32} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-bold text-white">Settings</h1>

      <div className="rounded-xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-sm font-semibold text-white">Ideal Customer Profile</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="Describe your ideal customer..."
            />
          </div>

          {icp?.parsed_config && (
            <div className="space-y-2 text-xs text-white/40">
              <p><strong className="text-white/60">Parsed titles:</strong> {icp.parsed_config.titles?.join(", ") || "—"}</p>
              <p><strong className="text-white/60">Industries:</strong> {icp.parsed_config.industries?.join(", ") || "—"}</p>
              <p><strong className="text-white/60">Keywords:</strong> {icp.parsed_config.keywords?.join(", ") || "—"}</p>
              <p><strong className="text-white/60">Competitors:</strong> {icp.parsed_config.competitors?.join(", ") || "—"}</p>
              <p><strong className="text-white/60">Queries:</strong> {icp.search_queries?.length ?? 0} generated</p>
            </div>
          )}

          <button
            type="submit"
            disabled={updateIcp.isPending || prompt.trim() === icp?.raw_prompt}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
          >
            {updateIcp.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Update ICP
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Step 2:** Create `web/src/features/leads/components/search-history.tsx`:
```typescript
import { Loader2 } from "lucide-react"
import { useSearchHistory } from "../hooks/use-search-history"

export function SearchHistory() {
  const { data: runs, isLoading } = useSearchHistory()

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-white/40" size={32} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <h1 className="text-xl font-bold text-white">Search History</h1>

      {(!runs || runs.length === 0) ? (
        <p className="text-sm text-white/40">No searches yet.</p>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <div
              key={run.id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${
                    run.status === "completed" ? "bg-emerald-400" :
                    run.status === "running" ? "bg-yellow-400 animate-pulse" :
                    "bg-red-400"
                  }`} />
                  <span className="text-sm font-medium text-white/80">
                    {run.trigger_type === "cron" ? "Scheduled" : "Manual"} search
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-white/40">
                  {new Date(run.started_at).toLocaleString()}
                </p>
              </div>

              <div className="text-right text-xs text-white/40">
                <p>{run.queries_used} queries</p>
                <p>{run.signals_found} signals · {run.leads_created} new leads</p>
                {run.error && (
                  <p className="text-red-400">{run.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3:** Export new components from `web/src/features/leads/index.ts` (append):
```typescript
export { Settings } from "./components/settings"
export { SearchHistory } from "./components/search-history"
```

**Step 4:** Commit:
```bash
git add -A && git commit -m "feat: add settings and search history pages"
```

---

### Task 13: Wire up routing and layout

**Files:**
- Modify: `web/src/routes.tsx`
- Modify: `web/src/layouts/app-layout.tsx`
- Modify: `web/src/config/navigation.ts`

**Step 1:** Update `web/src/routes.tsx`:
```typescript
import { Route, Routes, Navigate } from "react-router-dom"
import { AppLayout } from "@/layouts/app-layout"
import { LoginPage, AuthGuard } from "@/features/auth"
import { useAuth } from "@/features/auth"
import { useIcp } from "@/features/leads"
import { Onboarding, LeadsDashboard, Settings, SearchHistory } from "@/features/leads"

function LoginRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <LoginPage />
}

function DashboardOrOnboarding() {
  const { data: icp, isLoading } = useIcp()

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-white/40">Loading...</p>
      </div>
    )
  }

  if (!icp) {
    return <Onboarding />
  }

  return <LeadsDashboard />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardOrOnboarding />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/search-history" element={<SearchHistory />} />
        </Route>
      </Route>
    </Routes>
  )
}
```

**Step 2:** Update `web/src/layouts/app-layout.tsx` — add search history to bottom nav:
```typescript
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { LogOut, LayoutGrid, Settings, History } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/features/auth"
import { useLogout } from "@/features/auth"

export function AppLayout() {
  const { user } = useAuth()
  const logout = useLogout()
  const location = useLocation()
  const navigate = useNavigate()

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        navigate("/login")
        toast.success("Signed out")
      },
      onError: () => {
        toast.error("Failed to sign out")
      },
    })
  }

  const initial = user?.email?.charAt(0).toUpperCase() || "?"
  const displayEmail = user?.email || "User"

  return (
    <div className="app-shell">
      <div className="app-bg">
        <div className="app-blob app-blob-1" />
        <div className="app-blob app-blob-2" />
        <div className="app-blob app-blob-3" />
      </div>

      <header className="app-navbar-wrapper">
        <nav className="app-navbar">
          <Link to="/" className="app-brand-group">
            <div className="app-brand-text">
              <span className="app-brand-name">Cauliflower</span>
              <span className="app-brand-sub">Lead Intelligence</span>
            </div>
          </Link>

          <div className="app-navbar-right">
            <button
              className="app-icon-btn"
              onClick={handleLogout}
              disabled={logout.isPending}
              title="Sign out"
            >
              <LogOut size={16} />
            </button>

            <div className="app-user-pill">
              <div className="app-avatar">{initial}</div>
              <span className="app-user-name">{displayEmail}</span>
            </div>
          </div>
        </nav>
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <nav className="app-bottom-nav">
        <div className="app-bottom-bar">
          <Link
            to="/"
            className={`app-bottom-btn ${location.pathname === "/" ? "app-bottom-btn-active" : ""}`}
          >
            <LayoutGrid size={22} />
          </Link>
          <Link
            to="/search-history"
            className={`app-bottom-btn ${location.pathname === "/search-history" ? "app-bottom-btn-active" : ""}`}
          >
            <History size={22} />
          </Link>
          <Link
            to="/settings"
            className={`app-bottom-btn ${location.pathname === "/settings" ? "app-bottom-btn-active" : ""}`}
          >
            <Settings size={22} />
          </Link>
        </div>
      </nav>
    </div>
  )
}
```

**Step 3:** Update `web/src/config/navigation.ts`:
```typescript
export type NavItem = {
  label: string
  path: string
}

export const navigationItems: NavItem[] = [
  { label: "Dashboard", path: "/" },
  { label: "Search History", path: "/search-history" },
  { label: "Settings", path: "/settings" },
]
```

**Step 4:** Verify the full app compiles:
```bash
cd /Users/mskalniak001/Documents/mrhunter/web && npm run build
cd /Users/mskalniak001/Documents/mrhunter/api && npm run build
```

**Step 5:** Commit:
```bash
git add -A && git commit -m "feat: wire up all routes, layout, and navigation for Cauliflower"
```

---

### Task 14: Add Vercel Cron configuration

**Files:**
- Modify: `api/vercel.json`

**Step 1:** Read current `api/vercel.json` and add cron configuration:
```json
{
  "crons": [
    {
      "path": "/api/cron/search",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Note: Merge with existing vercel.json content — don't replace the entire file. The cron runs daily at 8:00 AM UTC.

**Step 2:** Commit:
```bash
git add -A && git commit -m "feat: add Vercel Cron config for daily search"
```

---

### Task 15: Update login page branding

**Files:**
- Modify: `web/src/features/auth/components/login-page.tsx`

**Step 1:** Update the branding text in the login page:
- Change "BEYOND+" to "Cauliflower"
- Change "Life Harmony" to "Lead Intelligence"
- Change tagline to "Find high-intent B2B leads on LinkedIn with AI-powered intent signal detection."
- Change "Sign in to track your habits" to "Sign in to start hunting leads"
- Change "BEYONDPLUS.APP" to "CAULIFLOWER.APP"

**Step 2:** Commit:
```bash
git add -A && git commit -m "feat: update login page branding to Cauliflower"
```

---

### Task 16: Final verification and cleanup

**Step 1:** Run full builds:
```bash
cd /Users/mskalniak001/Documents/mrhunter/web && npm run build
cd /Users/mskalniak001/Documents/mrhunter/api && npm run build
```

**Step 2:** Fix any TypeScript or build errors.

**Step 3:** Start dev servers and verify manually:
```bash
# Terminal 1: API
cd /Users/mskalniak001/Documents/mrhunter/api && npm run dev

# Terminal 2: Web
cd /Users/mskalniak001/Documents/mrhunter/web && npm run dev
```

**Step 4:** Test the flow:
1. Login with email/OTP
2. See onboarding page (no ICP yet)
3. Enter ICP description
4. Dashboard loads (may be empty if no API keys configured)
5. Settings page shows parsed ICP
6. Search history page shows runs

**Step 5:** Final commit if any fixes were needed:
```bash
git add -A && git commit -m "fix: resolve build errors and cleanup"
```
