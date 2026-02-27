# Onboarding Chat + Intent Dashboard — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the single-textarea onboarding with a conversational AI chat + live intent dashboard that gamifies ICP setup by showing unlocked intent signals.

**Architecture:** Two-column layout (chat left, intent dashboard right). User chats with AI that extrapolates ICP data from natural language. Backend handles Claude conversation + intent calculation (rules never exposed to frontend). On completion, converts OnboardingState to ICP profile + triggers search pipeline.

**Tech Stack:** React 19 + Tailwind CSS + TanStack Query (frontend), Express + Claude API + Zod (backend), Supabase (persistence)

---

### Task 1: Add shared OnboardingState types

**Files:**
- Modify: `packages/shared/src/types/leads.ts`

**Step 1: Add OnboardingState and related types to shared package**

Add these types at the end of `packages/shared/src/types/leads.ts`:

```typescript
export type CompanyEntry = {
  name: string
  linkedInUrl?: string
  source: 'user' | 'ai-suggested'
}

export type OnboardingState = {
  companyName: string | null
  companyLinkedInUrl: string | null
  businessType: 'agency' | 'saas' | 'services' | 'solo' | 'other' | null
  teamProfiles: string[]
  targetJobTitles: string[]
  targetIndustries: string[]
  targetCompanySize: string | null
  targetLocations: string[]
  problemKeywords: string[]
  productCategoryPhrases: string[]
  industryHashtags: string[]
  competitors: CompanyEntry[]
  targetAccounts: CompanyEntry[]
  existingCustomers: CompanyEntry[]
  thoughtLeaders: string[]
  hiringSignalRoles: string[]
  targetTechStack: string[]
  industryEvents: string[]
  linkedInGroups: string[]
  fiscalYearStart: number | null
}

export type IntentCategory = {
  label: string
  unlocked: number
  max: number
}

export type IntentSummary = {
  total: number
  maxTotal: number
  critical: number
  high: number
  categories: IntentCategory[]
  hint: string | null
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type OnboardingChatRequest = {
  message: string
  currentState: OnboardingState
  chatHistory: ChatMessage[]
}

export type OnboardingChatResponse = {
  reply: string
  stateUpdates: Partial<OnboardingState>
  intentSummary: IntentSummary
}

export type OnboardingCompleteRequest = {
  state: OnboardingState
}

export type OnboardingCompleteResponse = {
  success: boolean
  icpProfileId: string
}
```

**Step 2: Export new types**

The types file already uses `export type` so they'll be auto-exported. Verify `packages/shared/src/types/index.ts` re-exports from `leads.ts`.

**Step 3: Commit**

```bash
git add packages/shared/src/types/leads.ts
git commit -m "feat: add OnboardingState and intent summary types"
```

---

### Task 2: Create intent calculation service (server-side only)

**Files:**
- Create: `api/src/services/intent.service.ts`

This file contains the intent unlock rules — the IP that must NEVER be exposed to the frontend.

**Step 1: Create the intent calculation service**

Create `api/src/services/intent.service.ts`:

