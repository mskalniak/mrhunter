import type { SignalDetector, DetectedSignal, DetectionContext } from "../../types.js"

export const keyRoleJobPosting: SignalDetector = {
  id: "4.1",
  name: "Key Role Job Posting",
  category: "hiring",
  strength: "critical",
  scorePoints: 35,
  source: "linkedin-jobs",
  requiresAI: false,

  async detect(ctx: DetectionContext): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const { titles } = ctx.icpProfile

    for (const targetTitle of titles.slice(0, 5)) {
      try {
        const jobs = await ctx.harvest.searchJobs(targetTitle, {
          postedLimit: "Past Week",
          sortBy: "date",
        })

        for (const job of jobs.slice(0, 20)) {
          const matchesTitle = titles.some((t) =>
            job.title.toLowerCase().includes(t.toLowerCase()),
          )
          if (!matchesTitle) continue

          signals.push({
            detectorId: "4.1",
            signalType: "hiring",
            strength: "critical",
            scorePoints: 35,
            linkedinUrl: job.company?.linkedinUrl ?? job.linkedinUrl,
            company: job.company?.name,
            title: `Hiring: ${job.title}`,
            snippet: job.descriptionText?.slice(0, 300) ?? `${job.company?.name ?? "Company"} is hiring for ${job.title}`,
            sourceUrl: job.linkedinUrl,
          })
        }
      } catch {
        // Skip individual title search failures
      }
    }

    return signals
  },
}
