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
    const { titles, location } = ctx.icpProfile
    const now = Date.now()
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000

    for (const targetTitle of titles.slice(0, 5)) {
      try {
        const profiles = await ctx.harvest.searchProfiles(targetTitle, {
          title: targetTitle,
          location,
        })

        for (const profileResult of profiles.slice(0, 20)) {
          try {
            const profile = await ctx.harvest.getProfile(profileResult.linkedinUrl)
            if (!profile?.experience?.length) continue

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
              title: `New ${current.position} at ${current.companyName}`,
              snippet: `Started as ${current.position} at ${current.companyName}${current.startDate.text ? ` (${current.startDate.text})` : ""}`,
              sourceUrl: profile.linkedinUrl,
            })
          } catch {
            // Skip individual profile failures
          }
        }
      } catch {
        // Skip individual title search failures
      }
    }

    return signals
  },
}
