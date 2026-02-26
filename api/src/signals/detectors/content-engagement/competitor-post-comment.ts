import type { SignalDetector, DetectedSignal, DetectionContext } from "../../types.js"

export const competitorPostComment: SignalDetector = {
  id: "1.1",
  name: "Competitor Post Comment",
  category: "content-engagement",
  strength: "critical",
  scorePoints: 40,
  source: "linkedin-comments",
  requiresAI: false,

  async detect(ctx: DetectionContext): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const { competitors } = ctx.icpProfile

    for (const competitor of competitors) {
      try {
        const posts = await ctx.harvest.searchPosts(competitor, {
          postedLimit: "week",
          sortBy: "date",
        })

        for (const post of posts.slice(0, 10)) {
          try {
            const comments = await ctx.harvest.getPostComments(post.linkedinUrl)

            for (const comment of comments) {
              if (comment.actor.author) continue

              signals.push({
                detectorId: "1.1",
                signalType: "competitor_engagement",
                strength: "critical",
                scorePoints: 40,
                linkedinUrl: comment.actor.linkedinUrl,
                name: comment.actor.name,
                headline: comment.actor.position,
                title: `Commented on ${competitor} post`,
                snippet: comment.commentary.slice(0, 300),
                sourceUrl: post.linkedinUrl,
              })
            }
          } catch {
            // Skip individual post comment failures
          }
        }
      } catch {
        // Skip individual competitor failures
      }
    }

    return signals
  },
}
