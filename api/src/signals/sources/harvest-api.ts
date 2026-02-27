import { getRequiredApifyEnv } from "../../config/env.js"

// ── Types ──────────────────────────────────────────────────────────────

export type HarvestPostAuthor = {
  publicIdentifier: string
  universalName?: string
  type?: string
  name: string
  linkedinUrl: string
  info?: string
  avatar?: string | { url: string; width?: number; height?: number }
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
    id?: string
    likes?: number
    comments?: number
    shares?: number
    reactions?: Array<{ type: string; count: number }>
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
  profilePicture?: { url: string }
  connectionsCount?: number
  followerCount?: number
  openToWork?: boolean
  hiring?: boolean
  location?: {
    linkedinText: string
    parsed?: { country?: string; state?: string; city?: string; text?: string; countryCode?: string }
  }
  currentPosition?: Array<{ companyName: string; position?: string; companyLinkedinUrl?: string }>
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
  skills?: Array<{ name: string; endorsements?: string }>
  certifications?: Array<{ title: string; issuedAt?: string; issuedBy?: string }>
}

export type HarvestProfileSearchResult = {
  id: string
  publicIdentifier: string
  firstName?: string
  lastName?: string
  name?: string
  headline?: string
  position?: string
  location?: { linkedinText: string }
  linkedinUrl: string
  photo?: string
  profilePicture?: { url: string }
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
    parsed?: { country?: string; state?: string; city?: string; text?: string }
  }
  employmentType?: string
  workplaceType?: string
  applicants?: number
  company?: {
    name: string
    id?: string
    universalName?: string
    linkedinUrl?: string
    logo?: string
    employeeCount?: number
    description?: string
    industries?: Array<string | { name: string }>
  }
  experienceLevel?: string
  salary?: { text?: string | null; min?: number | null; max?: number | null }
}

// ── Location → language mapping ──────────────────────────────────────

/** Maps location strings (country names, codes, cities) to ProfileLanguage values.
 *  Always includes English in addition to the local language. */
const LOCATION_LANGUAGE_MAP: Record<string, ProfileLanguage[]> = {
  // Country names
  'poland': ['Polish'],
  'polska': ['Polish'],
  'germany': ['German'],
  'deutschland': ['German'],
  'france': ['French'],
  'spain': ['Spanish'],
  'españa': ['Spanish'],
  'italy': ['Italian'],
  'italia': ['Italian'],
  'portugal': ['Portuguese'],
  'brazil': ['Portuguese'],
  'brasil': ['Portuguese'],
  'netherlands': ['Dutch'],
  'holland': ['Dutch'],
  'turkey': ['Turkish'],
  'türkiye': ['Turkish'],
  'russia': ['Russian'],
  'japan': ['Japanese'],
  'south korea': ['Korean'],
  'korea': ['Korean'],
  'china': ['Chinese'],
  'taiwan': ['Chinese'],
  'indonesia': ['Bahasa Indonesia'],
  'malaysia': ['Malay'],
  'philippines': ['Tagalog'],
  'romania': ['Romanian'],
  'czech republic': ['Czech'],
  'czechia': ['Czech'],
  'sweden': ['Swedish'],
  'norway': ['Norwegian'],
  'denmark': ['Danish'],
  'saudi arabia': ['Arabic'],
  'uae': ['Arabic'],
  'united arab emirates': ['Arabic'],
  'egypt': ['Arabic'],
  // Major cities → language
  'warsaw': ['Polish'],
  'krakow': ['Polish'],
  'kraków': ['Polish'],
  'wroclaw': ['Polish'],
  'wrocław': ['Polish'],
  'gdansk': ['Polish'],
  'gdańsk': ['Polish'],
  'berlin': ['German'],
  'munich': ['German'],
  'münchen': ['German'],
  'hamburg': ['German'],
  'frankfurt': ['German'],
  'paris': ['French'],
  'lyon': ['French'],
  'madrid': ['Spanish'],
  'barcelona': ['Spanish'],
  'rome': ['Italian'],
  'milan': ['Italian'],
  'milano': ['Italian'],
  'lisbon': ['Portuguese'],
  'são paulo': ['Portuguese'],
  'rio de janeiro': ['Portuguese'],
  'amsterdam': ['Dutch'],
  'istanbul': ['Turkish'],
  'moscow': ['Russian'],
  'tokyo': ['Japanese'],
  'seoul': ['Korean'],
  'beijing': ['Chinese'],
  'shanghai': ['Chinese'],
  'jakarta': ['Bahasa Indonesia'],
  'manila': ['Tagalog'],
  'bucharest': ['Romanian'],
  'prague': ['Czech'],
  'stockholm': ['Swedish'],
  'oslo': ['Norwegian'],
  'copenhagen': ['Danish'],
  'dubai': ['Arabic'],
  'cairo': ['Arabic'],
  'riyadh': ['Arabic'],
}