```typescript
import type { OnboardingState, IntentSummary } from "@solomakers/shared"

type IntentRule = {
  field: keyof OnboardingState
  minItems: number | null
  intents: number
  critical: number
  high: number
  label: string
}

const intentUnlockRules: IntentRule[] = [
  // Auto-extracted from first message
  { field: 'targetJobTitles', minItems: 1, intents: 7, critical: 3, high: 2, label: 'ICP Job Titles' },
  { field: 'targetIndustries', minItems: 1, intents: 4, critical: 1, high: 2, label: 'ICP Industries' },
  { field: 'problemKeywords', minItems: 1, intents: 11, critical: 5, high: 4, label: 'Problem Keywords' },
  { field: 'productCategoryPhrases', minItems: 1, intents: 5, critical: 2, high: 2, label: 'Product Phrases' },
  { field: 'industryHashtags', minItems: 1, intents: 3, critical: 0, high: 1, label: 'Hashtags' },
  { field: 'companyName', minItems: null, intents: 5, critical: 2, high: 2, label: 'Your Company' },

  // Required questions
  { field: 'competitors', minItems: 1, intents: 9, critical: 4, high: 3, label: 'Competitors' },
  { field: 'targetCompanySize', minItems: null, intents: 3, critical: 1, high: 1, label: 'Company Size' },
  { field: 'targetLocations', minItems: 1, intents: 4, critical: 1, high: 1, label: 'Locations' },

  // Optional questions
  { field: 'targetAccounts', minItems: 1, intents: 10, critical: 4, high: 4, label: 'Target Accounts' },
  { field: 'existingCustomers', minItems: 1, intents: 4, critical: 1, high: 1, label: 'Existing Customers' },
  { field: 'thoughtLeaders', minItems: 1, intents: 4, critical: 0, high: 2, label: 'Thought Leaders' },
  { field: 'hiringSignalRoles', minItems: 1, intents: 6, critical: 2, high: 3, label: 'Hiring Roles' },
  { field: 'targetTechStack', minItems: 1, intents: 5, critical: 1, high: 2, label: 'Tech Stack' },
  { field: 'industryEvents', minItems: 1, intents: 4, critical: 0, high: 2, label: 'Events' },
  { field: 'linkedInGroups', minItems: 1, intents: 3, critical: 1, high: 1, label: 'LinkedIn Groups' },
  { field: 'fiscalYearStart', minItems: null, intents: 4, critical: 1, high: 1, label: 'Fiscal Year' },
  { field: 'teamProfiles', minItems: 1, intents: 3, critical: 2, high: 1, label: 'Team Profiles' },
]

const ALWAYS_UNLOCKED_INTENTS = 5 // temporal/calendar signals
const ALWAYS_UNLOCKED_CRITICAL = 0
const ALWAYS_UNLOCKED_HIGH = 1
const MAX_TOTAL = 107

export function calculateIntentSummary(state: OnboardingState): IntentSummary {
  let total = ALWAYS_UNLOCKED_INTENTS
  let critical = ALWAYS_UNLOCKED_CRITICAL
  let high = ALWAYS_UNLOCKED_HIGH

  const categories: { label: string; unlocked: number; max: number }[] = []

  for (const rule of intentUnlockRules) {
    const value = state[rule.field]
    let filled = false

    if (rule.minItems === null) {
      filled = value !== null && value !== '' && value !== undefined
    } else if (Array.isArray(value)) {
      filled = value.length >= rule.minItems
    }

    if (filled) {
      total += rule.intents
      critical += rule.critical
      high += rule.high
    }

    categories.push({
      label: rule.label,
      unlocked: filled ? rule.intents : 0,
      max: rule.intents,
    })
  }

  const hint = getNextBestHint(state)

  return { total, maxTotal: MAX_TOTAL, critical, high, categories, hint }
}

function getNextBestHint(state: OnboardingState): string | null {
  const unfilled = intentUnlockRules.filter(rule => {
    const value = state[rule.field]
    if (rule.minItems === null) return value === null || value === '' || value === undefined
    return !Array.isArray(value) || value.length < rule.minItems
  })

  unfilled.sort((a, b) => {
    if (b.critical !== a.critical) return b.critical - a.critical
    return b.intents - a.intents
  })

  if (unfilled.length === 0) return null

  const best = unfilled[0]
  const criticalNote = best.critical > 0 ? ` (${best.critical} critical)` : ''
  return `Add ${best.label.toLowerCase()} to unlock ${best.intents} new intents${criticalNote}`
}
```

**Step 2: Commit**

```bash
git add api/src/services/intent.service.ts
git commit -m "feat: add server-side intent calculation service"
```

---

### Task 3: Create onboarding chat service (backend)

**Files:**
- Create: `api/src/services/onboarding.service.ts`

**Step 1: Create the onboarding chat service**

Create `api/src/services/onboarding.service.ts`:

