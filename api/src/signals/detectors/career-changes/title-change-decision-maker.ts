import type { SignalDetector, DetectedSignal, DetectionContext } from "../../types.js"

export const titleChangeDecisionMaker: SignalDetector = {
  id: "3.1",
  name: "Title Change Decision Maker",
  category: "career-changes",
  strength: "critical",
  scorePoints: 40,
  source: "linkedin-profiles",
  requiresAI: false,

  async detect(ctx: DetectionContext): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const { titles } = ctx.icpProfile
    const now = Date.now()
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000

    for (const profile of ctx.data.fullProfiles.values()) {
      if (!profile.experience?.length) continue

      const current = profile.experience[0]
      if (!current.startDate?.year) continue

      const startMonth = current.startDate.month
        ? parseInt(current.startDate.month, 10) || 1
        : 1
      const startDate = new Date(current.startDate.year, startMonth - 1, 1)
      const daysSinceStart = now - startDate.getTime()

      if (daysSinceStart < 0 || daysSinceStart > ninetyDaysMs) continue

      const matchesTitle = titles.some((t) =>
        current.position.toLowerCase().includes(t.toLowerCase()),
      )
      if (!matchesTitle) continue

      signals.push({
        detectorId: "3.1",
        signalType: "role_change",
        strength: "critical",
        scorePoints: 40,
        linkedinUrl: profile.linkedinUrl,
        name: `${profile.firstName} ${profile.lastName}`,
        headline: profile.headline,
        company: current.companyName,
        photoUrl: profile.photo ?? profile.profilePicture?.url,
        title: `New ${current.position} at ${current.companyName}`,
        snippet: `Started as ${current.position} at ${current.companyName}${current.startDate.text ? ` (${current.startDate.text})` : ""}`,
        sourceUrl: profile.linkedinUrl,
      })
    }

    return signals
  },
}
