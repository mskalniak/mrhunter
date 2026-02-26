import type { SignalDetector, DetectedSignal, DetectionContext } from "../../types.js"
import { getClaudeClient } from "../../../lib/claude.js"

export const negativeToolSentiment: SignalDetector = {
  id: "1.7",
  name: "Negative Tool Sentiment",
  category: "content-engagement",
  strength: "critical",
  scorePoints: 45,
  source: "linkedin-comments",
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

        for (const post of posts.slice(0, 5)) {
          try {
            const comments = await ctx.harvest.getPostComments(post.linkedinUrl)
            const nonAuthorComments = comments.filter((c) => !c.actor.author).slice(0, 20)

            if (nonAuthorComments.length === 0) continue

            const batch = nonAuthorComments.map((c, i) => ({
              index: i,
              name: c.actor.name,
              text: c.commentary.slice(0, 300),
            }))

            const response = await claude.messages.create({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 256,
              messages: [
                {
                  role: "user",
                  content: `Analyze these LinkedIn comments on a ${competitor} post. Which comments express negative sentiment, frustration, or complaints about the tool/product?

Comments:
${batch.map((c) => `[${c.index}] ${c.name}: ${c.text}`).join("\n")}

Return ONLY a JSON array of indices of comments with negative sentiment. Example: [0, 3, 5]
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
                const comment = nonAuthorComments[idx]
                if (!comment) continue

                signals.push({
                  detectorId: "1.7",
                  signalType: "pain_point",
                  strength: "critical",
                  scorePoints: 45,
                  linkedinUrl: comment.actor.linkedinUrl,
                  name: comment.actor.name,
                  headline: comment.actor.position,
                  title: `Negative sentiment about ${competitor}`,
                  snippet: comment.commentary.slice(0, 300),
                  sourceUrl: post.linkedinUrl,
                })
              }
            } catch {
              // JSON parse failure — skip this batch
            }
          } catch {
            // Skip individual post failures
          }
        }
      } catch {
        // Skip individual competitor failures
      }
    }

    return signals
  },
}
