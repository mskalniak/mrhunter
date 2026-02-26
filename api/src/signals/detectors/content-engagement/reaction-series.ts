import type { SignalDetector, DetectedSignal, DetectionContext } from "../../types.js"

type EngagementTracker = {
  name: string
  headline: string
  linkedinUrl: string
  count: number
  posts: string[]
}

export const reactionSeries: SignalDetector = {
  id: "1.6",
  name: "Reaction Series",
  category: "content-engagement",
  strength: "critical",
  scorePoints: 50,
  source: "linkedin-comments",
  requiresAI: false,

  async detect(ctx: DetectionContext): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const { competitors } = ctx.icpProfile
    const engagementMap = new Map<string, EngagementTracker>()

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

              const key = comment.actor.linkedinUrl
              const existing = engagementMap.get(key)

              if (existing) {
                existing.count++
                if (!existing.posts.includes(post.linkedinUrl)) {
                  existing.posts.push(post.linkedinUrl)
                }
              } else {
                engagementMap.set(key, {
                  name: comment.actor.name,
                  headline: comment.actor.position,
                  linkedinUrl: comment.actor.linkedinUrl,
                  count: 1,
                  posts: [post.linkedinUrl],
                })
              }
            }
          } catch {
            // Skip individual post failures
          }
        }
      } catch {
        // Skip individual competitor failures
      }
    }

    for (const person of engagementMap.values()) {
      if (person.posts.length >= 3) {
        signals.push({
          detectorId: "1.6",
          signalType: "competitor_engagement",
          strength: "critical",
          scorePoints: 50,
          linkedinUrl: person.linkedinUrl,
          name: person.name,
          headline: person.headline,
          title: `${person.posts.length} interactions with competitor content in 7 days`,
          snippet: `Engaged with ${person.count} comments across ${person.posts.length} different competitor posts`,
          sourceUrl: person.posts[0],
        })
      }
    }

    return signals
  },
}
