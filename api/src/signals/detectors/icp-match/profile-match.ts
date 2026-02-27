import type { SignalDetector, DetectedSignal, DetectionContext } from "../../types.js"

export const profileMatch: SignalDetector = {
  id: "5.1",
  name: "ICP Profile Match",
  category: "icp-match",
  strength: "low",
  scorePoints: 15,
  source: "linkedin-profiles",
  requiresAI: false,

  async detect(ctx: DetectionContext): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []

    for (const profile of ctx.data.profiles) {
      const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || undefined
      const position = profile.currentPositions?.[0]
      const headline = position?.title ?? profile.summary ?? undefined
      const company = position?.companyName ?? undefined

      signals.push({
        detectorId: "5.1",
        signalType: "icp_match",
        strength: "low",
        scorePoints: 15,
        linkedinUrl: profile.linkedinUrl,
        name,
        headline,
        company,
        photoUrl: profile.pictureUrl,
        title: "Matches your ICP",
        snippet: headline ?? "Profile matching your Ideal Customer Profile",
        sourceUrl: profile.linkedinUrl,
      })
    }

    return signals
  },
}
