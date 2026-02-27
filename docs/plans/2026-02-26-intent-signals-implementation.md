# Intent Signals System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an extensible intent signal detection system using the Signal Detector Pattern with HarvestAPI as data source, starting with 13 critical signals from categories 1-4.

**Architecture:** Each signal is a separate file implementing `SignalDetector` interface. A typed HarvestAPI client wraps the REST API. A registry collects detectors, and a runner orchestrates execution — loading ICP, running detectors, deduplicating, scoring, and storing results in Supabase.

**Tech Stack:** TypeScript, HarvestAPI (`https://api.harvest-api.com`, X-API-Key auth), Claude AI (Anthropic SDK for AI-based detectors), Supabase (PostgreSQL), Zod (validation), Express 5

**Design doc:** `docs/plans/2026-02-26-intent-signals-design.md`

---

## Task 1: Add HarvestAPI env config and shared types

**Files:**
- Modify: `api/src/config/env.ts`
- Modify: `packages/shared/src/types/leads.ts`
- Modify: `api/.env.example`

**Step 1: Add HARVEST_API_KEY to env schema**

In `api/src/config/env.ts`, add to `envSchema`:

```typescript
HARVEST_API_KEY: z.string().min(1).optional(),
```

Add a new validator function after `getRequiredCronEnv`:

```typescript
const harvestEnvSchema = z.object({
  HARVEST_API_KEY: z.string().min(1),
})

export function getRequiredHarvestEnv() {
  return harvestEnvSchema.parse(process.env)
}
```

**Step 2: Add signal strength and category types to shared types**

In `packages/shared/src/types/leads.ts`, add after the `SignalType` definition:

```typescript
export type SignalStrength = "critical" | "high" | "medium" | "low"

export type SignalCategory =
  | "content-engagement"
  | "content-creation"
  | "career-changes"
  | "hiring"
```

**Step 3: Add HARVEST_API_KEY to .env.example**

In `api/.env.example`, add:

```
HARVEST_API_KEY=your-harvest-api-key
```

**Step 4: Add HARVEST_API_KEY to actual .env**

Add your real key to `api/.env` (do NOT commit this file).

**Step 5: Verify TypeScript compiles**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add api/src/config/env.ts packages/shared/src/types/leads.ts api/.env.example
git commit -m "feat: add HarvestAPI env config and signal strength/category types"
```

---

## Task 2: Create HarvestAPI client

**Files:**
- Create: `api/src/signals/sources/harvest-api.ts`

**Context:** HarvestAPI base URL is `https://api.harvest-api.com`. Auth is via `X-API-Key` header. All endpoints return `{ elements: T[], pagination: {...}, status, error }`.

**Step 1: Create the HarvestAPI client**

Create `api/src/signals/sources/harvest-api.ts`:

```typescript
import { getRequiredHarvestEnv } from "../../config/env.js"

// ── Response types ──────────────────────────────────────────────

export type HarvestPagination = {
  totalPages: number
  totalElements: number
  pageNumber: number
  previousElements: number
  pageSize: number
  paginationToken: string | null
}

export type HarvestPostAuthor = {
  publicIdentifier: string
  universalName?: string
  name: string
  linkedinUrl: string
  avatar?: string
}

export type HarvestPost = {
  id: string
  content: string
  linkedinUrl: string
  author: HarvestPostAuthor
  postedAt: {
    timestamp: number
    date: string
    postedAgoShort?: string
    postedAgoText?: string
  }
  engagement?: {
    likes?: number
    comments?: number
    shares?: number
  }
}

export type HarvestComment = {
  id: string
  linkedinUrl: string
  commentary: string
  createdAt: string
  createdAtTimestamp: number
  numComments: number
  actor: {
    id: string
    name: string
    linkedinUrl: string
    position: string
    pictureUrl?: string
    author: boolean
  }
  reactionTypeCounts?: Array<{ type: string; count: number }>
  postId: string
}

export type HarvestProfile = {
  id: string
  publicIdentifier: string
  firstName: string
  lastName: string
  headline: string
  about?: string
  linkedinUrl: string
  photo?: string
  connectionsCount?: number
  followerCount?: number
  openToWork?: boolean
  hiring?: boolean
  location?: {
    linkedinText: string
    parsed?: {
      country: string
      state?: string
      city?: string
    }
  }
  currentPosition?: Array<{ companyName: string; position?: string }>
  experience?: Array<{
    companyName: string
    position: string
    duration?: string
    location?: string
    companyLink?: string
    description?: string
    startDate?: { month?: string; year?: number; text?: string }
    endDate?: { month?: string; year?: number; text?: string }
  }>
  skills?: Array<{ name: string }>
  certifications?: Array<{
    title: string
    issuedAt?: string
    issuedBy?: string
  }>
}

export type HarvestProfileSearchResult = {
  id: string
  publicIdentifier: string
  name: string
  position: string
  location?: { linkedinText: string }
  linkedinUrl: string
  photo?: string
}

export type HarvestJob = {
  id: string
  title: string
  linkedinUrl: string
  jobState?: string
  postedDate?: string
  descriptionText?: string
  descriptionHtml?: string
  location?: {
    linkedinText?: string
    parsed?: {
      country?: string
      state?: string
      city?: string
    }
  }
  employmentType?: string
  workplaceType?: string
  applicants?: number
  company?: {
    name: string
    id?: string
    linkedinUrl?: string
    logo?: string
    employeeCount?: number
    description?: string
    industries?: string[]
  }
}

type HarvestResponse<T> = {
  elements: T[]
  pagination: HarvestPagination
  status: string
  error?: string
}

// ── Request option types ────────────────────────────────────────

export type PostSearchOpts = {
  company?: string
  authorsCompany?: string
  authorsIndustryId?: string
  mentioningMember?: string
  mentioningCompany?: string
  contentType?: string
  postedLimit?: "24h" | "week" | "month"
  sortBy?: "relevance" | "date"
  page?: number
}

export type JobSearchOpts = {
  locations?: string[]
  companies?: string[]
  sortBy?: "relevance" | "date"
  workplaceType?: string
  employmentType?: string
  experienceLevel?: string
  postedLimit?: string
  maxItems?: number
  page?: number
}

export type ProfileSearchOpts = {
  currentCompany?: string
  title?: string
  location?: string
  geoId?: string
  industryId?: string
  page?: number
}

// ── Client ──────────────────────────────────────────────────────

const BASE_URL = "https://api.harvest-api.com"
const RATE_LIMIT_DELAY_MS = 500

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function harvestFetch<T>(
  path: string,
  params: Record<string, string | number | undefined>
): Promise<HarvestResponse<T>> {
  const { HARVEST_API_KEY } = getRequiredHarvestEnv()

  const url = new URL(path, BASE_URL)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-API-Key": HARVEST_API_KEY,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HarvestAPI error (${response.status}): ${errorText}`)
  }

  const data = await response.json() as HarvestResponse<T>

  if (data.error) {
    throw new Error(`HarvestAPI error: ${data.error}`)
  }

  // Respect rate limits
  await sleep(RATE_LIMIT_DELAY_MS)

  return data
}

// ── Public API ──────────────────────────────────────────────────

