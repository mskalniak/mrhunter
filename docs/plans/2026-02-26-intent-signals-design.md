# Intent Signals System — Design Document

**Data:** 2026-02-26
**Status:** Approved

## Goal

Implement an extensible intent signal detection system using the Signal Detector Pattern — one file per signal, organized by category, with a central registry and runner. Data source: HarvestAPI. Priority: categories 1-4 (content engagement, content creation, career changes, hiring) — 43 signals total, 13 critical first.

## Architecture

Each intent signal is a separate file implementing a `SignalDetector` interface. Detectors are organized by category in `api/src/signals/detectors/`. A registry collects all active detectors, and a runner orchestrates execution with rate limiting and deduplication. HarvestAPI client is injected into detectors via `DetectionContext` for testability.

**Tech Stack:** TypeScript, HarvestAPI, Claude AI (for AI-based detectors), Supabase (storage), Zod (validation)

---

## Core Types (`api/src/signals/types.ts`)

```typescript
type SignalStrength = "critical" | "high" | "medium" | "low"
type SignalCategory = "content-engagement" | "content-creation" | "career-changes" | "hiring"

interface DetectionContext {
  icpProfile: ParsedIcpConfig      // competitors, keywords, titles, industries
  userId: string
  harvestApi: HarvestApiClient      // injected, testable
}

interface DetectedSignal {
  detectorId: string                // "1.1", "2.3"
  signalType: SignalType            // maps to existing "hiring", "pain_point", etc.
  strength: SignalStrength
  scorePoints: number               // 1-50
  linkedinUrl: string               // person profile
  name?: string
  headline?: string
  company?: string
  title: string                     // signal title
  snippet: string                   // evidence text
  sourceUrl: string                 // post/job/profile URL
}

interface SignalDetector {
  id: string                        // "1.1"
  name: string                      // "Competitor post comment"
  category: SignalCategory
  strength: SignalStrength
  scorePoints: number
  source: string                    // "harvest-post-comments"
  requiresAI: boolean
  detect(ctx: DetectionContext): Promise<DetectedSignal[]>
}
```

## HarvestAPI Client (`api/src/signals/sources/harvest-api.ts`)

4 main endpoints covering categories 1-4:

| Endpoint | Signals |
|----------|---------|
| **Post Comments** | 1.1, 1.2, 1.3, 1.4, 1.7, 1.9, 1.10, 1.12 |
| **Post Search** | 1.6, 1.8, 2.1-2.12 |
| **Profile Scraper** | 3.1-3.10 |
| **Job Search** | 4.1-4.9 |

```typescript
class HarvestApiClient {
  searchPosts(query: string, opts?: PostSearchOpts): Promise<HarvestPost[]>
  getPostComments(postUrn: string): Promise<HarvestComment[]>
  scrapeProfile(linkedinUrl: string): Promise<HarvestProfile>
  searchJobs(query: string, opts?: JobSearchOpts): Promise<HarvestJob[]>
}
```

Typed responses, retry logic, rate limiting built-in.

## Directory Structure

```
api/src/signals/
├── types.ts                          # SignalDetector interface, DetectedSignal, etc.
├── registry.ts                       # all active detectors flat array
├── runner.ts                         # orchestration: load ICP, run detectors, store results
├── sources/
│   └── harvest-api.ts                # HarvestAPI client
└── detectors/
    ├── content-engagement/           # Category 1 (12 signals)
    │   ├── competitor-post-comment.ts
    │   ├── competitor-post-reaction.ts
    │   ├── solution-question-comment.ts
    │   ├── thought-leader-comment.ts
    │   ├── industry-article-share.ts
    │   ├── reaction-series.ts
    │   ├── negative-tool-sentiment.ts
    │   ├── comparison-post-like.ts
    │   ├── customer-case-study-comment.ts
    │   ├── active-commenter.ts
    │   ├── industry-poll-reaction.ts
    │   ├── colleague-tagging.ts
    │   └── index.ts
    ├── content-creation/             # Category 2 (12 signals)
    │   ├── problem-solving-post.ts
    │   ├── industry-challenges-article.ts
    │   ├── network-recommendation-post.ts
    │   ├── new-process-implementation.ts
    │   ├── tool-frustration-post.ts
    │   ├── funding-celebration-post.ts
    │   ├── hiring-post.ts
    │   ├── conference-reflection-post.ts
    │   ├── strategic-changes-post.ts
    │   ├── industry-hashtag-post.ts
    │   ├── posting-frequency-increase.ts
    │   ├── demo-trial-request-post.ts
    │   └── index.ts
    ├── career-changes/               # Category 3 (10 signals)
    │   ├── title-change-decision-maker.ts
    │   ├── company-change.ts
    │   ├── new-role-icp-match.ts
    │   ├── internal-promotion.ts
    │   ├── new-role-celebration.ts
    │   ├── headline-update.ts
    │   ├── new-skill-added.ts
    │   ├── location-change.ts
    │   ├── about-section-update.ts
    │   ├── certification-added.ts
    │   └── index.ts
    └── hiring/                       # Category 4 (9 signals)
        ├── key-role-job-posting.ts
        ├── job-posting-series.ts
        ├── tool-requirement-job.ts
        ├── revops-sales-ops-role.ts
        ├── headcount-growth.ts
        ├── replacement-hire.ts
        ├── new-location-job.ts
        ├── hiring-freeze-ended.ts
        ├── target-tech-experience-job.ts
        └── index.ts
```

