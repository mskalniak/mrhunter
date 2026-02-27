export type SignalType =
  | "hiring"
  | "pain_point"
  | "competitor_engagement"
  | "funding"
  | "role_change"
  | "event"

export type SignalStrength = "critical" | "high" | "medium" | "low"

export type SignalCategory =
  | "content-engagement"
  | "content-creation"
  | "career-changes"
  | "hiring"

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
  photo_url: string | null
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
