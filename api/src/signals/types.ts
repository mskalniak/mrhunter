import type { SignalType, SignalStrength, SignalCategory, ParsedIcpConfig } from "@solomakers/shared"
import type { HarvestPost, HarvestComment, HarvestProfile, HarvestProfileSearchResult, HarvestJob } from "./sources/harvest-api.js"

// ── Prefetched data ─────────────────────────────────────────────────

export type CompetitorPostData = {
  competitor: string
  posts: HarvestPost[]
  commentsByPostUrl: Map<string, HarvestComment[]>
}

export type PrefetchedData = {
  /** Competitor posts (week) + comments for each — used by 1.1, 1.3, 1.6 */
  competitorWeek: CompetitorPostData[]
  /** Competitor posts (month) + comments for each — used by 1.7, 2.5 */
  competitorMonth: CompetitorPostData[]
  /** Keyword post search results — used by 2.1 */
  keywordPosts: Map<string, HarvestPost[]>
  /** Recommendation-seeking posts — used by 2.3 */
  recommendationPosts: HarvestPost[]
  /** Demo/trial-seeking posts — used by 2.12 */
  demoTrialPosts: HarvestPost[]
  /** "New role" announcement posts — used by 3.3 */
  newRolePosts: HarvestPost[]
  /** Profile search results matching ICP — used by 5.1 */
  profiles: HarvestProfileSearchResult[]
  /** Full profiles fetched by URL — used by 3.1, 3.2 */
  fullProfiles: Map<string, HarvestProfile>
  /** Job search results per title (week) — used by 4.1, 4.3 */
  jobsByTitleWeek: Map<string, HarvestJob[]>
  /** Job search results per title (month) — used by 4.2 */
  jobsByTitleMonth: Map<string, HarvestJob[]>
}

// ── Detection context ───────────────────────────────────────────────

export type DetectionContext = {
  icpProfile: ParsedIcpConfig
  userId: string
  data: PrefetchedData
}

export type DetectedSignal = {
  detectorId: string
  signalType: SignalType
  strength: SignalStrength
  scorePoints: number
  linkedinUrl: string
  name?: string
  headline?: string
  company?: string
  photoUrl?: string
  title: string
  snippet: string
  sourceUrl: string
}

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
