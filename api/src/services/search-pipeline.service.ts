import { supabaseAdmin } from "../lib/supabase.js"
import { searchLinkedInSignals } from "../lib/serper.js"
import { scoreLeads } from "./scoring.service.js"

type SignalType = "hiring" | "pain_point" | "competitor_engagement" | "funding" | "role_change" | "event"

function classifyQuerySignalType(query: string): SignalType {
  const q = query.toLowerCase()
  if (q.includes("/jobs") || q.includes("hiring") || q.includes("looking to hire")) return "hiring"
  if (q.includes("struggling") || q.includes("looking for") || q.includes("need help") || q.includes("challenge")) return "pain_point"
  if (q.includes("competitor") || q.includes("liked") || q.includes("commented")) return "competitor_engagement"
  if (q.includes("raised") || q.includes("funding") || q.includes("series")) return "funding"
  if (q.includes("excited to announce") || q.includes("new role") || q.includes("just joined")) return "role_change"
  if (q.includes("attending") || q.includes("speaking at") || q.includes("event") || q.includes("conference")) return "event"
  return "pain_point" // default
}

export async function runSearchPipeline(
  userId: string,
  icpProfileId: string,
  triggerType: "cron" | "manual"
) {
  // 1. Get ICP profile
  const { data: icp, error: icpError } = await supabaseAdmin
    .from("icp_profiles")
    .select("*")
    .eq("id", icpProfileId)
    .eq("user_id", userId)
    .single()

  if (icpError || !icp) throw new Error("ICP profile not found")

  // 2. Create search run record
  const { data: searchRun, error: runError } = await supabaseAdmin
    .from("search_runs")
    .insert({
      user_id: userId,
      icp_profile_id: icpProfileId,
      trigger_type: triggerType,
      status: "running",
    })
    .select()
    .single()

  if (runError) throw runError

  try {
    // 3. Execute Serper searches
    const queries: string[] = icp.search_queries ?? []
    const { results, totalQueries } = await searchLinkedInSignals(queries)

    // 4. Flatten results into signals with type classification
    const allSearchResults: Array<{
      title: string
      link: string
      snippet: string
      query_signal_type: string
    }> = []

    for (const { query, items } of results) {
      const signalType = classifyQuerySignalType(query)
      for (const item of items) {
        allSearchResults.push({
          title: item.title,
          link: item.link,
          snippet: item.snippet,
          query_signal_type: signalType,
        })
      }
    }

    // 5. Store raw signals
    const signalInserts = allSearchResults.map((r) => ({
      user_id: userId,
      icp_profile_id: icpProfileId,
      source_url: r.link,
      signal_type: r.query_signal_type,
      title: r.title,
      snippet: r.snippet,
      raw_data: r,
      search_batch_id: searchRun.id,
    }))

    let insertedSignals: Array<{ id: string }> = []
    if (signalInserts.length > 0) {
      const { data: signals, error: sigError } = await supabaseAdmin
        .from("signals")
        .insert(signalInserts)
        .select("id")

      if (sigError) throw sigError
      insertedSignals = signals ?? []
    }

    // 6. Score leads with Claude
    const scoredLeads = await scoreLeads(icp.parsed_config, allSearchResults)

    // 7. Upsert leads and link signals
    let leadsCreated = 0

    for (const lead of scoredLeads) {
      // Check if lead already exists for this user
      const { data: existing } = await supabaseAdmin
        .from("leads")
        .select("id, intent_score, signal_types")
        .eq("user_id", userId)
        .eq("linkedin_url", lead.linkedin_url)
        .single()

      if (existing) {
        // Update existing lead: bump score if higher, merge signal types, update last_seen
        const mergedSignals = [...new Set([...existing.signal_types, ...lead.signal_types])]
        const newScore = Math.max(existing.intent_score, lead.intent_score)

        await supabaseAdmin
          .from("leads")
          .update({
            intent_score: newScore,
            intent_summary: lead.intent_summary,
            signal_types: mergedSignals,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)

        // Link new signals to existing lead
        const signalLinks = insertedSignals
          .filter((_, i) => {
            const result = allSearchResults[i]
            return result && result.link === lead.linkedin_url
          })
          .map((s) => ({ lead_id: existing.id, signal_id: s.id }))

        if (signalLinks.length > 0) {
          await supabaseAdmin.from("lead_signals").upsert(signalLinks, { onConflict: "lead_id,signal_id" })
        }
      } else {
        // Insert new lead
        const { data: newLead, error: leadError } = await supabaseAdmin
          .from("leads")
          .insert({
            user_id: userId,
            linkedin_url: lead.linkedin_url,
            name: lead.name,
            headline: lead.headline,
            company: lead.company,
            intent_score: lead.intent_score,
            intent_summary: lead.intent_summary,
            signal_types: lead.signal_types,
            status: "new",
          })
          .select("id")
          .single()

        if (leadError) throw leadError
        leadsCreated++

        // Link signals to new lead
        const signalLinks = insertedSignals
          .filter((_, i) => {
            const result = allSearchResults[i]
            return result && result.link === lead.linkedin_url
          })
          .map((s) => ({ lead_id: newLead.id, signal_id: s.id }))

        if (signalLinks.length > 0) {
          await supabaseAdmin.from("lead_signals").upsert(signalLinks, { onConflict: "lead_id,signal_id" })
        }
      }
    }

    // 8. Update search run as completed
    await supabaseAdmin
      .from("search_runs")
      .update({
        queries_used: totalQueries,
        signals_found: insertedSignals.length,
        leads_created: leadsCreated,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", searchRun.id)

    return {
      searchRunId: searchRun.id,
      queriesUsed: totalQueries,
      signalsFound: insertedSignals.length,
      leadsCreated,
    }
  } catch (err) {
    // Mark search run as failed
    await supabaseAdmin
      .from("search_runs")
      .update({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        completed_at: new Date().toISOString(),
      })
      .eq("id", searchRun.id)

    throw err
  }
}
