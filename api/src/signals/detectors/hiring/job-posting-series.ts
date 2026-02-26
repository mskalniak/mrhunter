import type { SignalDetector, DetectedSignal, DetectionContext } from "../../types.js"

type CompanyJobTracker = {
  companyName: string
  companyUrl: string
  jobTitles: string[]
  sourceUrl: string
}

export const jobPostingSeries: SignalDetector = {
  id: "4.2",
  name: "Job Posting Series",
  category: "hiring",
  strength: "critical",
  scorePoints: 45,
  source: "linkedin-jobs",
  requiresAI: false,

  async detect(ctx: DetectionContext): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const companyMap = new Map<string, CompanyJobTracker>()

    for (const [, jobs] of ctx.data.jobsByTitleMonth) {
      for (const job of jobs) {
        const companyName = job.company?.name
        if (!companyName) continue

        const key = companyName.toLowerCase()
        const existing = companyMap.get(key)

        if (existing) {
          if (!existing.jobTitles.includes(job.title)) {
            existing.jobTitles.push(job.title)
          }
        } else {
          companyMap.set(key, {
            companyName,
            companyUrl: job.company?.linkedinUrl ?? job.linkedinUrl,
            jobTitles: [job.title],
            sourceUrl: job.linkedinUrl,
          })
        }
      }
    }

    for (const company of companyMap.values()) {
      if (company.jobTitles.length >= 3) {
        signals.push({
          detectorId: "4.2",
          signalType: "hiring",
          strength: "critical",
          scorePoints: 45,
          linkedinUrl: company.companyUrl,
          company: company.companyName,
          title: `${company.companyName} posted ${company.jobTitles.length} jobs this month`,
          snippet: `Open roles: ${company.jobTitles.join(", ")}`,
          sourceUrl: company.sourceUrl,
        })
      }
    }

    return signals
  },
}
