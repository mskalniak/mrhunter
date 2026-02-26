import type { SignalDetector, DetectedSignal, DetectionContext } from "../../types.js"
import { getClaudeClient } from "../../../lib/claude.js"

export const newRoleIcpMatch: SignalDetector = {
  id: "3.3",
  name: "New Role ICP Match",
  category: "career-changes",
  strength: "critical",
  scorePoints: 45,
  source: "linkedin-posts",
  requiresAI: true,

  async detect(ctx: DetectionContext): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const { titles, industries, keywords } = ctx.icpProfile
    const claude = getClaudeClient()

    const posts = ctx.data.newRolePosts
    const batch = posts.slice(0, 20).map((p, i) => ({
      index: i,
      name: p.author.name,
      content: p.content.slice(0, 300),
    }))

    if (batch.length === 0) return signals

    try {
      const response = await claude.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `Analyze these LinkedIn posts about new roles/jobs. Which posts are announcements of a new role that matches this ICP?

Target titles: ${titles.join(", ")}
Target industries: ${industries.join(", ")}
Keywords: ${keywords.join(", ")}

Posts:
${batch.map((p) => `[${p.index}] ${p.name}: ${p.content}`).join("\n")}

Return ONLY a JSON array of indices of posts announcing a new role matching the ICP. Example: [0, 3, 5]
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
          const post = posts[idx]
          if (!post) continue

          signals.push({
            detectorId: "3.3",
            signalType: "role_change",
            strength: "critical",
            scorePoints: 45,
            linkedinUrl: post.author.linkedinUrl,
            name: post.author.name,
            title: "New role matching your ICP",
            snippet: post.content.slice(0, 300),
            sourceUrl: post.linkedinUrl,
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