## Detector Examples

### Rule-based (1.1 — Competitor post comment)

```typescript
export const competitorPostComment: SignalDetector = {
  id: "1.1",
  name: "Competitor post comment",
  category: "content-engagement",
  strength: "critical",
  scorePoints: 40,
  source: "harvest-post-comments",
  requiresAI: false,
  async detect(ctx) {
    const signals: DetectedSignal[] = []
    for (const competitor of ctx.icpProfile.competitors) {
      const posts = await ctx.harvestApi.searchPosts(competitor, { limit: 20 })
      for (const post of posts) {
        const comments = await ctx.harvestApi.getPostComments(post.urn)
        for (const comment of comments) {
          signals.push({
            detectorId: "1.1",
            signalType: "competitor_engagement",
            strength: "critical",
            scorePoints: 40,
            linkedinUrl: comment.authorProfileUrl,
            name: comment.authorName,
            title: `Commented on ${competitor} post`,
            snippet: comment.text.slice(0, 300),
            sourceUrl: post.url,
          })
        }
      }
    }
    return signals
  }
}
```

### AI-based (1.3 — Solution question comment)

```typescript
export const solutionQuestionComment: SignalDetector = {
  id: "1.3",
  name: "Solution question comment",
  category: "content-engagement",
  strength: "critical",
  scorePoints: 45,
  source: "harvest-post-comments",
  requiresAI: true,
  async detect(ctx) {
    // Same data source as 1.1, but filters via AI classification
    // Claude classifies: "Is this comment asking about a solution to problem X?"
    // Only returns comments where AI confirms solution-seeking intent
  }
}
```

## Registry & Runner

**Registry** (`registry.ts`) — flat array of all detectors:
```typescript
import { contentEngagementDetectors } from "./detectors/content-engagement"
import { contentCreationDetectors } from "./detectors/content-creation"
import { careerChangeDetectors } from "./detectors/career-changes"
import { hiringDetectors } from "./detectors/hiring"

export const allDetectors: SignalDetector[] = [
  ...contentEngagementDetectors,
  ...contentCreationDetectors,
  ...careerChangeDetectors,
  ...hiringDetectors,
]
```

**Runner** (`runner.ts`) — orchestration:
```typescript
async function runSignalDetection(userId: string, icpProfileId: string): Promise<RunResult> {
  // 1. Load ICP profile from Supabase
  // 2. Create HarvestApiClient instance
  // 3. Build DetectionContext { icpProfile, userId, harvestApi }
  // 4. Run each detector sequentially (respect rate limits)
  // 5. Deduplicate by linkedinUrl + detectorId
  // 6. Store signals in Supabase `signals` table
  // 7. Score leads: sum scorePoints per person + recency bonus + ICP match bonus
  // 8. Upsert leads in `leads` table, link via `lead_signals`
  // 9. Return RunResult summary
}
```

## Integration with Existing Code

- **New route**: `POST /api/signals/run` — triggers signal detection manually
- **Coexistence**: New runner works alongside existing Serper pipeline, does not replace it
- **Scoring**: Detectors return `scorePoints` per signal — summed per lead + recency bonus + ICP match bonus
- **Database**: Uses existing tables: `signals`, `leads`, `lead_signals`
- **Env config**: Add `HARVEST_API_KEY` to `.env` and `env.ts`

## MVP Priority — 13 Critical Signals First

| ID | Signal | AI? | Category |
|----|--------|-----|----------|
| 1.1 | Competitor post comment | Rule | content-engagement |
| 1.3 | Solution question comment | AI | content-engagement |
| 1.6 | Reaction series (3+ in 7 days) | AI | content-engagement |
| 1.7 | Negative tool sentiment | AI | content-engagement |
| 2.1 | Problem-solving post | AI | content-creation |
| 2.3 | Network recommendation post | AI | content-creation |
| 2.5 | Tool frustration post | AI | content-creation |
| 2.12 | Demo/trial request post | AI | content-creation |
| 3.1 | Title change to decision-maker | Rule | career-changes |
| 3.2 | Company change | Rule | career-changes |
| 3.3 | New role matching ICP | AI | career-changes |
| 4.1 | Key role job posting | Rule | hiring |
| 4.2 | Job posting series (3+/month) | Rule | hiring |
| 4.3 | Tool requirement in job posting | AI | hiring |

Remaining 30 non-critical signals from categories 1-4 to be added as follow-up.

## Scoring Model

| Element | Points | Logic |
|---------|--------|-------|
| Critical signal | +30-50 | 1 signal sufficient for outreach |
| High signal | +15-25 | 2-3 = outreach ready |
| Medium signal | +5-10 | Context |
| Low signal | +1-3 | Amplifier |
| ICP match bonus | +20-40 | Multiplier |
| Recency bonus | x1.5-2.0 | 7 days > month |
| Multi-stakeholder | +25 | 2+ people from same company |
| **Outreach threshold** | **70+** | Auto outreach |
| **Digest threshold** | **40-69** | Daily digest review |