/**
 * Given a location string (e.g. "Poland", "Warsaw, Poland"),
 * returns profile languages: the local language(s) + English.
 * Returns undefined if no mapping found (lets API use its defaults).
 */
export function getProfileLanguagesForLocation(location: string | undefined): ProfileLanguage[] | undefined {
  if (!location) return undefined

  const parts = location.toLowerCase().split(/[,;\/]+/).map(s => s.trim())
  const languages = new Set<ProfileLanguage>(['English'])

  for (const part of parts) {
    const mapped = LOCATION_LANGUAGE_MAP[part]
    if (mapped) {
      for (const lang of mapped) languages.add(lang)
    }
  }

  // Only return if we found something beyond just English
  return languages.size > 1 ? [...languages] : undefined
}

// ── Option types ───────────────────────────────────────────────────────

export type PostSearchOpts = {
  authorsCompanies?: string[]
  authorsIndustryId?: string[]
  mentioningMember?: string[]
  mentioningCompany?: string[]
  contentType?: string
  postedLimit?: "any" | "1h" | "24h" | "week" | "month" | "3months" | "6months" | "year"
  scrapePostedLimit?: "1h" | "24h" | "week" | "month" | "3months" | "6months" | "year"
  sortBy?: "relevance" | "date"
  maxPosts?: number
}

export type CommentSearchOpts = {
  postedLimit?: "any" | "24h" | "week" | "month" | "3months" | "6months" | "year"
  scrapeReplies?: boolean
  maxItems?: number
}

export type JobSearchOpts = {
  locations?: string[]
  company?: string[]
  sortBy?: "relevance" | "date"
  workplaceType?: string[]
  employmentType?: string[]
  experienceLevel?: string[]
  postedLimit?: "1h" | "24h" | "week" | "month"
  maxItems?: number
}

// See openapi-specs/linkedin-profile-search.json for full API reference
export type ProfileScraperMode = 'Short' | 'Full' | 'Full + email search'

export type ProfileLanguage =
  | 'Arabic' | 'English' | 'Spanish' | 'Portuguese' | 'Chinese'
  | 'French' | 'Italian' | 'Russian' | 'German' | 'Dutch'
  | 'Turkish' | 'Tagalog' | 'Polish' | 'Korean' | 'Japanese'
  | 'Malay' | 'Norwegian' | 'Danish' | 'Romanian' | 'Swedish'
  | 'Bahasa Indonesia' | 'Czech'

/** 1=<1yr, 2=1-2yr, 3=3-5yr, 4=6-10yr, 5=10+yr */
export type YearsOfExperienceId = '1' | '2' | '3' | '4' | '5'

/** 100=In Training, 110=Entry Level, 120=Senior, 130=Strategic,
 *  200=Entry Level Manager, 210=Experienced Manager, 220=Director,
 *  300=VP, 310=CXO, 320=Owner/Partner */
export type SeniorityLevelId = '100' | '110' | '120' | '130' | '200' | '210' | '220' | '300' | '310' | '320'

/** 1=Accounting … 26=Customer Success. See openapi spec for full mapping. */
export type FunctionId = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '20'
  | '21' | '22' | '23' | '24' | '25' | '26'

/** A=Self-Employed, B=1-10, C=11-50, D=51-200, E=201-500,
 *  F=501-1000, G=1001-5000, H=5001-10000, I=10001+ */
export type CompanyHeadcountId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I'

export type ProfileSearchOpts = {
  // Scraper settings
  profileScraperMode?: ProfileScraperMode
  maxItems?: number
  startPage?: number
  takePages?: number

  // Include filters
  locations?: string[]
  currentCompanies?: string[]
  pastCompanies?: string[]
  schools?: string[]
  currentJobTitles?: string[]
  pastJobTitles?: string[]
  firstNames?: string[]
  lastNames?: string[]
  profileLanguages?: ProfileLanguage[]
  industryIds?: string[]
  seniorityLevelIds?: SeniorityLevelId[]
  functionIds?: FunctionId[]
  yearsOfExperienceIds?: YearsOfExperienceId[]
  yearsAtCurrentCompanyIds?: YearsOfExperienceId[]
  companyHeadcount?: CompanyHeadcountId[]
  recentlyChangedJobs?: boolean

  // Exclude filters
  excludeLocations?: string[]
  excludeCurrentCompanies?: string[]
  excludePastCompanies?: string[]
  excludeSchools?: string[]
  excludeCurrentJobTitles?: string[]
  excludePastJobTitles?: string[]
  excludeIndustryIds?: string[]
  excludeSeniorityLevelIds?: SeniorityLevelId[]
  excludeFunctionIds?: FunctionId[]

  // Auto segmentation
  autoQuerySegmentation?: boolean
  autoQuerySegmentationLevels?: ('default' | 'country' | 'state' | 'seniority_level' | 'industry')[]
  autoQuerySegmentationTargetCountries?: string[]
}

