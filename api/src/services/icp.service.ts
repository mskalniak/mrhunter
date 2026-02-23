import { getClaudeClient } from "../lib/claude.js"
import { supabaseAdmin } from "../lib/supabase.js"

type ParsedIcpConfig = {
  titles: string[]
  industries: string[]
  keywords: string[]
  competitors: string[]
  company_size?: string
  location?: string
}

type IcpParseResult = {
  parsed_config: ParsedIcpConfig
  search_queries: string[]
}

export async function parseIcpPrompt(rawPrompt: string): Promise<IcpParseResult> {
  const claude = getClaudeClient()

  const response = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are an expert B2B lead generation specialist. Parse the following Ideal Customer Profile (ICP) description into structured search parameters, then generate Google search queries to find these people on LinkedIn.

ICP Description: "${rawPrompt}"

Return ONLY valid JSON with this exact structure:
{
  "parsed_config": {
    "titles": ["job title 1", "job title 2"],
    "industries": ["industry 1", "industry 2"],
    "keywords": ["keyword 1", "keyword 2"],
    "competitors": ["competitor 1"],
    "company_size": "10-200 or null if not specified",
    "location": "location or null if not specified"
  },
  "search_queries": [
    "site:linkedin.com/posts query for pain points",
    "site:linkedin.com/jobs query for hiring signals",
    "site:linkedin.com/posts query for role changes",
    "site:linkedin.com query for funding signals",
    "site:linkedin.com/posts query for event attendance"
  ]
}

Rules for generating search queries:
1. Always use site:linkedin.com or site:linkedin.com/posts or site:linkedin.com/jobs
2. Use OR operators for multiple titles/keywords
3. Include intent keywords like "looking for", "struggling with", "need help", "hiring", "excited to announce", "new role", "raised", "funding", "Series A/B/C", "attending", "speaking at"
4. Generate 5-15 diverse queries covering: pain_point, hiring, role_change, funding, event signal types
5. If competitors are mentioned, add queries for competitor engagement
6. Keep queries focused and specific — avoid overly broad queries
7. Use quotes around multi-word phrases`,
      },
    ],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("Failed to parse ICP: Claude did not return valid JSON")
  }

  const result: IcpParseResult = JSON.parse(jsonMatch[0])
  return result
}

export async function createIcpProfile(userId: string, rawPrompt: string) {
  const { parsed_config, search_queries } = await parseIcpPrompt(rawPrompt)

  const { data, error } = await supabaseAdmin
    .from("icp_profiles")
    .insert({
      user_id: userId,
      raw_prompt: rawPrompt,
      parsed_config,
      search_queries,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getActiveIcpProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("icp_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") throw error // PGRST116 = no rows
  return data ?? null
}

export async function updateIcpProfile(userId: string, icpId: string, rawPrompt: string) {
  const { parsed_config, search_queries } = await parseIcpPrompt(rawPrompt)

  const { data, error } = await supabaseAdmin
    .from("icp_profiles")
    .update({
      raw_prompt: rawPrompt,
      parsed_config,
      search_queries,
      updated_at: new Date().toISOString(),
    })
    .eq("id", icpId)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deactivateAllProfiles(userId: string) {
  const { error } = await supabaseAdmin
    .from("icp_profiles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_active", true)

  if (error) throw error
}
