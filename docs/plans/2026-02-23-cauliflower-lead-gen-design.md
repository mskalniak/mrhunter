# Cauliflower — LinkedIn Lead Generation System Design

**Date:** 2026-02-23
**Status:** Approved

## Overview

Cauliflower is a LinkedIn lead generation system for solo makers and small sales teams. It finds high-intent B2B leads by searching Google's index of LinkedIn content via Serper.dev, scores them with Claude AI against a user-defined ICP, and presents them in a ranked dashboard.

**Core value prop:** Automated intent signal detection + AI scoring. No outreach automation (yet). No email enrichment (yet). Users connect with leads directly on LinkedIn.

## Stack

Reusing existing monorepo stack:

- **Frontend:** React 19 + Vite + TanStack Query + Radix UI + Tailwind CSS
- **Backend:** Express 5 + TypeScript
- **Database:** Supabase (PostgreSQL + Auth with email/OTP + RLS)
- **Deployment:** Vercel (+ Vercel Cron for scheduled searches)
- **Shared:** packages/shared for types, hooks, constants

**New external APIs:**

- **Serper.dev** — Google Search API (~$1/1K queries)
- **Claude API (Anthropic)** — ICP parsing + lead scoring (Haiku for scoring)

## Architecture

```
User defines ICP (natural language)
  -> Claude API parses into structured config + Google dork queries
  -> Serper.dev runs queries (site:linkedin.com/posts, /jobs, /in/)
  -> Results stored as raw signals in Supabase
  -> Claude API scores & deduplicates leads
  -> Dashboard shows ranked leads with intent signals
```

**Automation:** Daily Vercel Cron + user-triggered manual search.

## Database Schema

### icp_profiles

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK | auth.users |
| raw_prompt | TEXT | User's natural language ICP description |
| parsed_config | JSONB | Claude-parsed: titles, industries, keywords, competitors |
| search_queries | JSONB | Generated Google dork queries |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### signals

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK | |
| icp_profile_id | UUID FK | |
| source_url | TEXT | LinkedIn post/profile/job URL |
| signal_type | TEXT | hiring, pain_point, competitor_engagement, funding, role_change, event |
| title | TEXT | Search result title |
| snippet | TEXT | Search result snippet |
| raw_data | JSONB | Full Serper response for this result |
| search_batch_id | UUID | Groups results from same search run |
| created_at | TIMESTAMPTZ | |

### leads

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK | |
| linkedin_url | TEXT UNIQUE | Dedupe key |
| name | TEXT | |
| headline | TEXT | Job title / headline |
| company | TEXT | |
| intent_score | INTEGER | 0-100, Claude-assigned |
| intent_summary | TEXT | Why this person is a lead |
| signal_types | TEXT[] | Array of signal types detected |
| status | TEXT | new, viewed, saved, dismissed |
| first_seen_at | TIMESTAMPTZ | |
| last_seen_at | TIMESTAMPTZ | Updated when new signals found |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### lead_signals (junction)

| Column | Type | Description |
|--------|------|-------------|
| lead_id | UUID FK | |
| signal_id | UUID FK | |
| PRIMARY KEY | (lead_id, signal_id) | |

### search_runs

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK | |
| icp_profile_id | UUID FK | |
| trigger_type | TEXT | cron, manual |
| queries_used | INTEGER | Serper queries consumed |
| signals_found | INTEGER | Results count |
| leads_created | INTEGER | New leads after dedup/scoring |
| status | TEXT | running, completed, failed |
| error | TEXT | |
| started_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |

All tables have RLS policies scoped to user_id.

## Signal Detection Engine

### Step 1: ICP Parsing (Claude API)

User input: natural language ICP description.
Claude output: structured config + Google dork queries.

Example queries generated:

- **Pain points:** `site:linkedin.com/posts "CTO" OR "VP of Engineering" "struggling with" OR "looking for" "keyword"`
- **Hiring:** `site:linkedin.com/jobs "SaaS" "developer tools" engineer`
- **Role changes:** `site:linkedin.com/posts "excited to announce" OR "new role" "CTO" "SaaS"`
- **Funding:** `site:linkedin.com "raised" OR "funding" OR "Series A" "keyword"`
- **Competitor engagement:** `site:linkedin.com/posts "competitor_name"`
- **Events:** `site:linkedin.com/posts "attending" OR "speaking at" "industry event keyword"`

### Step 2: Search Execution (Serper.dev)

- 5-15 queries per ICP per search run
- 10-30 results per query
- ~50-150 Serper credits per run (~$0.05-$0.15)

### Step 3: Scoring (Claude Haiku)

Batch results sent to Claude with ICP context. Returns per lead:
- name, headline, company (extracted)
- linkedin_url
- intent_score (0-100)
- intent_summary (1 sentence)
- signal_types

~$0.0005 per scoring batch of 30 results.

### Step 4: Storage & Dedup

- Check linkedin_url existence in leads table
- Existing: update last_seen_at, add new signals, recalculate score
- New: insert lead + link signals
- Multiple signals over time strengthen score

### Cost per user per day: ~$0.11

## API Endpoints

```
POST   /api/icp              — Create ICP profile
GET    /api/icp              — Get active ICP profile
PUT    /api/icp/:id          — Update ICP

POST   /api/search/run       — Trigger manual search
GET    /api/search/history   — List past search runs

GET    /api/leads            — List leads (paginated, filterable)
GET    /api/leads/:id        — Lead detail with signals
PATCH  /api/leads/:id        — Update lead status

POST   /api/cron/search      — Vercel Cron daily trigger (CRON_SECRET protected)
```

## Frontend Pages

### 1. Onboarding

- Single text area: "Describe your ideal customer"
- "Start Hunting" button
- Loading state while Claude parses + first search runs
- Redirect to Dashboard

### 2. Dashboard (home)

- Ranked list of leads with intent scores
- Color-coded score badges (green 80+, yellow 50-79, gray <50)
- Each lead shows: name, headline, company, snippet, signal types
- Filters: signal type, score range, status
- "Run Search" button for manual trigger
- Click to expand lead detail

### 3. Lead Detail (expandable/side panel)

- Full signal history
- All LinkedIn snippets
- Intent score breakdown
- LinkedIn profile link
- Save / Dismiss actions

### 4. Settings

- Edit ICP
- Add/remove competitors
- Account management

### 5. Search History

- Past search runs with stats
- API usage visibility

### Navigation

Top bar or sidebar: Dashboard | Search History | Settings

## Cleanup Required

Delete all existing features before building:

- web/src/features/habits/ (entire directory)
- web/src/features/notes/ (entire directory)
- api/src/routes/habits.ts
- api/src/services/habits.service.ts
- api/supabase/migrations/001_habits_schema.sql
- packages/shared/src/types/habits.ts
- packages/shared/src/hooks/habits/
- packages/shared/src/constants/ (habit-related)
- web/src/lib/mock-api.ts
- Navigation config references to old features

## Future Enhancements (not MVP)

- Email enrichment (Hunter.io / Proxycurl)
- Automated LinkedIn outreach
- CRM integrations (HubSpot, Pipedrive)
- Multi-ICP profiles per user
- Team/workspace features
- Slack notifications for high-score leads