// ── Budget & rate limiting ────────────────────────────────────────────

const APIFY_BASE_URL = "https://api.apify.com/v2"
const DEFAULT_TIMEOUT_SECS = 120
const DEFAULT_MAX_REQUESTS = 50

let requestCount = 0
let requestBudget = DEFAULT_MAX_REQUESTS
const responseCache = new Map<string, unknown>()

/** Reset the request counter, cache, and set a budget for this run. */
export function resetBudget(maxRequests: number = DEFAULT_MAX_REQUESTS): void {
  requestCount = 0
  requestBudget = maxRequests
  responseCache.clear()
}

/** How many requests have been used / remain in the current budget. */
export function getBudgetStatus(): { used: number; remaining: number; budget: number } {
  return { used: requestCount, remaining: requestBudget - requestCount, budget: requestBudget }
}

/** Returns true if budget is exhausted. */
export function isBudgetExhausted(): boolean {
  return requestCount >= requestBudget
}

// ── Cache key helper ─────────────────────────────────────────────────

function makeCacheKey(actorId: string, input: Record<string, unknown>): string {
  const sorted = Object.entries(input)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join("&")
  return `${actorId}?${sorted}`
}

// ── Core Apify fetch ─────────────────────────────────────────────────

async function apifyRunActor<T>(
  actorId: string,
  input: Record<string, unknown>,
): Promise<T[]> {
  const key = makeCacheKey(actorId, input)
  const cached = responseCache.get(key)
  if (cached) {
    console.log(`[apify] Cache hit: ${actorId}`)
    return cached as T[]
  }

  if (isBudgetExhausted()) {
    throw new Error(`Apify budget exhausted (${requestBudget} requests). Skipping ${actorId}`)
  }

  requestCount++
  const { used, remaining } = getBudgetStatus()
  console.log(`[apify] #${used} ${actorId} input=${JSON.stringify(input).slice(0, 120)}`)
  if (remaining <= 5) {
    console.warn(`[apify] Budget warning: ${used}/${requestBudget} requests used, ${remaining} remaining`)
  }

  const { APIFY_TOKEN } = getRequiredApifyEnv()
  const url = `${APIFY_BASE_URL}/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=${DEFAULT_TIMEOUT_SECS}`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown error")
    console.error(`[apify] FAIL ${response.status}: ${actorId} — ${text.slice(0, 300)}`)
    throw new Error(`Apify ${actorId} failed (${response.status}): ${text.slice(0, 200)}`)
  }

  const data = (await response.json()) as T[]
  const count = Array.isArray(data) ? data.length : 0
  console.log(`[apify] OK ${actorId} → ${count} results`)
  responseCache.set(key, data)
  return Array.isArray(data) ? data : []
}

// ── Public API ─────────────────────────────────────────────────────────

export async function searchPosts(
  search: string,
  opts?: PostSearchOpts,
): Promise<HarvestPost[]> {
  const input: Record<string, unknown> = {
    searchQueries: [search],
    maxPosts: opts?.maxPosts ?? 20,
    sortBy: opts?.sortBy ?? "date",
  }
  if (opts?.postedLimit) input.postedLimit = opts.postedLimit
  if (opts?.scrapePostedLimit) input.postedLimit = opts.scrapePostedLimit // Apify uses single postedLimit
  if (opts?.authorsCompanies) input.authorsCompanies = opts.authorsCompanies
  if (opts?.authorsIndustryId) input.authorsIndustryId = opts.authorsIndustryId
  if (opts?.mentioningMember) input.mentioningMember = opts.mentioningMember
  if (opts?.mentioningCompany) input.mentioningCompany = opts.mentioningCompany
  if (opts?.contentType) input.contentType = opts.contentType

  return apifyRunActor<HarvestPost>("harvestapi~linkedin-post-search", input)
}

export async function getPostComments(
  postUrl: string,
  opts?: CommentSearchOpts,
): Promise<HarvestComment[]> {
  const input: Record<string, unknown> = {
    posts: [postUrl],
    maxItems: opts?.maxItems ?? 10,
  }
  if (opts?.postedLimit) input.postedLimit = opts.postedLimit
  if (opts?.scrapeReplies !== undefined) input.scrapeReplies = opts.scrapeReplies

  return apifyRunActor<HarvestComment>("harvestapi~linkedin-post-comments", input)
}