export async function searchPosts(
  search: string,
  opts: PostSearchOpts = {}
): Promise<HarvestPost[]> {
  const res = await harvestFetch<HarvestPost>("/linkedin/post-search", {
    search,
    company: opts.company,
    authorsCompany: opts.authorsCompany,
    authorsIndustryId: opts.authorsIndustryId,
    mentioningMember: opts.mentioningMember,
    mentioningCompany: opts.mentioningCompany,
    contentType: opts.contentType,
    postedLimit: opts.postedLimit,
    sortBy: opts.sortBy ?? "date",
    page: opts.page,
  })
  return res.elements
}

export async function getPostComments(
  postUrl: string,
  opts: { sortBy?: "relevance" | "date"; page?: number } = {}
): Promise<HarvestComment[]> {
  const res = await harvestFetch<HarvestComment>("/linkedin/post-comments", {
    post: postUrl,
    sortBy: opts.sortBy ?? "date",
    page: opts.page,
  })
  return res.elements
}

export async function getProfile(
  linkedinUrl: string
): Promise<HarvestProfile | null> {
  const res = await harvestFetch<HarvestProfile>("/linkedin/profile", {
    url: linkedinUrl,
  })
  return res.elements?.[0] ?? (res as any).element ?? null
}

export async function searchProfiles(
  search: string,
  opts: ProfileSearchOpts = {}
): Promise<HarvestProfileSearchResult[]> {
  const res = await harvestFetch<HarvestProfileSearchResult>(
    "/linkedin/profile-search",
    {
      search,
      currentCompany: opts.currentCompany,
      title: opts.title,
      location: opts.location,
      geoId: opts.geoId,
      industryId: opts.industryId,
      page: opts.page,
    }
  )
  return res.elements
}

export async function searchJobs(
  search: string,
  opts: JobSearchOpts = {}
): Promise<HarvestJob[]> {
  const res = await harvestFetch<HarvestJob>("/linkedin/job-search", {
    search,
    location: opts.locations?.join(","),
    company: opts.companies?.join(","),
    sortBy: opts.sortBy ?? "date",
    workplaceType: opts.workplaceType,
    employmentType: opts.employmentType,
    experienceLevel: opts.experienceLevel,
    postedLimit: opts.postedLimit,
    page: opts.page,
  })
  return res.elements
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add api/src/signals/sources/harvest-api.ts
git commit -m "feat: add HarvestAPI client with typed endpoints"
```

---

## Task 3: Create signal detector types and interfaces

**Files:**
- Create: `api/src/signals/types.ts`

**Step 1: Create the types file**

Create `api/src/signals/types.ts`:

```typescript
import type { SignalType, SignalStrength, SignalCategory, ParsedIcpConfig } from "@solomakers/shared"
import type * as harvest from "./sources/harvest-api.js"

// ── Detection context (injected into every detector) ────────────

export type DetectionContext = {
  icpProfile: ParsedIcpConfig
  userId: string
  harvest: {
    searchPosts: typeof harvest.searchPosts
    getPostComments: typeof harvest.getPostComments
    getProfile: typeof harvest.getProfile
    searchProfiles: typeof harvest.searchProfiles
    searchJobs: typeof harvest.searchJobs
  }
}

// ── Detected signal (output of a detector) ──────────────────────

export type DetectedSignal = {
  detectorId: string
  signalType: SignalType
  strength: SignalStrength
  scorePoints: number
  linkedinUrl: string
  name?: string
  headline?: string
  company?: string
  title: string
  snippet: string
  sourceUrl: string
}

// ── Signal detector interface ───────────────────────────────────

export type SignalDetector = {
  id: string
  name: string
  category: SignalCategory
  strength: SignalStrength
  scorePoints: number
  source: string
  requiresAI: boolean
  detect: (ctx: DetectionContext) => Promise<DetectedSignal[]>
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add api/src/signals/types.ts
git commit -m "feat: add SignalDetector interface and detection types"
```

---

## Task 4: Implement Category 1 — Content Engagement detectors (4 critical)

**Files:**
- Create: `api/src/signals/detectors/content-engagement/competitor-post-comment.ts`
- Create: `api/src/signals/detectors/content-engagement/solution-question-comment.ts`
- Create: `api/src/signals/detectors/content-engagement/reaction-series.ts`
- Create: `api/src/signals/detectors/content-engagement/negative-tool-sentiment.ts`
- Create: `api/src/signals/detectors/content-engagement/index.ts`

**Context:** These detectors analyze comments and posts related to competitors. ICP `competitors` array provides competitor company names. HarvestAPI `searchPosts` finds competitor posts, `getPostComments` gets commenters. AI detectors (1.3, 1.6, 1.7) use Claude to classify comment intent.

**Step 1: Create 1.1 — Competitor post comment (rule-based)**

Create `api/src/signals/detectors/content-engagement/competitor-post-comment.ts`:

```typescript
import type { SignalDetector, DetectedSignal } from "../../types.js"

export const competitorPostComment: SignalDetector = {
  id: "1.1",
  name: "Competitor post comment",
  category: "content-engagement",
  strength: "critical",
  scorePoints: 40,
  source: "harvest-post-comments",
  requiresAI: false,

  async detect(ctx): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []

    for (const competitor of ctx.icpProfile.competitors) {
      const posts = await ctx.harvest.searchPosts(competitor, {
        postedLimit: "week",
        sortBy: "date",
      })

      for (const post of posts.slice(0, 10)) {
        const comments = await ctx.harvest.getPostComments(post.linkedinUrl)

        for (const comment of comments) {
          // Skip if commenter is the post author
          if (comment.actor.author) continue

          signals.push({
            detectorId: "1.1",
            signalType: "competitor_engagement",
            strength: "critical",
            scorePoints: 40,
            linkedinUrl: comment.actor.linkedinUrl,
            name: comment.actor.name,
            headline: comment.actor.position,
            title: `Commented on ${competitor} post`,
            snippet: comment.commentary.slice(0, 300),
            sourceUrl: post.linkedinUrl,
          })
        }
      }
    }

    return signals
  },
}
```

**Step 2: Create 1.3 — Solution question comment (AI-based)**

Create `api/src/signals/detectors/content-engagement/solution-question-comment.ts`:

```typescript
import type { SignalDetector, DetectedSignal } from "../../types.js"
import { getClaudeClient } from "../../../lib/claude.js"

export const solutionQuestionComment: SignalDetector = {
  id: "1.3",
  name: "Solution question comment",
  category: "content-engagement",
  strength: "critical",
  scorePoints: 45,
  source: "harvest-post-comments",
  requiresAI: true,

  async detect(ctx): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const claude = getClaudeClient()
    const keywords = ctx.icpProfile.keywords

    for (const competitor of ctx.icpProfile.competitors) {
      const posts = await ctx.harvest.searchPosts(competitor, {
        postedLimit: "week",
        sortBy: "date",
      })

      for (const post of posts.slice(0, 5)) {
        const comments = await ctx.harvest.getPostComments(post.linkedinUrl)
        const nonAuthorComments = comments.filter((c) => !c.actor.author)

        if (nonAuthorComments.length === 0) continue

        // Batch classify comments with Claude
        const commentTexts = nonAuthorComments
          .slice(0, 20)
          .map((c, i) => `[${i}] ${c.actor.name}: ${c.commentary.slice(0, 200)}`)
          .join("\n")

        const response = await claude.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: `Analyze these LinkedIn comments. Which ones are asking about a solution, seeking recommendations, or expressing a need related to these topics: ${keywords.join(", ")}?

Comments:
${commentTexts}

Return ONLY a JSON array of comment indices (numbers) that show solution-seeking intent. Example: [0, 3, 5]
If none match, return [].`,
            },
          ],
        })

        const text = response.content[0].type === "text" ? response.content[0].text : ""
        let matchIndices: number[] = []
        try {
          const match = text.match(/\[[\d,\s]*\]/)
          if (match) matchIndices = JSON.parse(match[0])
        } catch {
          continue
        }

        for (const idx of matchIndices) {
          const comment = nonAuthorComments[idx]
          if (!comment) continue

          signals.push({
            detectorId: "1.3",
            signalType: "pain_point",
            strength: "critical",
            scorePoints: 45,
            linkedinUrl: comment.actor.linkedinUrl,
            name: comment.actor.name,
            headline: comment.actor.position,
            title: "Asked about solution in competitor discussion",
            snippet: comment.commentary.slice(0, 300),
            sourceUrl: post.linkedinUrl,
          })
        }
      }
    }

    return signals
  },
}
```

**Step 3: Create 1.7 — Negative tool sentiment (AI-based)**

Create `api/src/signals/detectors/content-engagement/negative-tool-sentiment.ts`:

```typescript
import type { SignalDetector, DetectedSignal } from "../../types.js"
import { getClaudeClient } from "../../../lib/claude.js"