```typescript
import { getClaudeClient } from "../lib/claude.js"
import { calculateIntentSummary } from "./intent.service.js"
import type { OnboardingState, ChatMessage, OnboardingChatResponse } from "@solomakers/shared"

const SYSTEM_PROMPT = `You are an onboarding assistant for a LinkedIn lead generation tool powered by intent signals.

YOUR GOAL: In as few messages as possible, extract and infer maximum data from the user to configure intent signal monitoring.

RULES:
1. From the user's FIRST message, extract MAXIMUM information. Don't ask about things you can infer.
2. After each response, summarize WHAT YOU SAVED (✅ list).
3. After each response, show INTENT DELTA (→ +X intents → Y/107).
4. Ask ONE question at a time. Never more.
5. Don't repeat questions about already filled fields.
6. Be CONCISE. Max 4 sentences + 1 question.
7. If user says "skip", "enough", "let's start" — finish.
8. Use emoji sparingly (✅ for confirmations, → for intents).

QUESTION ORDER (after extrapolation):
1. Competitors — "Who are your competitors?"
2. Target company size — "What size companies do you target?"
3. Target location — "What regions are you targeting?"
4. Target accounts — "Do you have dream client companies?"
5. Existing customers — "Do you have existing customers?"
6. Thought leaders — "Know any industry influencers?"
7. Hiring roles — "What roles signal buying intent?"
(Skip questions you already have answers for from context.)

EXTRAPOLATION — from the first message ALWAYS try to extract:
- businessType: agency / saas / services / solo
- targetIndustries: target industry
- targetJobTitles: target job titles (infer based on industry + type)
- problemKeywords: problem keywords (infer based on industry)
- productCategoryPhrases: how prospects describe the user's solution
- industryHashtags: industry hashtags
- companyName: user's company name (if mentioned)
- targetLocations: location (if mentioned)
- targetCompanySize: company size (if mentioned)

RESPONSE FORMAT — return ONLY valid JSON:
{
  "reply": "Your text response to the user",
  "stateUpdates": {
    "targetIndustries": ["SaaS", "B2B Software"],
    "targetJobTitles": ["CMO", "VP Marketing"]
  }
}

stateUpdates should ONLY contain fields that changed. Use these field names:
- companyName (string)
- companyLinkedInUrl (string)
- businessType ("agency" | "saas" | "services" | "solo" | "other")
- teamProfiles (string[])
- targetJobTitles (string[])
- targetIndustries (string[])
- targetCompanySize (string: "1-10", "11-50", "51-200", "201-1000", "1000+")
- targetLocations (string[])
- problemKeywords (string[])
- productCategoryPhrases (string[])
- industryHashtags (string[])
- competitors (array of {name: string, source: "ai-suggested" | "user"})
- targetAccounts (array of {name: string, source: "ai-suggested" | "user"})
- existingCustomers (array of {name: string, source: "user"})
- thoughtLeaders (string[])
- hiringSignalRoles (string[])
- targetTechStack (string[])
- industryEvents (string[])
- linkedInGroups (string[])
- fiscalYearStart (number 1-12)

