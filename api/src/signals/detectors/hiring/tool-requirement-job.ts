import type { SignalDetector, DetectedSignal, DetectionContext } from "../../types.js"
import { getClaudeClient } from "../../../lib/claude.js"

export const toolRequirementJob: SignalDetector = {
  id: "4.3",
  name: "Tool Requirement Job",
  category: "hiring",
  strength: "critical",
  scorePoints: 40,
  source: "linkedin-jobs",
  requiresAI: true,

  async detect(ctx: DetectionContext): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const { titles, keywords } = ctx.icpProfile
    const claude = getClaudeClient()

    const allJobs: Array<{
      index: number
      title: string
      company: string
      companyUrl: string
      description: string
      jobUrl: string
    }> = []

    for (const targetTitle of titles.slice(0, 3)) {
      try {
        const jobs = await ctx.harvest.searchJobs(targetTitle, {
          postedLimit: "Past Week",
          sortBy: "date",
        })

        for (const job of jobs) {
          if (!job.descriptionText || job.descriptionText.length <= 50) continue
          if (allJobs.length >= 10) break

          allJobs.push({
            index: allJobs.length,
            title: job.title,
            company: job.company?.name ?? "Unknown",
            companyUrl: job.company?.linkedinUrl ?? job.linkedinUrl,
            description: job.descriptionText.slice(0, 500),
            jobUrl: job.linkedinUrl,
          })
        }
      } catch {
        // Skip individual title search failures
      }

      if (allJobs.length >= 10) break
    }

    if (allJobs.length === 0) return signals

    try {
      const response = await claude.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `Analyze these job descriptions. Which jobs mention a requirement for tools or skills in these categories: ${keywords.join(", ")}?

Jobs:
${allJobs.map((j) => `[${j.index}] ${j.title} at ${j.company}: ${j.description}`).join("\n\n")}

Return ONLY a JSON array of indices of jobs requiring tools in these categories. Example: [0, 3, 5]
If none match, return [].`,
          },
        ],
      })

      const text = response.content[0].type === "text" ? response.content[0].text : ""
      const match = text.match(/\[[\d,\s]*\]/)
      if (!match) return signals

      try {
        const indices: number[] = JSON.parse(match[0])
        for (const idx of indices) {
          const job = allJobs[idx]
          if (!job) continue

          signals.push({
            detectorId: "4.3",
            signalType: "hiring",
            strength: "critical",
            scorePoints: 40,
            linkedinUrl: job.companyUrl,
            company: job.company,
            title: `Job requires your type of tool: ${job.title}`,
            snippet: job.description.slice(0, 300),
            sourceUrl: job.jobUrl,
          })
        }
      } catch {
        // JSON parse failure
      }
    } catch {
      // Claude API failure
    }

    return signals
  },
}
