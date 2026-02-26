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

  // ── Competitor posts (week) + comments
  console.log("[prefetch] Fetching competitor posts (week)...")
  const competitorWeek = await fetchCompetitorPosts(competitors, "week", "week", 3, 20)
  for (const cw of competitorWeek) {
    const totalComments = [...cw.commentsByPostUrl.values()].reduce((s, c) => s + c.length, 0)
    console.log(`[prefetch]   ${cw.competitor}: ${cw.posts.length} posts, ${totalComments} comments`)
  }

  // ── Competitor posts (month) + comments
  console.log("[prefetch] Fetching competitor posts (month)...")
  const competitorMonth = await fetchCompetitorPosts(competitors, "month", "month", 3, 20)
  for (const cm of competitorMonth) {
    const totalComments = [...cm.commentsByPostUrl.values()].reduce((s, c) => s + c.length, 0)
    console.log(`[prefetch]   ${cm.competitor}: ${cm.posts.length} posts, ${totalComments} comments`)
  }

  // ── Keyword posts
  console.log("[prefetch] Fetching keyword posts...")
  const keywordPosts = new Map<string, harvest.HarvestPost[]>()
  for (const keyword of keywords.slice(0, 3)) {
    try {
      const posts = await harvest.searchPosts(keyword, { postedLimit: "week", scrapePostedLimit: "week", sortBy: "date", maxPosts: 15 })
      keywordPosts.set(keyword, posts.slice(0, 15))
      console.log(`[prefetch]   "${keyword}": ${posts.length} posts`)
    } catch (err) {
      console.error(`[prefetch]   "${keyword}": FAILED -`, err instanceof Error ? err.message : err)
    }
  }

  // ── Recommendation posts
  console.log("[prefetch] Fetching recommendation posts...")
  let recommendationPosts: harvest.HarvestPost[] = []
  try {
    const posts = await harvest.searchPosts(
      "who can recommend OR looking for recommendations OR any suggestions for",
      { postedLimit: "week", scrapePostedLimit: "week", sortBy: "date", maxPosts: 15 },
    )
    recommendationPosts = posts.slice(0, 15)
    console.log(`[prefetch]   recommendation posts: ${recommendationPosts.length}`)
  } catch (err) {
    console.error("[prefetch]   recommendation posts: FAILED -", err instanceof Error ? err.message : err)
  }

  // ── Demo/trial posts
  console.log("[prefetch] Fetching demo/trial posts...")
  let demoTrialPosts: harvest.HarvestPost[] = []
  try {
    const posts = await harvest.searchPosts(
      "looking for demo OR free trial OR want to try",
      { postedLimit: "week", scrapePostedLimit: "week", sortBy: "date", maxPosts: 15 },
    )
    demoTrialPosts = posts.slice(0, 15)
    console.log(`[prefetch]   demo/trial posts: ${demoTrialPosts.length}`)
  } catch (err) {
    console.error("[prefetch]   demo/trial posts: FAILED -", err instanceof Error ? err.message : err)
  }

  // ── New role posts
  console.log("[prefetch] Fetching new role posts...")
  let newRolePosts: harvest.HarvestPost[] = []
  try {
    const posts = await harvest.searchPosts('#newrole OR #newjob OR "excited to announce"', {
      postedLimit: "week",
      scrapePostedLimit: "week",
      sortBy: "date",
      maxPosts: 20,
    })
    newRolePosts = posts.slice(0, 20)
    console.log(`[prefetch]   new role posts: ${newRolePosts.length}`)
  } catch (err) {
    console.error("[prefetch]   new role posts: FAILED -", err instanceof Error ? err.message : err)
  }

  // ── Profile searches
  console.log("[prefetch] Fetching profiles...")
  const profilesByTitle = new Map<string, harvest.HarvestProfileSearchResult[]>()
  for (const title of titles.slice(0, 3)) {
    try {
      const profiles = await harvest.searchProfiles(title, {
        currentJobTitles: [title],
        locations: location ? [location] : undefined,
        maxItems: 5,
      })
      profilesByTitle.set(title, profiles.slice(0, 5))
      console.log(`[prefetch]   "${title}": ${profiles.length} profiles`)
    } catch (err) {
      console.error(`[prefetch]   "${title}": FAILED -`, err instanceof Error ? err.message : err)
    }
  }

  // ── Full profiles
  console.log("[prefetch] Fetching full profiles...")
  const fullProfiles = new Map<string, harvest.HarvestProfile>()
  for (const [, results] of profilesByTitle) {
    for (const result of results) {
      if (fullProfiles.has(result.linkedinUrl)) continue
      try {
        const profile = await harvest.getProfile(result.linkedinUrl)
        if (profile) fullProfiles.set(result.linkedinUrl, profile)
      } catch (err) {
        console.error(`[prefetch]   profile ${result.linkedinUrl}: FAILED -`, err instanceof Error ? err.message : err)
      }
    }
  }
  console.log(`[prefetch]   full profiles fetched: ${fullProfiles.size}`)

  // ── Job searches (week)
  console.log("[prefetch] Fetching jobs (week)...")
  const jobsByTitleWeek = new Map<string, harvest.HarvestJob[]>()
  for (const title of titles.slice(0, 3)) {
    try {
      const jobs = await harvest.searchJobs(title, { postedLimit: "week", sortBy: "date", locations: location ? [location] : undefined, maxItems: 10 })
      jobsByTitleWeek.set(title, jobs.slice(0, 10))
      console.log(`[prefetch]   "${title}": ${jobs.length} jobs (week)`)
    } catch (err) {
      console.error(`[prefetch]   "${title}" jobs (week): FAILED -`, err instanceof Error ? err.message : err)
    }
  }

  // ── Job searches (month)
  console.log("[prefetch] Fetching jobs (month)...")
  const jobsByTitleMonth = new Map<string, harvest.HarvestJob[]>()
  for (const title of titles.slice(0, 3)) {
    try {
      const jobs = await harvest.searchJobs(title, { postedLimit: "month", sortBy: "date", locations: location ? [location] : undefined, maxItems: 20 })
      jobsByTitleMonth.set(title, jobs.slice(0, 20))
      console.log(`[prefetch]   "${title}": ${jobs.length} jobs (month)`)
    } catch (err) {
      console.error(`[prefetch]   "${title}" jobs (month): FAILED -`, err instanceof Error ? err.message : err)
    }
  }

  const budget = getBudgetStatus()
  console.log(`[prefetch] Done. API calls used: ${budget.used}/${budget.budget}`)

  return {
    competitorWeek,
    competitorMonth,
    keywordPosts,
    recommendationPosts,
    demoTrialPosts,
    newRolePosts,
    profilesByTitle,
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

      // Build intent_summary
      const intentSummary =
        personSignals.length === 1
          ? topSignal.title
          : `${topSignal.title} + ${personSignals.length - 1} more signals`

      // Check if lead already exists
      const { data: existing } = await supabaseAdmin
        .from("leads")
        .select("id, intent_score, signal_types")
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
            name: topSignal.name ?? "Unknown",
            headline: topSignal.headline ?? "",
            company: topSignal.company ?? "",
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
