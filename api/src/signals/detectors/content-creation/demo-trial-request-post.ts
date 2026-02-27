import type { SignalDetector, DetectedSignal, DetectionContext } from "../../types.js"
import { getClaudeClient } from "../../../lib/claude.js"

export const demoTrialRequestPost: SignalDetector = {
  id: "2.12",
  name: "Demo/Trial Request Post",
  category: "content-creation",
  strength: "critical",
  scorePoints: 50,
  source: "linkedin-posts",
  requiresAI: true,

  async detect(ctx: DetectionContext): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = []
    const { keywords } = ctx.icpProfile
    const claude = getClaudeClient()

    const allPosts = ctx.data.demoTrialPosts.map((p, i) => {
      const avatar = p.author.avatar
      return {
        index: i,
        name: p.author.name,
        headline: p.author.info,
        content: p.content.slice(0, 300),
        authorUrl: p.author.linkedinUrl,
        postUrl: p.linkedinUrl,
        photoUrl: typeof avatar === "string" ? avatar : avatar?.url,
      }
    })

    if (allPosts.length === 0) return signals

    try {
      const response = await claude.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `Analyze these LinkedIn posts. Which posts are from people actively looking for a demo or trial of a tool/service related to: ${keywords.join(", ")}?
Only include BUYERS (people seeking a demo/trial), NOT sellers or companies offering demos.

Posts:
${allPosts.map((p) => `[${p.index}] ${p.name}: ${p.content}`).join("\n")}

Return ONLY a JSON array of indices of buyer posts seeking demos/trials. Example: [0, 3, 5]
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
            detectorId: "2.12",
            signalType: "pain_point",
            strength: "critical",
            scorePoints: 50,
            linkedinUrl: post.authorUrl,
            name: post.name,
            headline: post.headline,
            photoUrl: post.photoUrl,
            title: "Looking for demo/trial",
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
