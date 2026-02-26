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

    const queries = [
      "who can recommend",
      "looking for recommendations",
      "any suggestions for",
      "can anyone recommend",
      ...keywords.slice(0, 3).map((kw) => `recommend ${kw}`),
    ]

    const allPosts: Array<{
      index: number
      name: string
      content: string
      authorUrl: string
      postUrl: string
    }> = []

    for (const query of queries) {
      try {
        const posts = await ctx.harvest.searchPosts(query, {
          postedLimit: "week",
          sortBy: "date",
        })

        for (const post of posts.slice(0, 15)) {
          if (allPosts.length >= 15) break
          allPosts.push({
            index: allPosts.length,
            name: post.author.name,
            content: post.content.slice(0, 300),
            authorUrl: post.author.linkedinUrl,
            postUrl: post.linkedinUrl,
          })
        }
      } catch {
        // Skip individual query failures
      }

      if (allPosts.length >= 15) break
    }

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