export async function getProfile(
  linkedinUrl: string,
): Promise<HarvestProfile | null> {
  const results = await apifyRunActor<HarvestProfile>("harvestapi~linkedin-profile-scraper", {
    urls: [linkedinUrl],
  })
  return results[0] ?? null
}

export async function searchProfiles(
  search: string,
  opts?: ProfileSearchOpts,
): Promise<HarvestProfileSearchResult[]> {
  const input: Record<string, unknown> = {
    searchQuery: search,
    maxItems: opts?.maxItems ?? 25,
  }

  // Scraper settings
  if (opts?.profileScraperMode) input.profileScraperMode = opts.profileScraperMode
  if (opts?.startPage) input.startPage = opts.startPage
  if (opts?.takePages) input.takePages = opts.takePages

  // Include filters
  if (opts?.locations) input.locations = opts.locations
  if (opts?.currentCompanies) input.currentCompanies = opts.currentCompanies
  if (opts?.pastCompanies) input.pastCompanies = opts.pastCompanies
  if (opts?.schools) input.schools = opts.schools
  if (opts?.currentJobTitles) input.currentJobTitles = opts.currentJobTitles
  if (opts?.pastJobTitles) input.pastJobTitles = opts.pastJobTitles
  if (opts?.firstNames) input.firstNames = opts.firstNames
  if (opts?.lastNames) input.lastNames = opts.lastNames
  if (opts?.profileLanguages) input.profileLanguages = opts.profileLanguages
  if (opts?.industryIds) input.industryIds = opts.industryIds
  if (opts?.seniorityLevelIds) input.seniorityLevelIds = opts.seniorityLevelIds
  if (opts?.functionIds) input.functionIds = opts.functionIds
  if (opts?.yearsOfExperienceIds) input.yearsOfExperienceIds = opts.yearsOfExperienceIds
  if (opts?.yearsAtCurrentCompanyIds) input.yearsAtCurrentCompanyIds = opts.yearsAtCurrentCompanyIds
  if (opts?.companyHeadcount) input.companyHeadcount = opts.companyHeadcount
  if (opts?.recentlyChangedJobs !== undefined) input.recentlyChangedJobs = opts.recentlyChangedJobs

  // Exclude filters
  if (opts?.excludeLocations) input.excludeLocations = opts.excludeLocations
  if (opts?.excludeCurrentCompanies) input.excludeCurrentCompanies = opts.excludeCurrentCompanies
  if (opts?.excludePastCompanies) input.excludePastCompanies = opts.excludePastCompanies
  if (opts?.excludeSchools) input.excludeSchools = opts.excludeSchools
  if (opts?.excludeCurrentJobTitles) input.excludeCurrentJobTitles = opts.excludeCurrentJobTitles
  if (opts?.excludePastJobTitles) input.excludePastJobTitles = opts.excludePastJobTitles
  if (opts?.excludeIndustryIds) input.excludeIndustryIds = opts.excludeIndustryIds
  if (opts?.excludeSeniorityLevelIds) input.excludeSeniorityLevelIds = opts.excludeSeniorityLevelIds
  if (opts?.excludeFunctionIds) input.excludeFunctionIds = opts.excludeFunctionIds

  // Auto segmentation
  if (opts?.autoQuerySegmentation !== undefined) input.autoQuerySegmentation = opts.autoQuerySegmentation
  if (opts?.autoQuerySegmentationLevels) input.autoQuerySegmentationLevels = opts.autoQuerySegmentationLevels
  if (opts?.autoQuerySegmentationTargetCountries) input.autoQuerySegmentationTargetCountries = opts.autoQuerySegmentationTargetCountries

  return apifyRunActor<HarvestProfileSearchResult>("harvestapi~linkedin-profile-search", input)
}

export async function searchJobs(
  searches: string[],
  opts?: JobSearchOpts,
): Promise<HarvestJob[]> {
  const input: Record<string, unknown> = {
    jobTitles: searches,
    maxItems: opts?.maxItems ?? 25,
    sortBy: opts?.sortBy ?? "date",
  }
  if (opts?.locations) input.locations = opts.locations
  if (opts?.postedLimit) input.postedLimit = opts.postedLimit
  if (opts?.company) input.company = opts.company
  if (opts?.workplaceType) input.workplaceType = opts.workplaceType
  if (opts?.employmentType) input.employmentType = opts.employmentType
  if (opts?.experienceLevel) input.experienceLevel = opts.experienceLevel

  return apifyRunActor<HarvestJob>("harvestapi~linkedin-job-search", input)
}
