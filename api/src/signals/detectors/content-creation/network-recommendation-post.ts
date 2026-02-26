import type { SignalDetector, DetectedSignal, DetectionContext } from "../../types.js"
import { getClaudeClient } from "../../../lib/claude.js"

export const networkRecommendationPost: SignalDetector = {
  id: "2.3",
  name: "Network Recommendation Post",
  category: "content-creation",
  strength: "critical",
  scorePoints: 50,
  source: "linkedin-posts",
  requiresAI: true,

  async detect(ctx: DetectionContext): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const { keywords } = ctx.icpProfile
    const claude = getClaudeClient()

    const allPosts = ctx.data.recommendationPosts.map((p, i) => ({
      index: i,
      name: p.author.name,
      content: p.content.slice(0, 300),
      authorUrl: p.author.linkedinUrl,
      postUrl: p.linkedinUrl,
    }))

    if (allPosts.length === 0) return signals

    try {
      const response = await claude.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `Analyze these LinkedIn posts. Which posts are seeking recommendations or suggestions for tools/services related to: ${keywords.join(", ")}?

Posts:
${allPosts.map((p) => `[${p.index}] ${p.name}: ${p.content}`).join("\n")}

Return ONLY a JSON array of indices of posts seeking recommendations. Example: [0, 3, 5]
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
          const post = allPosts[idx]
          if (!post) continue

          signals.push({
            detectorId: "2.3",
            signalType: "pain_point",
            strength: "critical",
            scorePoints: 50,
            linkedinUrl: post.authorUrl,
            name: post.name,
            title: "Asking network for tool recommendations",
            snippet: post.content,
            sourceUrl: post.postUrl,
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
