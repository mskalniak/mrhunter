# Onboarding Chat + Intent Dashboard — Design

**Date:** 2026-02-26
**Status:** Approved
**Scope:** Chat AI + Intent Dashboard (formularz = V2)

## Overview

Redesign onboarding from a single textarea to a conversational AI chat with a live intent dashboard. The AI extrapolates user data from natural conversation and progressively unlocks intent signals, gamifying the onboarding process.

## Architecture

### Layout (desktop: 50/50 split)

```
┌──────────────────────────────────────────────────────┐
│  Logo    Onboarding                                  │
├──────────────────────┬───────────────────────────────┤
│  CHAT AI             │  INTENT DASHBOARD             │
│                      │  43/107 intents unlocked      │
│  AI welcome msg      │  [progress bar]               │
│  User messages       │  Category breakdown           │
│  AI responses with   │  Critical/high counters       │
│  ✅ confirmations    │  Dynamic hint                 │
│                      │                               │
│  [input + send]      │                               │
├──────────────────────┴───────────────────────────────┤
│  Progress bar          [Skip & Start →]              │
└──────────────────────────────────────────────────────┘
```

Mobile: dashboard collapses to top panel.

### Data Flow

1. User sends message → `POST /api/onboarding/chat` with `{ message, currentState, chatHistory }`
2. Backend: Claude parses + extrapolates → calculates intent summary (server-side, rules never exposed) → returns JSON
3. Frontend: updates chat + state + intent dashboard
4. User clicks "Start" → `POST /api/onboarding/complete` with full state → creates ICP + triggers search

### IP Protection

Intent calculation rules stay server-side. Frontend only receives:
- Total unlocked count (43/107)
- Category names with progress (e.g. "Content engagement 9/12")
- Critical/high aggregate counts
- Hint text (what to provide next)

Frontend NEVER sees: which fields unlock which intents, scoring weights, individual signal definitions.

## Chat UI

### Welcome Message

AI sends automatically on mount:
> "Cześć! Jestem tu, żeby skonfigurować Twoje intent signals — sygnały, dzięki którym będziesz rozmawiać z ludźmi, którzy WŁAŚNIE szukają tego, co oferujesz.
>
> Powiedz mi w kilku zdaniach: czym się zajmujesz i kogo szukasz jako klientów?"

### Message Bubbles

- AI: left-aligned, gray background
- User: right-aligned, purple background (matching existing `bg-purple-600`)
- After each AI response: `✅` list of confirmed fields + intent delta (`→ +27 intentów → 32/107`)

### Input

- Text input at bottom with Send button
- "Skip question" button alongside
- Typing indicator (Loader2 spinner) while AI processes

### Conversation Flow

Priority order for AI questions (after initial extrapolation):
1. Competitors (9 intents, 4 critical) — REQUIRED
2. Target company size (3 intents) — REQUIRED
3. Target location (4 intents) — REQUIRED
4. Target accounts (10 intents) — optional
5. Existing customers (4 intents) — optional
6. Thought leaders (4 intents) — optional
7. Hiring signal roles (6 intents) — optional
8+ Tech stack, events, groups, fiscal year — optional

User can say "skip" at any point to finish.

## Intent Dashboard

Fixed right panel with:

1. **Main counter** — large "43 / 107" with progress bar
2. **Critical/High counters** — "🔴 12 critical | 🟠 15 high"
3. **Category breakdown** — list with mini progress bars per category
4. **Dynamic hint** — "Podaj nazwy konkurentów, aby odblokować 9 nowych intentów"
5. **Animation** — counter grows with CSS ease-out transition

## OnboardingState Model

```typescript
interface OnboardingState {
  companyName: string | null;
  companyLinkedInUrl: string | null;
  businessType: 'agency' | 'saas' | 'services' | 'solo' | 'other' | null;
  teamProfiles: string[];
  targetJobTitles: string[];
  targetIndustries: string[];
  targetCompanySize: string | null;
  targetLocations: string[];
  problemKeywords: string[];
  productCategoryPhrases: string[];
  industryHashtags: string[];
  competitors: { name: string; linkedInUrl?: string; source: 'user' | 'ai-suggested' }[];
  targetAccounts: { name: string; linkedInUrl?: string; source: 'user' | 'ai-suggested' }[];
  existingCustomers: { name: string; linkedInUrl?: string; source: 'user' | 'ai-suggested' }[];
  thoughtLeaders: string[];
  hiringSignalRoles: string[];
  targetTechStack: string[];
  industryEvents: string[];
  linkedInGroups: string[];
  fiscalYearStart: number | null;
}
```

## API

### POST /api/onboarding/chat

```typescript
// Request
{
  message: string;
  currentState: OnboardingState;
  chatHistory: { role: 'user' | 'assistant'; content: string }[];
}

// Response
{
  reply: string;
  stateUpdates: Partial<OnboardingState>;
  intentSummary: {
    total: number;
    maxTotal: number;
    critical: number;
    high: number;
    categories: { label: string; unlocked: number; max: number }[];
    hint: string | null;
  };
}
```

### POST /api/onboarding/complete

```typescript
// Request
{ state: OnboardingState }

// Response
{ success: boolean; icpProfileId: string }
```

Converts OnboardingState → ParsedIcpConfig, generates search queries, triggers pipeline.

## Tech Decisions

- No Framer Motion — CSS transitions for counter/progress animations
- Chat history in React state (not persisted to DB during onboarding)
- Auto-save state to localStorage as backup
- Claude system prompt per Onboarding_Implementation_Plan.md
- Non-streaming response (JSON parsing simpler; streaming = V2)

## Out of Scope (V2)

- Form mode (toggle between chat and form)
- Streaming AI responses
- LinkedIn URL auto-resolve
- Smart auto-suggestions for competitors
- Progressive onboarding (post-signup nudges)