export const negativeToolSentiment: SignalDetector = {
  id: "1.7",
  name: "Negative tool sentiment",
  category: "content-engagement",
  strength: "critical",
  scorePoints: 45,
  source: "harvest-post-comments",
  requiresAI: true,

  async detect(ctx): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const claude = getClaudeClient()

    for (const competitor of ctx.icpProfile.competitors) {
      const posts = await ctx.harvest.searchPosts(competitor, {
        postedLimit: "month",
        sortBy: "date",
      })

      for (const post of posts.slice(0, 5)) {
        const comments = await ctx.harvest.getPostComments(post.linkedinUrl)
        const nonAuthorComments = comments.filter((c) => !c.actor.author)

        if (nonAuthorComments.length === 0) continue

        const commentTexts = nonAuthorComments
          .slice(0, 20)
          .map((c, i) => `[${i}] ${c.actor.name}: ${c.commentary.slice(0, 200)}`)
          .join("\n")

        const response = await claude.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: `Analyze these LinkedIn comments about "${competitor}". Which comments express negative sentiment, frustration, complaints, or dissatisfaction with the tool/product/service?

Comments:
${commentTexts}

Return ONLY a JSON array of comment indices that express negative sentiment. Example: [1, 4]
If none, return [].`,
            },
          ],
        })

        const text = response.content[0].type === "text" ? response.content[0].text : ""
        let matchIndices: number[] = []
        try {
          const match = text.match(/\[[\d,\s]*\]/)
          if (match) matchIndices = JSON.parse(match[0])
        } catch {
          continue
        }

        for (const idx of matchIndices) {
          const comment = nonAuthorComments[idx]
          if (!comment) continue

          signals.push({
            detectorId: "1.7",
            signalType: "pain_point",
            strength: "critical",
            scorePoints: 45,
            linkedinUrl: comment.actor.linkedinUrl,
            name: comment.actor.name,
            headline: comment.actor.position,
            title: `Negative sentiment about ${competitor}`,
            snippet: comment.commentary.slice(0, 300),
            sourceUrl: post.linkedinUrl,
          })
        }
      }
    }

    return signals
  },
}
```

**Step 4: Create 1.6 — Reaction series (AI-based, aggregation)**

Create `api/src/signals/detectors/content-engagement/reaction-series.ts`:

```typescript
import type { SignalDetector, DetectedSignal } from "../../types.js"

export const reactionSeries: SignalDetector = {
  id: "1.6",
  name: "Reaction series on competitor content",
  category: "content-engagement",
  strength: "critical",
  scorePoints: 50,
  source: "harvest-post-comments",
  requiresAI: false,

  async detect(ctx): Promise<DetectedSignal[]> {
    // Track comment count per person across all competitor posts
    const personEngagement = new Map<
      string,
      { name: string; headline: string; linkedinUrl: string; count: number; posts: string[] }
    >()

    for (const competitor of ctx.icpProfile.competitors) {
      const posts = await ctx.harvest.searchPosts(competitor, {
        postedLimit: "week",
        sortBy: "date",
      })

      for (const post of posts.slice(0, 10)) {
        const comments = await ctx.harvest.getPostComments(post.linkedinUrl)

        for (const comment of comments) {
          if (comment.actor.author) continue

          const key = comment.actor.linkedinUrl
          const existing = personEngagement.get(key)

          if (existing) {
            existing.count++
            if (!existing.posts.includes(post.linkedinUrl)) {
              existing.posts.push(post.linkedinUrl)
            }
          } else {
            personEngagement.set(key, {
              name: comment.actor.name,
              headline: comment.actor.position,
              linkedinUrl: comment.actor.linkedinUrl,
              count: 1,
              posts: [post.linkedinUrl],
            })
          }
        }
      }
    }

    // Signal: 3+ interactions across different posts in a week
    const signals: DetectedSignal[] = []
    for (const [, person] of personEngagement) {
      if (person.posts.length >= 3) {
        signals.push({
          detectorId: "1.6",
          signalType: "competitor_engagement",
          strength: "critical",
          scorePoints: 50,
          linkedinUrl: person.linkedinUrl,
          name: person.name,
          headline: person.headline,
          title: `${person.posts.length} interactions with competitor content in 7 days`,
          snippet: `Engaged with ${person.posts.length} different competitor posts this week`,
          sourceUrl: person.posts[0],
        })
      }
    }

    return signals
  },
}
```

**Step 5: Create category index file**

Create `api/src/signals/detectors/content-engagement/index.ts`:

```typescript
import type { SignalDetector } from "../../types.js"
import { competitorPostComment } from "./competitor-post-comment.js"
import { solutionQuestionComment } from "./solution-question-comment.js"
import { reactionSeries } from "./reaction-series.js"
import { negativeToolSentiment } from "./negative-tool-sentiment.js"

export const contentEngagementDetectors: SignalDetector[] = [
  competitorPostComment,
  solutionQuestionComment,
  reactionSeries,
  negativeToolSentiment,
]
```

**Step 6: Verify TypeScript compiles**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add api/src/signals/detectors/content-engagement/
git commit -m "feat: add content engagement detectors (1.1, 1.3, 1.6, 1.7)"
```

---

## Task 5: Implement Category 2 — Content Creation detectors (4 critical)

**Files:**
- Create: `api/src/signals/detectors/content-creation/problem-solving-post.ts`
- Create: `api/src/signals/detectors/content-creation/network-recommendation-post.ts`
- Create: `api/src/signals/detectors/content-creation/tool-frustration-post.ts`
- Create: `api/src/signals/detectors/content-creation/demo-trial-request-post.ts`
- Create: `api/src/signals/detectors/content-creation/index.ts`