CURRENT STATE:
{current_state}`

export async function processOnboardingChat(
  message: string,
  currentState: OnboardingState,
  chatHistory: ChatMessage[]
): Promise<OnboardingChatResponse> {
  const claude = getClaudeClient()

  const systemPrompt = SYSTEM_PROMPT.replace(
    '{current_state}',
    JSON.stringify(currentState, null, 2)
  )

  const messages = [
    ...chatHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: message },
  ]

  const response = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system: systemPrompt,
    messages,
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  // Parse JSON from Claude's response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    // Fallback: treat entire response as reply with no state updates
    const summary = calculateIntentSummary(currentState)
    return {
      reply: text,
      stateUpdates: {},
      intentSummary: summary,
    }
  }

  let parsed: { reply: string; stateUpdates: Partial<OnboardingState> }
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    const summary = calculateIntentSummary(currentState)
    return {
      reply: text,
      stateUpdates: {},
      intentSummary: summary,
    }
  }

  // Merge state updates into current state to calculate intents
  const updatedState = mergeState(currentState, parsed.stateUpdates)
  const intentSummary = calculateIntentSummary(updatedState)

  return {
    reply: parsed.reply,
    stateUpdates: parsed.stateUpdates,
    intentSummary,
  }
}

function mergeState(
  current: OnboardingState,
  updates: Partial<OnboardingState>
): OnboardingState {
  const merged = { ...current }

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      (merged as Record<string, unknown>)[key] = value
    }
  }

  return merged
}

export function createEmptyOnboardingState(): OnboardingState {
  return {
    companyName: null,
    companyLinkedInUrl: null,
    businessType: null,
    teamProfiles: [],
    targetJobTitles: [],
    targetIndustries: [],
    targetCompanySize: null,
    targetLocations: [],
    problemKeywords: [],
    productCategoryPhrases: [],
    industryHashtags: [],
    competitors: [],
    targetAccounts: [],
    existingCustomers: [],
    thoughtLeaders: [],
    hiringSignalRoles: [],
    targetTechStack: [],
    industryEvents: [],
    linkedInGroups: [],
    fiscalYearStart: null,
  }
}
```

**Step 2: Commit**

```bash
git add api/src/services/onboarding.service.ts
git commit -m "feat: add onboarding chat service with Claude integration"
```

---

### Task 4: Create onboarding API routes

**Files:**
- Create: `api/src/routes/onboarding.ts`
- Modify: `api/src/index.ts` (register new router)
- Modify: `api/src/services/icp.service.ts` (add `createIcpFromOnboarding`)

**Step 1: Create the onboarding router**

Create `api/src/routes/onboarding.ts`:

```typescript
import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../middleware/auth.js"
import { validate } from "../middleware/validate.js"
import { processOnboardingChat } from "../services/onboarding.service.js"
import { createIcpFromOnboarding } from "../services/icp.service.js"
import { runSearchPipeline } from "../services/search-pipeline.service.js"

export const onboardingRouter = Router()
onboardingRouter.use(requireAuth)

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  currentState: z.record(z.unknown()),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
})

// POST /api/onboarding/chat — process a chat message
onboardingRouter.post("/chat", validate(chatSchema), async (req, res, next) => {
  try {
    const { message, currentState, chatHistory } = req.body
    const result = await processOnboardingChat(message, currentState, chatHistory)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

const completeSchema = z.object({
  state: z.record(z.unknown()),
})

// POST /api/onboarding/complete — finalize onboarding and create ICP
onboardingRouter.post("/complete", validate(completeSchema), async (req, res, next) => {
  try {
    const profile = await createIcpFromOnboarding(req.userId, req.body.state)

    // Trigger first search in background
    runSearchPipeline(req.userId, profile.id, "manual").catch(err => {
      console.error("First search pipeline failed:", err)
    })

    res.status(201).json({ success: true, icpProfileId: profile.id })
  } catch (err) {
    next(err)
  }
})
```

**Step 2: Add `createIcpFromOnboarding` to icp.service.ts**

Add this function at the end of `api/src/services/icp.service.ts`:

