import type { SignalDetector, DetectedSignal, DetectionContext } from "../../types.js"
import { getClaudeClient } from "../../../lib/claude.js"

export const toolFrustrationPost: SignalDetector = {
  id: "2.5",
  name: "Tool Frustration Post",
  category: "content-creation",
  strength: "critical",
  scorePoints: 45,
  source: "linkedin-posts",
  requiresAI: true,

  async detect(ctx: DetectionContext): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const { competitors } = ctx.icpProfile
    const claude = getClaudeClient()

    for (const competitor of competitors) {
      try {
        const posts = await ctx.harvest.searchPosts(competitor, {
          postedLimit: "month",
          sortBy: "date",
        })

        const batch = posts.slice(0, 15).map((p, i) => ({
          index: i,
          name: p.author.name,
          content: p.content.slice(0, 300),
        }))

        if (batch.length === 0) continue

        const response = await claude.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 256,
          messages: [
            {
              role: "user",
              content: `Analyze these LinkedIn posts about ${competitor}. Which posts express frustration, complaints, or negative experiences with the tool/product?
Exclude promotional or marketing posts.

Posts:
${batch.map((p) => `[${p.index}] ${p.name}: ${p.content}`).join("\n")}

Return ONLY a JSON array of indices of frustrated/complaining posts. Example: [0, 3, 5]
If none match, return [].`,
            },
          ],
        })

        const text = response.content[0].type === "text" ? response.content[0].text : ""
        const match = text.match(/\[[\d,\s]*\]/)
        if (!match) continue

        try {
          const indices: number[] = JSON.parse(match[0])
          for (const idx of indices) {
            const post = posts[idx]
            if (!post) continue

            signals.push({
              detectorId: "2.5",
              signalType: "pain_point",
              strength: "critical",
              scorePoints: 45,
              linkedinUrl: post.author.linkedinUrl,
              name: post.author.name,
              title: `Frustrated with ${competitor}`,
              snippet: post.content.slice(0, 300),
              sourceUrl: post.linkedinUrl,
            })
          }
        } catch {
          // JSON parse failure — skip this batch
        }
      } catch {
        // Skip individual competitor failures
      }
    }

    return signals
  },
}
