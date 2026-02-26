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

const ALWAYS_UNLOCKED_INTENTS = 5
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
