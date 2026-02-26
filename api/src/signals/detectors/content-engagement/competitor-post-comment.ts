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

    for (const { competitor, posts, commentsByPostUrl } of ctx.data.competitorWeek) {
      for (const post of posts) {
        const comments = commentsByPostUrl.get(post.linkedinUrl) ?? []

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
      }
    }

    return signals
  },
}
