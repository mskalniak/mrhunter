import { getClaudeClient } from "../lib/claude.js"

type ScoredLead = {
  name: string
  headline: string
  company: string
  linkedin_url: string
  intent_score: number
  intent_summary: string
  signal_types: string[]
}

type SearchResult = {
  title: string
  link: string
  snippet: string
  query_signal_type: string
}

export async function scoreLeads(
  parsedConfig: {
    titles: string[]
    industries: string[]
    keywords: string[]
    competitors: string[]
    company_size?: string
    location?: string
  },
  searchResults: SearchResult[]
): Promise<ScoredLead[]> {
  if (searchResults.length === 0) return []

  const claude = getClaudeClient()

  // Batch in groups of 30 to stay within token limits
  const batches: SearchResult[][] = []
  for (let i = 0; i < searchResults.length; i += 30) {
    batches.push(searchResults.slice(i, i + 30))
  }

  const allLeads: ScoredLead[] = []

  for (const batch of batches) {
    const response = await claude.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `You are a B2B lead scoring expert. Score these LinkedIn search results against the given Ideal Customer Profile.

ICP:
- Target titles: ${parsedConfig.titles.join(", ")}
- Industries: ${parsedConfig.industries.join(", ")}
- Keywords: ${parsedConfig.keywords.join(", ")}
- Competitors: ${parsedConfig.competitors.join(", ") || "none specified"}
${parsedConfig.company_size ? `- Company size: ${parsedConfig.company_size}` : ""}
${parsedConfig.location ? `- Location: ${parsedConfig.location}` : ""}

Search results:
${batch.map((r, i) => `[${i}] Title: ${r.title}\n    URL: ${r.link}\n    Snippet: ${r.snippet}\n    Signal: ${r.query_signal_type}`).join("\n\n")}

For each result that represents a real person (not a company page, article, or irrelevant result), return a scored lead. Skip non-person results.

Return ONLY a JSON array:
[
  {
    "name": "Full Name",
    "headline": "Job Title at Company",
    "company": "Company Name",
    "linkedin_url": "https://linkedin.com/in/...",
    "intent_score": 0-100,
    "intent_summary": "One sentence explaining why this person is a lead",
    "signal_types": ["pain_point", "hiring"]
  }
]

Scoring guide:
- 80-100: Strong ICP match + clear buying intent signal
- 60-79: Good ICP match OR moderate intent signal
- 40-59: Partial match, worth monitoring
- Below 40: Skip (don't include in results)

If no valid leads exist in this batch, return an empty array [].`,
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        const leads: ScoredLead[] = JSON.parse(jsonMatch[0])
        allLeads.push(...leads)
      } catch {
        console.error("Failed to parse scoring response:", text.slice(0, 200))
      }
    }
  }

  return allLeads
}
