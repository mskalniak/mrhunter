import type { SignalDetector, DetectedSignal, DetectionContext } from "../../types.js"
import { getClaudeClient } from "../../../lib/claude.js"

export const solutionQuestionComment: SignalDetector = {
  id: "1.3",
  name: "Solution Question Comment",
  category: "content-engagement",
  strength: "critical",
  scorePoints: 45,
  source: "linkedin-comments",
  requiresAI: true,

  async detect(ctx: DetectionContext): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const { keywords } = ctx.icpProfile
    const claude = getClaudeClient()

    for (const { competitor, posts, commentsByPostUrl } of ctx.data.competitorWeek) {
      for (const post of posts) {
        const comments = commentsByPostUrl.get(post.linkedinUrl) ?? []
        const nonAuthorComments = comments.filter((c) => !c.actor.author).slice(0, 20)

        if (nonAuthorComments.length === 0) continue

        const batch = nonAuthorComments.map((c, i) => ({
          index: i,
          name: c.actor.name,
          text: c.commentary.slice(0, 300),
        }))

        try {
          const response = await claude.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 256,
            messages: [
              {
                role: "user",
                content: `Analyze these LinkedIn comments on a ${competitor} post. Which comments are asking about a solution related to these keywords: ${keywords.join(", ")}?

Comments:
${batch.map((c) => `[${c.index}] ${c.name}: ${c.text}`).join("\n")}

Return ONLY a JSON array of indices of comments that ask about a solution. Example: [0, 3, 5]
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
                detectorId: "1.3",
                signalType: "pain_point",
                strength: "critical",
                scorePoints: 45,
                linkedinUrl: comment.actor.linkedinUrl,
                name: comment.actor.name,
                headline: comment.actor.position,
                title: "Asked about solution in competitor discussion",
                snippet: comment.commentary.slice(0, 300),
                sourceUrl: post.linkedinUrl,
              })
            }
          } catch {
            // JSON parse failure — skip this batch
          }
        } catch {
          // Claude API failure — skip
        }
      }
    }

    return signals
  },
}
