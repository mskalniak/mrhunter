import { supabaseAdmin } from "../lib/supabase.js"
import { allDetectors } from "./registry.js"
import type { DetectionContext, DetectedSignal, PrefetchedData, CompetitorPostData } from "./types.js"
import type { ParsedIcpConfig } from "@solomakers/shared"
import * as harvest from "./sources/harvest-api.js"
import { resetBudget, getBudgetStatus } from "./sources/harvest-api.js"

// ── Result type ───────────────────────────────────────────────────────

export type SignalRunResult = {
  searchRunId: string
  detectorsRun: number
  signalsFound: number
  leadsCreated: number
  leadsUpdated: number
  errors: Array<{ detectorId: string; error: string }>
}

// ── Prefetch all data sources ────────────────────────────────────────

async function fetchCompetitorPosts(
  competitors: string[],
  postedLimit: "week" | "month",
  scrapePostedLimit: "week" | "month",
  maxPosts: number,
  maxCommentsPerPost: number,
): Promise<CompetitorPostData[]> {
  const results: CompetitorPostData[] = []

  for (const competitor of competitors.slice(0, 3)) {
    try {
      const posts = await harvest.searchPosts(competitor, {
        postedLimit,
        scrapePostedLimit,
        sortBy: "date",
        maxPosts,
      })

      const slicedPosts = posts.slice(0, maxPosts)
      const commentsByPostUrl = new Map<string, harvest.HarvestComment[]>()

      for (const post of slicedPosts) {
        try {
          const comments = await harvest.getPostComments(post.linkedinUrl, { maxItems: maxCommentsPerPost })
          commentsByPostUrl.set(post.linkedinUrl, comments.slice(0, maxCommentsPerPost))
        } catch {
          // Skip individual post comment failures
        }
      }

      results.push({ competitor, posts: slicedPosts, commentsByPostUrl })
    } catch {
      // Skip individual competitor failures
    }
  }

  return results
}

async function prefetchData(icp: ParsedIcpConfig): Promise<PrefetchedData> {
  const { competitors, keywords, titles, location } = icp

  console.log("[prefetch] ICP config:")
  console.log(`  competitors: [${competitors.join(", ")}] (${competitors.length})`)
  console.log(`  keywords: [${keywords.join(", ")}] (${keywords.length})`)
  console.log(`  titles: [${titles.join(", ")}] (${titles.length})`)
  console.log(`  location: ${location ?? "(none)"}`)

  // ── Competitor posts (week) + comments — DISABLED
  // console.log("[prefetch] Fetching competitor posts (week)...")
  // const competitorWeek = await fetchCompetitorPosts(competitors, "week", "week", 3, 20)
  const competitorWeek: CompetitorPostData[] = []

  // ── Competitor posts (month) + comments — DISABLED
  // console.log("[prefetch] Fetching competitor posts (month)...")
  // const competitorMonth = await fetchCompetitorPosts(competitors, "month", "month", 3, 20)
  const competitorMonth: CompetitorPostData[] = []

  // ── Keyword posts — DISABLED
  const keywordPosts = new Map<string, harvest.HarvestPost[]>()

  // ── Recommendation posts — DISABLED
  const recommendationPosts: harvest.HarvestPost[] = []

  // ── Demo/trial posts — DISABLED
  const demoTrialPosts: harvest.HarvestPost[] = []

  // ── New role posts — DISABLED
  const newRolePosts: harvest.HarvestPost[] = []

  // ── Profile search (single API call with all titles)
  console.log("[prefetch] Fetching profiles...")
  let profiles: harvest.HarvestProfileSearchResult[] = []
  try {
    const searchQuery = titles.slice(0, 3).join(' OR ')
    const profileLanguages = harvest.getProfileLanguagesForLocation(location)
    console.log(`[prefetch]   location: ${location ?? "(none)"} → languages: ${profileLanguages?.join(", ") ?? "default"}`)
    profiles = await harvest.searchProfiles(searchQuery, {
      currentJobTitles: titles,
      locations: location ? [location] : undefined,
      maxItems: 25,
      profileScraperMode: 'Short',
      profileLanguages,
    })
    console.log(`[prefetch]   profiles found: ${profiles.length}`)
  } catch (err) {
    console.error(`[prefetch]   profiles: FAILED -`, err instanceof Error ? err.message : err)
  }

  // ── Full profiles — DISABLED
  const fullProfiles = new Map<string, harvest.HarvestProfile>()

  // ── Job searches (week) — DISABLED
  const jobsByTitleWeek = new Map<string, harvest.HarvestJob[]>()

  // ── Job searches (month) — DISABLED
  const jobsByTitleMonth = new Map<string, harvest.HarvestJob[]>()

  const budget = getBudgetStatus()
  console.log(`[prefetch] Done. API calls used: ${budget.used}/${budget.budget}`)

  return {
    competitorWeek,
    competitorMonth,
    keywordPosts,
    recommendationPosts,
    demoTrialPosts,
    newRolePosts,
    profiles,
    fullProfiles,
    jobsByTitleWeek,
    jobsByTitleMonth,
  }
}