```typescript
export async function createIcpFromOnboarding(userId: string, state: OnboardingState) {
  // Convert OnboardingState → ParsedIcpConfig
  const parsed_config: ParsedIcpConfig = {
    titles: state.targetJobTitles,
    industries: state.targetIndustries,
    keywords: [
      ...state.problemKeywords,
      ...state.productCategoryPhrases,
    ],
    competitors: state.competitors.map(c => c.name),
    company_size: state.targetCompanySize ?? undefined,
    location: state.targetLocations.join(', ') || undefined,
  }

  // Generate search queries using Claude (reuse existing logic)
  const { search_queries } = await parseIcpPrompt(
    buildRawPromptFromState(state)
  )

  // Deactivate existing profiles
  await deactivateAllProfiles(userId).catch(() => {})

  const { data, error } = await supabaseAdmin
    .from("icp_profiles")
    .insert({
      user_id: userId,
      raw_prompt: buildRawPromptFromState(state),
      parsed_config,
      search_queries,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

function buildRawPromptFromState(state: OnboardingState): string {
  const parts: string[] = []

  if (state.businessType) parts.push(`Business type: ${state.businessType}`)
  if (state.companyName) parts.push(`Company: ${state.companyName}`)
  if (state.targetJobTitles.length) parts.push(`Target titles: ${state.targetJobTitles.join(', ')}`)
  if (state.targetIndustries.length) parts.push(`Industries: ${state.targetIndustries.join(', ')}`)
  if (state.targetCompanySize) parts.push(`Company size: ${state.targetCompanySize}`)
  if (state.targetLocations.length) parts.push(`Locations: ${state.targetLocations.join(', ')}`)
  if (state.problemKeywords.length) parts.push(`Pain points: ${state.problemKeywords.join(', ')}`)
  if (state.productCategoryPhrases.length) parts.push(`Product category: ${state.productCategoryPhrases.join(', ')}`)
  if (state.competitors.length) parts.push(`Competitors: ${state.competitors.map(c => c.name).join(', ')}`)
  if (state.targetAccounts.length) parts.push(`Target accounts: ${state.targetAccounts.map(a => a.name).join(', ')}`)
  if (state.existingCustomers.length) parts.push(`Existing customers: ${state.existingCustomers.map(c => c.name).join(', ')}`)
  if (state.hiringSignalRoles.length) parts.push(`Hiring signal roles: ${state.hiringSignalRoles.join(', ')}`)
  if (state.industryHashtags.length) parts.push(`Hashtags: ${state.industryHashtags.join(', ')}`)

  return parts.join('. ') + '.'
}
```

Also add the import at the top of `icp.service.ts`:

```typescript
import type { OnboardingState } from "@solomakers/shared"
```

**Step 3: Register the router in `api/src/index.ts`**

Add after the existing router registrations:

```typescript
import { onboardingRouter } from "./routes/onboarding.js"
// ...
app.use("/api/onboarding", onboardingRouter)
```

**Step 4: Commit**

```bash
git add api/src/routes/onboarding.ts api/src/services/icp.service.ts api/src/index.ts
git commit -m "feat: add onboarding API routes and ICP creation from state"
```

---

### Task 5: Create frontend onboarding hook

**Files:**
- Create: `web/src/features/leads/hooks/use-onboarding-chat.ts`

**Step 1: Create the hook**

Create `web/src/features/leads/hooks/use-onboarding-chat.ts`:

```typescript
import { useState, useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"
import type {
  OnboardingState,
  ChatMessage,
  OnboardingChatResponse,
  IntentSummary,
  OnboardingCompleteResponse,
} from "@solomakers/shared"

const EMPTY_STATE: OnboardingState = {
  companyName: null,
  companyLinkedInUrl: null,
  businessType: null,
  teamProfiles: [],
  targetJobTitles: [],
  targetIndustries: [],
  targetCompanySize: null,
  targetLocations: [],
  problemKeywords: [],
  productCategoryPhrases: [],
  industryHashtags: [],
  competitors: [],
  targetAccounts: [],
  existingCustomers: [],
  thoughtLeaders: [],
  hiringSignalRoles: [],
  targetTechStack: [],
  industryEvents: [],
  linkedInGroups: [],
  fiscalYearStart: null,
}

const INITIAL_INTENT_SUMMARY: IntentSummary = {
  total: 5,
  maxTotal: 107,
  critical: 0,
  high: 1,
  categories: [],
  hint: "Tell me about your business to start unlocking intent signals",
}

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Cześć! 👋 Jestem tu, żeby skonfigurować Twoje intent signals — sygnały, dzięki którym będziesz rozmawiać z ludźmi, którzy WŁAŚNIE szukają tego, co oferujesz.\n\nPowiedz mi w kilku zdaniach: czym się zajmujesz i kogo szukasz jako klientów?\n\nNa przykład: \"Prowadzę agencję SEO, szukam właścicieli e-commerce B2C w Polsce z min. 50 pracownikami\"",
}

export function useOnboardingChat() {
  const queryClient = useQueryClient()
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(EMPTY_STATE)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [intentSummary, setIntentSummary] = useState<IntentSummary>(INITIAL_INTENT_SUMMARY)

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      leadsApi<OnboardingChatResponse>("/onboarding/chat", {
        method: "POST",
        body: JSON.stringify({
          message,
          currentState: onboardingState,
          chatHistory: chatHistory.filter(m => m !== WELCOME_MESSAGE),
        }),
      }),
    onSuccess: (data, message) => {
      // Add user message + AI reply to history
      setChatHistory(prev => [
        ...prev,
        { role: "user", content: message },
        { role: "assistant", content: data.reply },
      ])

      // Merge state updates
      if (data.stateUpdates && Object.keys(data.stateUpdates).length > 0) {
        setOnboardingState(prev => ({ ...prev, ...data.stateUpdates }))
      }

      // Update intent summary
      setIntentSummary(data.intentSummary)

      // Auto-save to localStorage
      try {
        localStorage.setItem("onboarding_state", JSON.stringify({
          state: { ...onboardingState, ...data.stateUpdates },
          history: [
            ...chatHistory,
            { role: "user", content: message },
            { role: "assistant", content: data.reply },
          ],
          intentSummary: data.intentSummary,
        }))
      } catch {}
    },
  })

  const completeMutation = useMutation({
    mutationFn: () =>
      leadsApi<OnboardingCompleteResponse>("/onboarding/complete", {
        method: "POST",
        body: JSON.stringify({ state: onboardingState }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["icp"] })
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      localStorage.removeItem("onboarding_state")
    },
  })

  const sendMessage = useCallback((message: string) => {
    chatMutation.mutate(message)
  }, [chatMutation])

  const completeOnboarding = useCallback(() => {
    completeMutation.mutate()
  }, [completeMutation])

  // Check if required fields are filled
  const hasRequiredFields =
    onboardingState.competitors.length > 0 &&
    onboardingState.targetJobTitles.length > 0 &&
    onboardingState.targetIndustries.length > 0 &&
    onboardingState.problemKeywords.length > 0

  return {
    chatHistory,
    intentSummary,
    onboardingState,
    sendMessage,
    completeOnboarding,
    isSending: chatMutation.isPending,
    isCompleting: completeMutation.isPending,
    isComplete: completeMutation.isSuccess,
    hasRequiredFields,
    sendError: chatMutation.error,
    completeError: completeMutation.error,
  }
}
```

**Step 2: Commit**

```bash
git add web/src/features/leads/hooks/use-onboarding-chat.ts
git commit -m "feat: add useOnboardingChat hook for conversational onboarding"
```

---

### Task 6: Build the Intent Dashboard component

**Files:**
- Create: `web/src/features/leads/components/intent-dashboard.tsx`

**Step 1: Create the intent dashboard component**

Create `web/src/features/leads/components/intent-dashboard.tsx`:

```typescript
import type { IntentSummary } from "@solomakers/shared"

type IntentDashboardProps = {
  summary: IntentSummary
}

export function IntentDashboard({ summary }: IntentDashboardProps) {
  const progress = Math.round((summary.total / summary.maxTotal) * 100)

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      {/* Main counter */}
      <div>
        <div className="mb-2 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-gray-900 transition-all duration-500">
            {summary.total}
          </span>
          <span className="text-lg text-gray-400">/ {summary.maxTotal}</span>
        </div>
        <p className="mb-3 text-sm text-gray-500">intent signals unlocked</p>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-purple-500 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Critical / High counters */}
      {(summary.critical > 0 || summary.high > 0) && (
        <div className="flex gap-4 text-sm">
          {summary.critical > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-gray-600">{summary.critical} critical</span>
            </div>
          )}
          {summary.high > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-400" />
              <span className="text-gray-600">{summary.high} high</span>
            </div>
          )}
        </div>
      )}

      {/* Category breakdown */}
      {summary.categories.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Categories
          </h3>
          <div className="space-y-2.5">
            {summary.categories.map(cat => (
              <div key={cat.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {cat.unlocked > 0 ? "✅" : "⬜"} {cat.label}
                  </span>
                  <span className="tabular-nums text-gray-400">
                    {cat.unlocked}/{cat.max}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-purple-400 transition-all duration-500 ease-out"
                    style={{ width: cat.max > 0 ? `${(cat.unlocked / cat.max) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hint */}
      {summary.hint && (
        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
          <p className="text-sm text-purple-700">
            💡 {summary.hint}
          </p>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add web/src/features/leads/components/intent-dashboard.tsx
git commit -m "feat: add IntentDashboard component with progress and categories"
```

---

### Task 7: Build the Chat UI component

**Files:**
- Create: `web/src/features/leads/components/onboarding-chat.tsx`

**Step 1: Create the chat UI component**

Create `web/src/features/leads/components/onboarding-chat.tsx`:

```typescript
import { useState, useRef, useEffect } from "react"
import { Send, Loader2, SkipForward } from "lucide-react"
import type { ChatMessage } from "@solomakers/shared"

type OnboardingChatProps = {
  chatHistory: ChatMessage[]
  onSendMessage: (message: string) => void
  isSending: boolean
  error: Error | null
}

export function OnboardingChat({
  chatHistory,
  onSendMessage,
  isSending,
  error,
}: OnboardingChatProps) {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory, isSending])

  // Focus input after AI responds
  useEffect(() => {
    if (!isSending) {
      inputRef.current?.focus()
    }
  }, [isSending])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isSending) return
    onSendMessage(trimmed)
    setInput("")
  }

  function handleSkip() {
    if (isSending) return
    onSendMessage("skip")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-lg space-y-4">
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isSending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-500">
                <Loader2 size={14} className="animate-spin" />
                Thinking...
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                Something went wrong. Try sending your message again.
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white/80 p-4 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-lg items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            disabled={isSending}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-300 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSending}
            className="rounded-xl border border-gray-200 px-3 py-3 text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600 disabled:opacity-50"
            title="Skip this question"
          >
            <SkipForward size={16} />
          </button>
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="rounded-xl bg-purple-600 px-3 py-3 text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add web/src/features/leads/components/onboarding-chat.tsx
git commit -m "feat: add OnboardingChat component with message bubbles and input"
```

---

### Task 8: Rewrite the Onboarding page component

**Files:**
- Modify: `web/src/features/leads/components/onboarding.tsx`
- Modify: `web/src/features/leads/index.ts` (add new exports)

**Step 1: Rewrite onboarding.tsx**

Replace the entire content of `web/src/features/leads/components/onboarding.tsx`:

```typescript
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Loader2, Rocket } from "lucide-react"
import { useOnboardingChat } from "../hooks/use-onboarding-chat"
import { OnboardingChat } from "./onboarding-chat"
import { IntentDashboard } from "./intent-dashboard"