**Context:** These detectors search for posts by leads that indicate buying intent. They use `searchPosts` with keyword queries derived from `icpProfile.keywords`. All 4 are AI-based — Claude classifies whether the post matches.

**Step 1: Create 2.1 — Problem-solving post (AI-based)**

Create `api/src/signals/detectors/content-creation/problem-solving-post.ts`:

```typescript
import type { SignalDetector, DetectedSignal } from "../../types.js"
import { getClaudeClient } from "../../../lib/claude.js"

export const problemSolvingPost: SignalDetector = {
  id: "2.1",
  name: "Post about problem you solve",
  category: "content-creation",
  strength: "critical",
  scorePoints: 45,
  source: "harvest-post-search",
  requiresAI: true,

  async detect(ctx): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const claude = getClaudeClient()

    for (const keyword of ctx.icpProfile.keywords.slice(0, 5)) {
      const posts = await ctx.harvest.searchPosts(keyword, {
        postedLimit: "week",
        sortBy: "date",
      })

      if (posts.length === 0) continue

      const postTexts = posts
        .slice(0, 15)
        .map((p, i) => `[${i}] ${p.author.name}: ${p.content.slice(0, 300)}`)
        .join("\n\n")

      const response = await claude.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Analyze these LinkedIn posts. Which posts describe a problem, challenge, or pain point related to: ${ctx.icpProfile.keywords.join(", ")}?

Look for posts where the author is experiencing or discussing a problem — NOT posts that are selling a solution.

Posts:
${postTexts}

Return ONLY a JSON array of post indices. Example: [0, 2, 7]
If none, return [].`,
          },
        ],
      })

      const text = response.content[0].type === "text" ? response.content[0].text : ""
      let matchIndices: number[] = []
      try {
        const match = text.match(/\[[\d,\s]*\]/)
        if (match) matchIndices = JSON.parse(match[0])
      } catch {
        continue
      }

      for (const idx of matchIndices) {
        const post = posts[idx]
        if (!post) continue

        signals.push({
          detectorId: "2.1",
          signalType: "pain_point",
          strength: "critical",
          scorePoints: 45,
          linkedinUrl: post.author.linkedinUrl,
          name: post.author.name,
          title: "Posted about a problem you solve",
          snippet: post.content.slice(0, 300),
          sourceUrl: post.linkedinUrl,
        })
      }
    }

    return signals
  },
}
```

**Step 2: Create 2.3 — Network recommendation post (AI-based)**

Create `api/src/signals/detectors/content-creation/network-recommendation-post.ts`:

```typescript
import type { SignalDetector, DetectedSignal } from "../../types.js"
import { getClaudeClient } from "../../../lib/claude.js"

export const networkRecommendationPost: SignalDetector = {
  id: "2.3",
  name: "Network recommendation post",
  category: "content-creation",
  strength: "critical",
  scorePoints: 50,
  source: "harvest-post-search",
  requiresAI: true,

  async detect(ctx): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const claude = getClaudeClient()
    const searchQueries = [
      "who can recommend",
      "looking for recommendations",
      "any suggestions for",
      "can anyone recommend",
      ...ctx.icpProfile.keywords.slice(0, 3).map((k) => `recommend ${k}`),
    ]

    for (const query of searchQueries) {
      const posts = await ctx.harvest.searchPosts(query, {
        postedLimit: "week",
        sortBy: "date",
      })

      if (posts.length === 0) continue

      const postTexts = posts
        .slice(0, 15)
        .map((p, i) => `[${i}] ${p.author.name}: ${p.content.slice(0, 300)}`)
        .join("\n\n")

      const response = await claude.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Analyze these LinkedIn posts. Which posts are asking their network for recommendations, suggestions, or referrals for tools/services related to: ${ctx.icpProfile.keywords.join(", ")}?

Posts:
${postTexts}

Return ONLY a JSON array of post indices. Example: [1, 4]
If none, return [].`,
          },
        ],
      })

      const text = response.content[0].type === "text" ? response.content[0].text : ""
      let matchIndices: number[] = []
      try {
        const match = text.match(/\[[\d,\s]*\]/)
        if (match) matchIndices = JSON.parse(match[0])
      } catch {
        continue
      }

      for (const idx of matchIndices) {
        const post = posts[idx]
        if (!post) continue

        signals.push({
          detectorId: "2.3",
          signalType: "pain_point",
          strength: "critical",
          scorePoints: 50,
          linkedinUrl: post.author.linkedinUrl,
          name: post.author.name,
          title: "Asking network for tool recommendations",
          snippet: post.content.slice(0, 300),
          sourceUrl: post.linkedinUrl,
        })
      }
    }

    return signals
  },
}
```

**Step 3: Create 2.5 — Tool frustration post (AI-based)**

Create `api/src/signals/detectors/content-creation/tool-frustration-post.ts`:

```typescript
import type { SignalDetector, DetectedSignal } from "../../types.js"
import { getClaudeClient } from "../../../lib/claude.js"

export const toolFrustrationPost: SignalDetector = {
  id: "2.5",
  name: "Tool frustration post",
  category: "content-creation",
  strength: "critical",
  scorePoints: 45,
  source: "harvest-post-search",
  requiresAI: true,

  async detect(ctx): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const claude = getClaudeClient()

    for (const competitor of ctx.icpProfile.competitors) {
      const posts = await ctx.harvest.searchPosts(competitor, {
        postedLimit: "month",
        sortBy: "date",
      })

      if (posts.length === 0) continue

      const postTexts = posts
        .slice(0, 15)
        .map((p, i) => `[${i}] ${p.author.name}: ${p.content.slice(0, 300)}`)
        .join("\n\n")

      const response = await claude.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Analyze these LinkedIn posts about "${competitor}". Which posts express frustration, disappointment, or complaints about this tool/service? Look for posts where the author is unhappy — NOT promotional posts.

Posts:
${postTexts}

Return ONLY a JSON array of post indices. Example: [2, 5]
If none, return [].`,
          },
        ],
      })

      const text = response.content[0].type === "text" ? response.content[0].text : ""
      let matchIndices: number[] = []
      try {
        const match = text.match(/\[[\d,\s]*\]/)
        if (match) matchIndices = JSON.parse(match[0])
      } catch {
        continue
      }

      for (const idx of matchIndices) {
        const post = posts[idx]
        if (!post) continue

        signals.push({
          detectorId: "2.5",
          signalType: "pain_point",
          strength: "critical",
          scorePoints: 45,
          linkedinUrl: post.author.linkedinUrl,
          name: post.author.name,
          title: `Frustrated with ${competitor}`,
          snippet: post.content.slice(0, 300),
          sourceUrl: post.linkedinUrl,
        })
      }
    }

    return signals
  },
}
```

**Step 4: Create 2.12 — Demo/trial request post (AI-based)**

Create `api/src/signals/detectors/content-creation/demo-trial-request-post.ts`:

```typescript
import type { SignalDetector, DetectedSignal } from "../../types.js"
import { getClaudeClient } from "../../../lib/claude.js"

