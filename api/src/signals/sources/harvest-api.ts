import { getRequiredHarvestEnv } from "../../config/env.js"

// ── Types ──────────────────────────────────────────────────────────────

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
    parsed?: { country: string; state?: string; city?: string }
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
  certifications?: Array<{ title: string; issuedAt?: string; issuedBy?: string }>
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
    parsed?: { country?: string; state?: string; city?: string }
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

// ── Option types ───────────────────────────────────────────────────────

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

// ── Internal helpers ───────────────────────────────────────────────────

const BASE_URL = "https://api.harvest-api.com"
const RATE_LIMIT_MS = 500

let lastRequestTime = 0

async function rateLimitDelay(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed))
  }
  lastRequestTime = Date.now()
}

type HarvestResponse<T> = {
  elements?: T[]
  element?: T
  pagination?: HarvestPagination
  status?: string
  error?: string
}

async function harvestFetch<T>(
  endpoint: string,
  params: Record<string, string | number | string[] | undefined>,
): Promise<HarvestResponse<T>> {
  const { HARVEST_API_KEY } = getRequiredHarvestEnv()

  await rateLimitDelay()

  const url = new URL(endpoint, BASE_URL)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const v of value) {
        url.searchParams.append(key, v)
      }
    } else {
      url.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-API-Key": HARVEST_API_KEY,
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown error")
    throw new Error(`HarvestAPI ${endpoint} failed (${response.status}): ${text}`)
  }

  return response.json() as Promise<HarvestResponse<T>>
}

// ── Public API ─────────────────────────────────────────────────────────

export async function searchPosts(
  search: string,
  opts?: PostSearchOpts,
): Promise<HarvestPost[]> {
  const res = await harvestFetch<HarvestPost>("/linkedin/post-search", {
    search,
    ...opts,
  })
  return res.elements ?? []
}

export async function getPostComments(
  postUrl: string,
  opts?: { page?: number },
): Promise<HarvestComment[]> {
  const res = await harvestFetch<HarvestComment>("/linkedin/post-comments", {
    url: postUrl,
    ...opts,
  })
  return res.elements ?? []
}

export async function getProfile(
  linkedinUrl: string,
): Promise<HarvestProfile | null> {
  const res = await harvestFetch<HarvestProfile>("/linkedin/profile", {
    url: linkedinUrl,
  })
  return res.elements?.[0] ?? (res as HarvestResponse<HarvestProfile>).element ?? null
}

export async function searchProfiles(
  search: string,
  opts?: ProfileSearchOpts,
): Promise<HarvestProfileSearchResult[]> {
  const res = await harvestFetch<HarvestProfileSearchResult>("/linkedin/profile-search", {
    search,
    ...opts,
  })
  return res.elements ?? []
}

export async function searchJobs(
  search: string,
  opts?: JobSearchOpts,
): Promise<HarvestJob[]> {
  const res = await harvestFetch<HarvestJob>("/linkedin/job-search", {
    search,
    ...opts,
  })
  return res.elements ?? []
}