export function Onboarding() {
  const navigate = useNavigate()
  const {
    chatHistory,
    intentSummary,
    sendMessage,
    completeOnboarding,
    isSending,
    isCompleting,
    isComplete,
    hasRequiredFields,
    sendError,
  } = useOnboardingChat()

  function handleComplete() {
    completeOnboarding()
    toast.success("ICP created! Finding your first leads...")
    navigate("/")
  }

  if (isComplete) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto mb-4 animate-spin text-purple-500" />
          <p className="text-gray-500">Setting up your lead intelligence...</p>
        </div>
      </div>
    )
  }

  const progress = Math.round((intentSummary.total / intentSummary.maxTotal) * 100)

  // Button state
  let buttonLabel = "Fill required fields to continue..."
  let buttonEnabled = false
  if (hasRequiredFields && progress < 50) {
    buttonLabel = `Start with ${intentSummary.total}/${intentSummary.maxTotal} intents`
    buttonEnabled = true
  } else if (hasRequiredFields && progress >= 50 && progress < 80) {
    buttonLabel = `Start hunting (${intentSummary.total}/${intentSummary.maxTotal} intents)`
    buttonEnabled = true
  } else if (hasRequiredFields && progress >= 80) {
    buttonLabel = `Start — great setup! (${intentSummary.total}/${intentSummary.maxTotal})`
    buttonEnabled = true
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Main content: chat + dashboard */}
      <div className="flex min-h-0 flex-1">
        {/* Left: Chat */}
        <div className="flex flex-1 flex-col border-r border-gray-100">
          <OnboardingChat
            chatHistory={chatHistory}
            onSendMessage={sendMessage}
            isSending={isSending}
            error={sendError}
          />
        </div>

        {/* Right: Intent Dashboard */}
        <div className="hidden w-80 flex-shrink-0 border-l border-gray-100 bg-white/40 backdrop-blur-sm lg:block xl:w-96">
          <IntentDashboard summary={intentSummary} />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between border-t border-gray-100 bg-white/80 px-6 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-gray-400">
            {intentSummary.total}/{intentSummary.maxTotal} intents
          </span>
        </div>

        <button
          onClick={handleComplete}
          disabled={!buttonEnabled || isCompleting}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCompleting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Rocket size={16} />
              {buttonLabel}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Export new hook in index.ts**

Add to `web/src/features/leads/index.ts`:

```typescript
export { useOnboardingChat } from "./hooks/use-onboarding-chat"
```

**Step 3: Commit**

```bash
git add web/src/features/leads/components/onboarding.tsx web/src/features/leads/index.ts
git commit -m "feat: rewrite Onboarding with chat UI and intent dashboard"
```

---

### Task 9: Verify build and manual smoke test

**Step 1: Check that TypeScript compiles**

Run from project root:
```bash
cd /Users/mskalniak001/Documents/mrhunter && npx tsc --noEmit -p web/tsconfig.json
```

Expected: no errors.

**Step 2: Check that the API builds**

```bash
cd /Users/mskalniak001/Documents/mrhunter && npx tsc --noEmit -p api/tsconfig.json
```

Expected: no errors.

**Step 3: Start dev server and verify visually**

```bash
cd /Users/mskalniak001/Documents/mrhunter/web && npm run dev
```

Open the app, log in, verify:
- Two-column layout appears (chat left, dashboard right)
- Welcome message shows
- Can type and send a message
- AI responds and intent dashboard updates
- Progress bar animates
- "Start" button enables after required fields filled

**Step 4: Test the API endpoint directly**

```bash
curl -X POST http://localhost:3001/api/onboarding/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"message":"I run a marketing agency targeting B2B SaaS companies","currentState":{},"chatHistory":[]}'
```

Expected: JSON response with `reply`, `stateUpdates`, `intentSummary`.

**Step 5: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build issues from onboarding implementation"
```

---

### Task 10: Mobile responsive layout

**Files:**
- Modify: `web/src/features/leads/components/onboarding.tsx`

**Step 1: Add mobile intent summary toggle**

The current layout hides the dashboard on mobile (`hidden lg:block`). Add a collapsible summary bar for mobile at the top of the main content area, inside the `Onboarding` component, above the `flex min-h-0` div:

```typescript
{/* Mobile intent summary (visible only on small screens) */}
<div className="flex items-center gap-3 border-b border-gray-100 bg-white/60 px-4 py-2 backdrop-blur-sm lg:hidden">
  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
    <div
      className="h-full rounded-full bg-purple-500 transition-all duration-700 ease-out"
      style={{ width: `${progress}%` }}
    />
  </div>
  <span className="whitespace-nowrap text-xs font-medium tabular-nums text-gray-600">
    {intentSummary.total}/{intentSummary.maxTotal} intents
  </span>
  {intentSummary.critical > 0 && (
    <span className="flex items-center gap-1 text-xs text-red-500">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
      {intentSummary.critical}
    </span>
  )}
</div>
```

**Step 2: Commit**

```bash
git add web/src/features/leads/components/onboarding.tsx
git commit -m "feat: add mobile responsive intent summary bar"
```