export const demoTrialRequestPost: SignalDetector = {
  id: "2.12",
  name: "Demo/trial request post",
  category: "content-creation",
  strength: "critical",
  scorePoints: 50,
  source: "harvest-post-search",
  requiresAI: true,

  async detect(ctx): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const claude = getClaudeClient()
    const searchQueries = [
      "looking for demo",
      "free trial",
      "want to try",
      ...ctx.icpProfile.keywords.slice(0, 3).map((k) => `demo ${k}`),
      ...ctx.icpProfile.keywords.slice(0, 3).map((k) => `trial ${k}`),
    ]

    for (const query of searchQueries) {
      const posts = await ctx.harvest.searchPosts(query, {
        postedLimit: "week",
        sortBy: "date",
      })

      if (posts.length === 0) continue

      const postTexts = posts
        .slice(0, 15)
        .map((p, i) => `[${i}] ${p.author.name}: ${p.content.slice(0, 300)}`)
        .join("\n\n")

      const response = await claude.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Analyze these LinkedIn posts. Which posts are from someone actively looking for a demo, trial, or to test a product/service related to: ${ctx.icpProfile.keywords.join(", ")}?

Exclude posts from people OFFERING demos (sellers). Only include posts from potential BUYERS.

Posts:
${postTexts}

Return ONLY a JSON array of post indices. Example: [0, 3]
If none, return [].`,
          },
        ],
      })

      const text = response.content[0].type === "text" ? response.content[0].text : ""
      let matchIndices: number[] = []
      try {
        const match = text.match(/\[[\d,\s]*\]/)
        if (match) matchIndices = JSON.parse(match[0])
      } catch {
        continue
      }

      for (const idx of matchIndices) {
        const post = posts[idx]
        if (!post) continue

        signals.push({
          detectorId: "2.12",
          signalType: "pain_point",
          strength: "critical",
          scorePoints: 50,
          linkedinUrl: post.author.linkedinUrl,
          name: post.author.name,
          title: "Looking for demo/trial",
          snippet: post.content.slice(0, 300),
          sourceUrl: post.linkedinUrl,
        })
      }
    }

    return signals
  },
}
```

**Step 5: Create category index file**

Create `api/src/signals/detectors/content-creation/index.ts`:

```typescript
import type { SignalDetector } from "../../types.js"
import { problemSolvingPost } from "./problem-solving-post.js"
import { networkRecommendationPost } from "./network-recommendation-post.js"
import { toolFrustrationPost } from "./tool-frustration-post.js"
import { demoTrialRequestPost } from "./demo-trial-request-post.js"

export const contentCreationDetectors: SignalDetector[] = [
  problemSolvingPost,
  networkRecommendationPost,
  toolFrustrationPost,
  demoTrialRequestPost,
]
```

**Step 6: Verify TypeScript compiles**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add api/src/signals/detectors/content-creation/
git commit -m "feat: add content creation detectors (2.1, 2.3, 2.5, 2.12)"
```

---

## Task 6: Implement Category 3 — Career Changes detectors (3 critical)

**Files:**
- Create: `api/src/signals/detectors/career-changes/title-change-decision-maker.ts`
- Create: `api/src/signals/detectors/career-changes/company-change.ts`
- Create: `api/src/signals/detectors/career-changes/new-role-icp-match.ts`
- Create: `api/src/signals/detectors/career-changes/index.ts`

**Context:** These detectors use `searchProfiles` with ICP title filters and `getProfile` for detail. They detect people who recently changed roles/companies and now match the ICP. Signals 3.1 and 3.2 are rule-based, 3.3 is AI-based.

**Step 1: Create 3.1 — Title change to decision-maker (rule-based)**

Create `api/src/signals/detectors/career-changes/title-change-decision-maker.ts`:

```typescript
import type { SignalDetector, DetectedSignal } from "../../types.js"

export const titleChangeDecisionMaker: SignalDetector = {
  id: "3.1",
  name: "Title change to decision-maker",
  category: "career-changes",
  strength: "critical",
  scorePoints: 40,
  source: "harvest-profile-search",
  requiresAI: false,

  async detect(ctx): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []

    for (const targetTitle of ctx.icpProfile.titles.slice(0, 5)) {
      const profiles = await ctx.harvest.searchProfiles(targetTitle, {
        title: targetTitle,
        location: ctx.icpProfile.location,
      })

      for (const profile of profiles.slice(0, 20)) {
        // Fetch full profile to check recent changes
        const full = await ctx.harvest.getProfile(profile.linkedinUrl)
        if (!full) continue

        // Check if current position started within last 90 days
        const currentExp = full.experience?.[0]
        if (!currentExp?.startDate?.year) continue

        const startDate = new Date(
          currentExp.startDate.year,
          parseInt(currentExp.startDate.month ?? "1") - 1
        )
        const daysSinceStart = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)

        if (daysSinceStart <= 90 && daysSinceStart >= 0) {
          // Check if title matches ICP target titles
          const titleLower = (currentExp.position ?? "").toLowerCase()
          const isMatch = ctx.icpProfile.titles.some((t) =>
            titleLower.includes(t.toLowerCase())
          )

          if (isMatch) {
            signals.push({
              detectorId: "3.1",
              signalType: "role_change",
              strength: "critical",
              scorePoints: 40,
              linkedinUrl: full.linkedinUrl,
              name: `${full.firstName} ${full.lastName}`,
              headline: full.headline,
              company: currentExp.companyName,
              title: `New ${currentExp.position} at ${currentExp.companyName}`,
              snippet: `Started ${currentExp.position} role within the last 90 days`,
              sourceUrl: full.linkedinUrl,
            })
          }
        }
      }
    }

    return signals
  },
}
```

**Step 2: Create 3.2 — Company change (rule-based)**

Create `api/src/signals/detectors/career-changes/company-change.ts`:

```typescript
import type { SignalDetector, DetectedSignal } from "../../types.js"

export const companyChange: SignalDetector = {
  id: "3.2",
  name: "Company change",
  category: "career-changes",
  strength: "critical",
  scorePoints: 40,
  source: "harvest-profile-search",
  requiresAI: false,

  async detect(ctx): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []

    for (const targetTitle of ctx.icpProfile.titles.slice(0, 5)) {
      const profiles = await ctx.harvest.searchProfiles(targetTitle, {
        title: targetTitle,
        location: ctx.icpProfile.location,
      })

      for (const profile of profiles.slice(0, 20)) {
        const full = await ctx.harvest.getProfile(profile.linkedinUrl)
        if (!full || !full.experience || full.experience.length < 2) continue

        const current = full.experience[0]
        const previous = full.experience[1]

        if (!current.startDate?.year) continue

        // Check if they changed companies recently (within 90 days)
        const startDate = new Date(
          current.startDate.year,
          parseInt(current.startDate.month ?? "1") - 1
        )
        const daysSinceStart = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)

        if (
          daysSinceStart <= 90 &&
          daysSinceStart >= 0 &&
          current.companyName !== previous.companyName
        ) {
          signals.push({
            detectorId: "3.2",
            signalType: "role_change",
            strength: "critical",
            scorePoints: 40,
            linkedinUrl: full.linkedinUrl,
            name: `${full.firstName} ${full.lastName}`,
            headline: full.headline,
            company: current.companyName,
            title: `Moved from ${previous.companyName} to ${current.companyName}`,
            snippet: `Recently changed companies — new ${current.position} at ${current.companyName}`,
            sourceUrl: full.linkedinUrl,
          })
        }
      }
    }

    return signals
  },
}
```

**Step 3: Create 3.3 — New role matching ICP (AI-based)**

Create `api/src/signals/detectors/career-changes/new-role-icp-match.ts`:

```typescript
import type { SignalDetector, DetectedSignal } from "../../types.js"
import { getClaudeClient } from "../../../lib/claude.js"

