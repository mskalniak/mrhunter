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

    for (const [title, profiles] of ctx.data.profilesByTitle) {
      for (const profile of profiles) {
        signals.push({
          detectorId: "5.1",
          signalType: "icp_match",
          strength: "low",
          scorePoints: 15,
          linkedinUrl: profile.linkedinUrl,
          name: profile.name ?? [profile.firstName, profile.lastName].filter(Boolean).join(" ") ?? undefined,
          headline: profile.headline ?? profile.position ?? undefined,
          photoUrl: profile.photo ?? profile.profilePicture?.url,
          title: `Matches ICP title: ${title}`,
          snippet: profile.headline ?? profile.position ?? `Profile matching "${title}"`,
          sourceUrl: profile.linkedinUrl,
        })
      }
    }

    return signals
  },
}
