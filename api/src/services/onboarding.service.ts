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

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    const summary = calculateIntentSummary(currentState)
    return { reply: text, stateUpdates: {}, intentSummary: summary }
  }

  let parsed: { reply: string; stateUpdates: Partial<OnboardingState> }
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    const summary = calculateIntentSummary(currentState)
    return { reply: text, stateUpdates: {}, intentSummary: summary }
  }

  const updatedState = mergeState(currentState, parsed.stateUpdates)
  const intentSummary = calculateIntentSummary(updatedState)

  return { reply: parsed.reply, stateUpdates: parsed.stateUpdates, intentSummary }
}

function mergeState(current: OnboardingState, updates: Partial<OnboardingState>): OnboardingState {
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
