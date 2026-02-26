import type { SignalType, SignalStrength, SignalCategory, ParsedIcpConfig } from "@solomakers/shared"
import type * as harvest from "./sources/harvest-api.js"

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