export const newRoleIcpMatch: SignalDetector = {
  id: "3.3",
  name: "New role matching ICP",
  category: "career-changes",
  strength: "critical",
  scorePoints: 45,
  source: "harvest-profile-search",
  requiresAI: true,

  async detect(ctx): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const claude = getClaudeClient()

    // Search for people who recently posted about new roles
    const posts = await ctx.harvest.searchPosts("#newrole OR #newjob OR \"excited to announce\"", {
      postedLimit: "week",
      sortBy: "date",
    })

    if (posts.length === 0) return signals

    const postTexts = posts
      .slice(0, 20)
      .map(
        (p, i) =>
          `[${i}] ${p.author.name} (${p.author.linkedinUrl}): ${p.content.slice(0, 200)}`
      )
      .join("\n\n")

    const response = await claude.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Analyze these LinkedIn posts about new job announcements. Which posts are from someone who just started a role that matches this ICP (ideal customer profile)?

ICP criteria:
- Target titles: ${ctx.icpProfile.titles.join(", ")}
- Target industries: ${ctx.icpProfile.industries.join(", ")}
- Keywords: ${ctx.icpProfile.keywords.join(", ")}

Posts:
${postTexts}

Return ONLY a JSON array of post indices where the person's new role matches the ICP. Example: [0, 3]
If none, return [].`,
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    let matchIndices: number[] = []
    try {
      const match = text.match(/\[[\d,\s]*\]/)
      if (match) matchIndices = JSON.parse(match[0])
    } catch {
      return signals
    }

    for (const idx of matchIndices) {
      const post = posts[idx]
      if (!post) continue

      signals.push({
        detectorId: "3.3",
        signalType: "role_change",
        strength: "critical",
        scorePoints: 45,
        linkedinUrl: post.author.linkedinUrl,
        name: post.author.name,
        title: "New role matching your ICP",
        snippet: post.content.slice(0, 300),
        sourceUrl: post.linkedinUrl,
      })
    }

    return signals
  },
}
```

**Step 4: Create category index file**

Create `api/src/signals/detectors/career-changes/index.ts`:

```typescript
import type { SignalDetector } from "../../types.js"
import { titleChangeDecisionMaker } from "./title-change-decision-maker.js"
import { companyChange } from "./company-change.js"
import { newRoleIcpMatch } from "./new-role-icp-match.js"

export const careerChangeDetectors: SignalDetector[] = [
  titleChangeDecisionMaker,
  companyChange,
  newRoleIcpMatch,
]
```

**Step 5: Verify TypeScript compiles**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add api/src/signals/detectors/career-changes/
git commit -m "feat: add career changes detectors (3.1, 3.2, 3.3)"
```

---

## Task 7: Implement Category 4 — Hiring detectors (3 critical)

**Files:**
- Create: `api/src/signals/detectors/hiring/key-role-job-posting.ts`
- Create: `api/src/signals/detectors/hiring/job-posting-series.ts`
- Create: `api/src/signals/detectors/hiring/tool-requirement-job.ts`
- Create: `api/src/signals/detectors/hiring/index.ts`

**Context:** These detectors use `searchJobs` to find job postings that indicate buying intent. Signals 4.1 and 4.2 are rule-based, 4.3 is AI-based.

**Step 1: Create 4.1 — Key role job posting (rule-based)**

Create `api/src/signals/detectors/hiring/key-role-job-posting.ts`:

```typescript
import type { SignalDetector, DetectedSignal } from "../../types.js"

export const keyRoleJobPosting: SignalDetector = {
  id: "4.1",
  name: "Key role job posting",
  category: "hiring",
  strength: "critical",
  scorePoints: 35,
  source: "harvest-job-search",
  requiresAI: false,

  async detect(ctx): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []

    for (const title of ctx.icpProfile.titles.slice(0, 5)) {
      const jobs = await ctx.harvest.searchJobs(title, {
        postedLimit: "Past Week",
        sortBy: "date",
      })

      for (const job of jobs.slice(0, 20)) {
        if (!job.company) continue

        // Match: job title contains one of our ICP target titles
        const jobTitleLower = job.title.toLowerCase()
        const isRelevant = ctx.icpProfile.titles.some((t) =>
          jobTitleLower.includes(t.toLowerCase())
        )

        if (!isRelevant) continue

        // Build company LinkedIn URL for the lead
        const companyUrl = job.company.linkedinUrl ?? job.linkedinUrl

        signals.push({
          detectorId: "4.1",
          signalType: "hiring",
          strength: "critical",
          scorePoints: 35,
          linkedinUrl: companyUrl,
          company: job.company.name,
          title: `Hiring: ${job.title}`,
          snippet: (job.descriptionText ?? "").slice(0, 300),
          sourceUrl: job.linkedinUrl,
        })
      }
    }

    return signals
  },
}
```

**Step 2: Create 4.2 — Job posting series (rule-based, aggregation)**

Create `api/src/signals/detectors/hiring/job-posting-series.ts`:

```typescript
import type { SignalDetector, DetectedSignal } from "../../types.js"

export const jobPostingSeries: SignalDetector = {
  id: "4.2",
  name: "Job posting series (3+/month)",
  category: "hiring",
  strength: "critical",
  scorePoints: 45,
  source: "harvest-job-search",
  requiresAI: false,

  async detect(ctx): Promise<DetectedSignal[]> {
    // Track job count per company across all title searches
    const companyJobs = new Map<
      string,
      { companyName: string; companyUrl: string; jobTitles: string[]; sourceUrl: string }
    >()

    for (const title of ctx.icpProfile.titles.slice(0, 5)) {
      const jobs = await ctx.harvest.searchJobs(title, {
        postedLimit: "Past Month",
        sortBy: "date",
      })

      for (const job of jobs) {
        if (!job.company?.name) continue

        const key = job.company.name.toLowerCase()
        const existing = companyJobs.get(key)

        if (existing) {
          if (!existing.jobTitles.includes(job.title)) {
            existing.jobTitles.push(job.title)
          }
        } else {
          companyJobs.set(key, {
            companyName: job.company.name,
            companyUrl: job.company.linkedinUrl ?? job.linkedinUrl,
            jobTitles: [job.title],
            sourceUrl: job.linkedinUrl,
          })
        }
      }
    }

    // Signal: 3+ different job postings from same company in a month
    const signals: DetectedSignal[] = []
    for (const [, company] of companyJobs) {
      if (company.jobTitles.length >= 3) {
        signals.push({
          detectorId: "4.2",
          signalType: "hiring",
          strength: "critical",
          scorePoints: 45,
          linkedinUrl: company.companyUrl,
          company: company.companyName,
          title: `${company.companyName} posted ${company.jobTitles.length} jobs this month`,
          snippet: `Open positions: ${company.jobTitles.slice(0, 5).join(", ")}`,
          sourceUrl: company.sourceUrl,
        })
      }
    }

    return signals
  },
}
```

**Step 3: Create 4.3 — Tool requirement in job posting (AI-based)**

Create `api/src/signals/detectors/hiring/tool-requirement-job.ts`:

```typescript
import type { SignalDetector, DetectedSignal } from "../../types.js"
import { getClaudeClient } from "../../../lib/claude.js"