// ── Main orchestration ────────────────────────────────────────────────

export async function runSignalDetection(
  userId: string,
  icpProfileId: string,
): Promise<SignalRunResult> {
  console.log(`\n========== SIGNAL DETECTION START ==========`)
  console.log(`[signals] userId=${userId}, icpProfileId=${icpProfileId}`)

  // 1. Load ICP profile
  const { data: icp, error: icpError } = await supabaseAdmin
    .from("icp_profiles")
    .select("*")
    .eq("id", icpProfileId)
    .eq("user_id", userId)
    .single()

  if (icpError || !icp) {
    console.error(`[signals] ICP profile not found:`, icpError?.message ?? "no data")
    throw new Error("ICP profile not found")
  }
  console.log(`[signals] ICP loaded: "${icp.raw_prompt?.slice(0, 80)}..."`)
  console.log(`[signals] parsed_config:`, JSON.stringify(icp.parsed_config, null, 2))

  // 2. Create search_run record
  const { data: searchRun, error: runError } = await supabaseAdmin
    .from("search_runs")
    .insert({
      user_id: userId,
      icp_profile_id: icpProfileId,
      trigger_type: "manual" as const,
      status: "running",
    })
    .select()
    .single()

  if (runError || !searchRun) throw runError ?? new Error("Failed to create search run")

  try {
    // 3. Reset API budget
    resetBudget(100)
    console.log(`[signals] API budget: 100 requests`)

    // 4. Prefetch all data sources
    const parsedConfig: ParsedIcpConfig = icp.parsed_config
    const data = await prefetchData(parsedConfig)

    // 5. Build detection context (no harvest API — detectors use prefetched data)
    const ctx: DetectionContext = {
      icpProfile: parsedConfig,
      userId,
      data,
    }

    // 6. Run each detector sequentially
    const allSignals: DetectedSignal[] = []
    const errors: Array<{ detectorId: string; error: string }> = []

    for (const detector of allDetectors) {
      console.log(`[signals] Running detector ${detector.id}: ${detector.name}`)
      try {
        const signals = await detector.detect(ctx)
        console.log(`[signals] Detector ${detector.id} found ${signals.length} signals`)
        allSignals.push(...signals)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[signals] Detector ${detector.id} failed: ${message}`)
        errors.push({ detectorId: detector.id, error: message })
      }
    }

    // 7. Deduplicate by linkedinUrl::detectorId (keep first)
    const seen = new Set<string>()
    const uniqueSignals: DetectedSignal[] = []
    for (const signal of allSignals) {
      const key = `${signal.linkedinUrl}::${signal.detectorId}`
      if (!seen.has(key)) {
        seen.add(key)
        uniqueSignals.push(signal)
      }
    }
    const budget = getBudgetStatus()
    console.log(`[signals] Total: ${allSignals.length}, Unique: ${uniqueSignals.length}, API calls used: ${budget.used}/${budget.budget}`)

    // 8. Store signals in signals table
    const signalInserts = uniqueSignals.map((signal) => ({
      user_id: userId,
      icp_profile_id: icpProfileId,
      source_url: signal.sourceUrl,
      signal_type: signal.signalType,
      title: signal.title,
      snippet: signal.snippet,
      raw_data: {
        detectorId: signal.detectorId,
        strength: signal.strength,
        scorePoints: signal.scorePoints,
        linkedinUrl: signal.linkedinUrl,
        name: signal.name,
        headline: signal.headline,
        company: signal.company,
      },
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

    // 9. Group signals by person and score with diminishing returns
    const signalsByPerson = new Map<
      string,
      Array<{ signal: DetectedSignal; insertedId: string }>
    >()

    for (let i = 0; i < uniqueSignals.length; i++) {
      const signal = uniqueSignals[i]
      const insertedId = insertedSignals[i]?.id
      if (!insertedId) continue

      const existing = signalsByPerson.get(signal.linkedinUrl) ?? []
      existing.push({ signal, insertedId })
      signalsByPerson.set(signal.linkedinUrl, existing)
    }

    let leadsCreated = 0
    let leadsUpdated = 0

    // 10. Upsert leads
    for (const [linkedinUrl, personSignals] of signalsByPerson) {
      // Sort by scorePoints descending for diminishing returns
      personSignals.sort((a, b) => b.signal.scorePoints - a.signal.scorePoints)

      // Score with diminishing returns: first = full, subsequent *= 0.7^i
      let totalScore = 0
      for (let i = 0; i < personSignals.length; i++) {
        totalScore += personSignals[i].signal.scorePoints * Math.pow(0.7, i)
      }
      totalScore = Math.min(100, Math.round(totalScore))

      // Collect metadata from the top signal
      const topSignal = personSignals[0].signal
      const signalTypes = [
        ...new Set(personSignals.map((ps) => ps.signal.signalType)),
      ]

      // Resolve photo: try signal photoUrl first, then fullProfiles lookup
      const fullProfile = data.fullProfiles.get(linkedinUrl)
      const photoUrl =
        personSignals.find((ps) => ps.signal.photoUrl)?.signal.photoUrl ??
        fullProfile?.photo ?? fullProfile?.profilePicture?.url ??
        null

      // Resolve headline & company: prefer signal data, fall back to fullProfiles
      const headline =
        topSignal.headline || fullProfile?.headline || ""
      const company =
        topSignal.company || fullProfile?.currentPosition?.[0]?.companyName || ""

      // Build intent_summary
      const intentSummary =
        personSignals.length === 1
          ? topSignal.title
          : `${topSignal.title} + ${personSignals.length - 1} more signals`

      // Check if lead already exists
      const { data: existing } = await supabaseAdmin
        .from("leads")
        .select("id, intent_score, signal_types, photo_url, headline, company")
        .eq("user_id", userId)
        .eq("linkedin_url", linkedinUrl)
        .single()

      let leadId: string

      if (existing) {
        // Update existing lead: keep higher score, merge signal types
        const mergedSignalTypes = [
          ...new Set([...existing.signal_types, ...signalTypes]),
        ]
        const newScore = Math.max(existing.intent_score, totalScore)

        await supabaseAdmin
          .from("leads")
          .update({
            intent_score: newScore,
            intent_summary: intentSummary,
            signal_types: mergedSignalTypes,
            ...(photoUrl && !existing.photo_url ? { photo_url: photoUrl } : {}),
            ...(headline && !existing.headline ? { headline } : {}),
            ...(company && !existing.company ? { company } : {}),
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)

        leadId = existing.id
        leadsUpdated++
      } else {
        // Insert new lead
        const { data: newLead, error: leadError } = await supabaseAdmin
          .from("leads")
          .insert({
            user_id: userId,
            linkedin_url: linkedinUrl,
            name: topSignal.name ?? (fullProfile ? `${fullProfile.firstName} ${fullProfile.lastName}` : "Unknown"),
            headline,
            company,
            photo_url: photoUrl,
            intent_score: totalScore,
            intent_summary: intentSummary,
            signal_types: signalTypes,
            status: "new",
          })
          .select("id")
          .single()

        if (leadError || !newLead) throw leadError ?? new Error("Failed to insert lead")
        leadId = newLead.id
        leadsCreated++
      }

      // 11. Link signals to leads
      const signalLinks = personSignals.map((ps) => ({
        lead_id: leadId,
        signal_id: ps.insertedId,
      }))

      if (signalLinks.length > 0) {
        await supabaseAdmin
          .from("lead_signals")
          .upsert(signalLinks, { onConflict: "lead_id,signal_id" })
      }
    }

    // 12. Update search_run as completed
    await supabaseAdmin
      .from("search_runs")
      .update({
        queries_used: allDetectors.length,
        signals_found: uniqueSignals.length,
        leads_created: leadsCreated,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", searchRun.id)

    console.log(`[signals] Done! Detectors: ${allDetectors.length}, Signals: ${uniqueSignals.length}, Leads created: ${leadsCreated}, Updated: ${leadsUpdated}`)

    return {
      searchRunId: searchRun.id,
      detectorsRun: allDetectors.length,
      signalsFound: uniqueSignals.length,
      leadsCreated,
      leadsUpdated,
      errors,
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