export const toolRequirementJob: SignalDetector = {
  id: "4.3",
  name: "Tool requirement in job posting",
  category: "hiring",
  strength: "critical",
  scorePoints: 40,
  source: "harvest-job-search",
  requiresAI: true,

  async detect(ctx): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const claude = getClaudeClient()

    for (const title of ctx.icpProfile.titles.slice(0, 3)) {
      const jobs = await ctx.harvest.searchJobs(title, {
        postedLimit: "Past Week",
        sortBy: "date",
      })

      const jobsWithDesc = jobs
        .filter((j) => j.descriptionText && j.descriptionText.length > 50)
        .slice(0, 10)

      if (jobsWithDesc.length === 0) continue

      const jobTexts = jobsWithDesc
        .map((j, i) => `[${i}] ${j.company?.name ?? "Unknown"} — ${j.title}: ${(j.descriptionText ?? "").slice(0, 400)}`)
        .join("\n\n")

      const response = await claude.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Analyze these job descriptions. Which ones mention a requirement or preference for tools/platforms in these categories: ${ctx.icpProfile.keywords.join(", ")}?

Look for mentions of similar tools, competing products, or the category of tool itself in requirements, nice-to-haves, or job responsibilities.

Job descriptions:
${jobTexts}

Return ONLY a JSON array of job indices. Example: [0, 2]
If none, return [].`,
          },
        ],
      })

      const text = response.content[0].type === "text" ? response.content[0].text : ""
      let matchIndices: number[] = []
      try {
        const match = text.match(/\[[\d,\s]*\]/)
        if (match) matchIndices = JSON.parse(match[0])
      } catch {
        continue
      }

      for (const idx of matchIndices) {
        const job = jobsWithDesc[idx]
        if (!job) continue

        signals.push({
          detectorId: "4.3",
          signalType: "hiring",
          strength: "critical",
          scorePoints: 40,
          linkedinUrl: job.company?.linkedinUrl ?? job.linkedinUrl,
          company: job.company?.name,
          title: `Job requires your type of tool: ${job.title}`,
          snippet: (job.descriptionText ?? "").slice(0, 300),
          sourceUrl: job.linkedinUrl,
        })
      }
    }

    return signals
  },
}
```

**Step 4: Create category index file**

Create `api/src/signals/detectors/hiring/index.ts`:

```typescript
import type { SignalDetector } from "../../types.js"
import { keyRoleJobPosting } from "./key-role-job-posting.js"
import { jobPostingSeries } from "./job-posting-series.js"
import { toolRequirementJob } from "./tool-requirement-job.js"

export const hiringDetectors: SignalDetector[] = [
  keyRoleJobPosting,
  jobPostingSeries,
  toolRequirementJob,
]
```

**Step 5: Verify TypeScript compiles**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add api/src/signals/detectors/hiring/
git commit -m "feat: add hiring detectors (4.1, 4.2, 4.3)"
```

---

## Task 8: Create registry and runner

**Files:**
- Create: `api/src/signals/registry.ts`
- Create: `api/src/signals/runner.ts`

**Context:** The registry collects all detectors into a flat array. The runner orchestrates: loads ICP, runs detectors sequentially (respecting rate limits), deduplicates, scores, and stores results in Supabase using existing tables (`signals`, `leads`, `lead_signals`).

**Step 1: Create the registry**

Create `api/src/signals/registry.ts`:

```typescript
import type { SignalDetector } from "./types.js"
import { contentEngagementDetectors } from "./detectors/content-engagement/index.js"
import { contentCreationDetectors } from "./detectors/content-creation/index.js"
import { careerChangeDetectors } from "./detectors/career-changes/index.js"
import { hiringDetectors } from "./detectors/hiring/index.js"

export const allDetectors: SignalDetector[] = [
  ...contentEngagementDetectors,
  ...contentCreationDetectors,
  ...careerChangeDetectors,
  ...hiringDetectors,
]
```

**Step 2: Create the runner**

Create `api/src/signals/runner.ts`:

```typescript
import { supabaseAdmin } from "../lib/supabase.js"
import * as harvest from "./sources/harvest-api.js"
import { allDetectors } from "./registry.js"
import type { DetectionContext, DetectedSignal } from "./types.js"

export type SignalRunResult = {
  searchRunId: string
  detectorsRun: number
  signalsFound: number
  leadsCreated: number
  leadsUpdated: number
  errors: Array<{ detectorId: string; error: string }>
}

export async function runSignalDetection(
  userId: string,
  icpProfileId: string
): Promise<SignalRunResult> {
  // 1. Load ICP profile
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
      trigger_type: "manual",
      status: "running",
    })
    .select()
    .single()

  if (runError) throw runError

  try {
    // 3. Build detection context
    const ctx: DetectionContext = {
      icpProfile: icp.parsed_config,
      userId,
      harvest: {
        searchPosts: harvest.searchPosts,
        getPostComments: harvest.getPostComments,
        getProfile: harvest.getProfile,
        searchProfiles: harvest.searchProfiles,
        searchJobs: harvest.searchJobs,
      },
    }

    // 4. Run each detector sequentially
    const allSignals: DetectedSignal[] = []
    const errors: Array<{ detectorId: string; error: string }> = []

    for (const detector of allDetectors) {
      try {
        console.log(`[signals] Running detector ${detector.id}: ${detector.name}`)
        const detected = await detector.detect(ctx)
        console.log(`[signals] Detector ${detector.id} found ${detected.length} signals`)
        allSignals.push(...detected)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[signals] Detector ${detector.id} failed: ${message}`)
        errors.push({ detectorId: detector.id, error: message })
      }
    }

    // 5. Deduplicate: same person + same detector = keep first
    const seen = new Set<string>()
    const uniqueSignals = allSignals.filter((s) => {
      const key = `${s.linkedinUrl}::${s.detectorId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    console.log(`[signals] Total: ${allSignals.length}, Unique: ${uniqueSignals.length}`)

    // 6. Store signals in Supabase
    const signalInserts = uniqueSignals.map((s) => ({
      user_id: userId,
      icp_profile_id: icpProfileId,
      source_url: s.sourceUrl,
      signal_type: s.signalType,
      title: s.title,
      snippet: s.snippet,
      raw_data: {
        detectorId: s.detectorId,
        strength: s.strength,
        scorePoints: s.scorePoints,
        linkedinUrl: s.linkedinUrl,
        name: s.name,
        headline: s.headline,
        company: s.company,
      },
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

    // 7. Group signals by person (linkedinUrl) and score
    const personSignals = new Map<
      string,
      {
        signals: DetectedSignal[]
        signalDbIds: string[]
      }
    >()

    for (let i = 0; i < uniqueSignals.length; i++) {
      const signal = uniqueSignals[i]
      const dbId = insertedSignals[i]?.id
      const key = signal.linkedinUrl

      const existing = personSignals.get(key)
      if (existing) {
        existing.signals.push(signal)
        if (dbId) existing.signalDbIds.push(dbId)
      } else {
        personSignals.set(key, {
          signals: [signal],
          signalDbIds: dbId ? [dbId] : [],
        })
      }
    }

    // 8. Score and upsert leads
    let leadsCreated = 0
    let leadsUpdated = 0

    for (const [linkedinUrl, data] of personSignals) {
      // Calculate score: sum of scorePoints with diminishing returns
      const sortedByScore = [...data.signals].sort((a, b) => b.scorePoints - a.scorePoints)
      let totalScore = 0
      for (let i = 0; i < sortedByScore.length; i++) {
        // First signal: full points, subsequent: 70% diminishing
        totalScore += sortedByScore[i].scorePoints * Math.pow(0.7, i)
      }
      const intentScore = Math.min(100, Math.round(totalScore))

      // Collect signal types
      const signalTypes = [...new Set(data.signals.map((s) => s.signalType))]

      // Build summary
      const topSignal = sortedByScore[0]
      const intentSummary = data.signals.length === 1
        ? topSignal.title
        : `${topSignal.title} + ${data.signals.length - 1} more signals`

      // Get person info from first signal that has it
      const name = data.signals.find((s) => s.name)?.name ?? "Unknown"
      const headline = data.signals.find((s) => s.headline)?.headline ?? ""
      const company = data.signals.find((s) => s.company)?.company ?? ""

      // Check if lead already exists
      const { data: existing } = await supabaseAdmin
        .from("leads")
        .select("id, intent_score, signal_types")
        .eq("user_id", userId)
        .eq("linkedin_url", linkedinUrl)
        .single()

      if (existing) {
        const mergedSignals = [...new Set([...existing.signal_types, ...signalTypes])]
        const newScore = Math.max(existing.intent_score, intentScore)

        await supabaseAdmin
          .from("leads")
          .update({
            intent_score: newScore,
            intent_summary: intentSummary,
            signal_types: mergedSignals,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)

        // Link signals
        const links = data.signalDbIds.map((sid) => ({
          lead_id: existing.id,
          signal_id: sid,
        }))
        if (links.length > 0) {
          await supabaseAdmin
            .from("lead_signals")
            .upsert(links, { onConflict: "lead_id,signal_id" })
        }

        leadsUpdated++
      } else {
        const { data: newLead, error: leadError } = await supabaseAdmin
          .from("leads")
          .insert({
            user_id: userId,
            linkedin_url: linkedinUrl,
            name,
            headline,
            company,
            intent_score: intentScore,
            intent_summary: intentSummary,
            signal_types: signalTypes,
            status: "new",
          })
          .select("id")
          .single()

        if (leadError) throw leadError

        // Link signals
        const links = data.signalDbIds.map((sid) => ({
          lead_id: newLead.id,
          signal_id: sid,
        }))
        if (links.length > 0) {
          await supabaseAdmin
            .from("lead_signals")
            .upsert(links, { onConflict: "lead_id,signal_id" })
        }

        leadsCreated++
      }
    }

    // 9. Update search run as completed
    await supabaseAdmin
      .from("search_runs")
      .update({
        queries_used: allDetectors.length,
        signals_found: uniqueSignals.length,
        leads_created: leadsCreated,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", searchRun.id)

    const result: SignalRunResult = {
      searchRunId: searchRun.id,
      detectorsRun: allDetectors.length,
      signalsFound: uniqueSignals.length,
      leadsCreated,
      leadsUpdated,
      errors,
    }

    console.log(`[signals] Done!`, result)
    return result
  } catch (err) {
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

**Step 3: Verify TypeScript compiles**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add api/src/signals/registry.ts api/src/signals/runner.ts
git commit -m "feat: add signal registry and runner with scoring and dedup"
```

---

## Task 9: Create API route and wire into Express

**Files:**
- Create: `api/src/routes/signals.ts`
- Modify: `api/src/index.ts`

**Step 1: Create the signals route**

Create `api/src/routes/signals.ts`:

```typescript
import { Router } from "express"
import { requireAuth } from "../middleware/auth.js"
import { runSignalDetection } from "../signals/runner.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { allDetectors } from "../signals/registry.js"

export const signalsRouter = Router()
signalsRouter.use(requireAuth)

// POST /api/signals/run — trigger signal detection
signalsRouter.post("/run", async (req, res, next) => {
  try {
    // Get active ICP profile
    const { data: icp, error: icpError } = await supabaseAdmin
      .from("icp_profiles")
      .select("id")
      .eq("user_id", req.userId)
      .eq("is_active", true)
      .single()

    if (icpError || !icp) {
      res.status(400).json({ error: "No active ICP profile found" })
      return
    }

    // Run in background (don't await)
    const runPromise = runSignalDetection(req.userId, icp.id)

    // Return immediately
    res.json({
      status: "started",
      message: `Running ${allDetectors.length} signal detectors`,
      detectors: allDetectors.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        strength: d.strength,
      })),
    })

    // Log result when done
    runPromise
      .then((result) => console.log("[signals] Run completed:", result))
      .catch((err) => console.error("[signals] Run failed:", err))
  } catch (err) {
    next(err)
  }
})

// GET /api/signals/detectors — list available detectors
signalsRouter.get("/detectors", (_req, res) => {
  res.json({
    detectors: allDetectors.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      strength: d.strength,
      scorePoints: d.scorePoints,
      source: d.source,
      requiresAI: d.requiresAI,
    })),
    total: allDetectors.length,
  })
})
```

**Step 2: Wire into Express app**

In `api/src/index.ts`, add import:

```typescript
import { signalsRouter } from "./routes/signals.js"
```

Add route after the onboarding router line:

```typescript
app.use("/api/signals", signalsRouter)
```

**Step 3: Verify TypeScript compiles**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add api/src/routes/signals.ts api/src/index.ts
git commit -m "feat: add /api/signals route and wire into Express"
```

---

## Task 10: Manual integration test

**Step 1: Start the API server**

Run: `cd api && npm run dev`
Expected: `API running on http://localhost:3001`

**Step 2: Test detector listing**

Run: `curl http://localhost:3001/api/signals/detectors | jq .`
Expected: JSON with 13 detectors listed

**Step 3: Test signal detection (requires auth token and valid ICP)**

Get a valid auth token from the frontend (check browser devtools → Network → any API request → Authorization header). Then:

```bash
curl -X POST http://localhost:3001/api/signals/run \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json"
```

Expected: `{ status: "started", message: "Running 13 signal detectors", detectors: [...] }`

Check server logs for detector progress and results.

**Step 4: Verify results in database**

After the run completes (check server logs), verify:
- New signals in `signals` table
- New/updated leads in `leads` table
- Junction records in `lead_signals` table

**Step 5: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: integration test fixes for signal detection"
```
