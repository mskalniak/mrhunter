import { Router } from "express"
import { requireAuth } from "../middleware/auth.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { runSearchPipeline } from "../services/search-pipeline.service.js"
import * as icpService from "../services/icp.service.js"

export const searchRouter = Router()
searchRouter.use(requireAuth)

// POST /api/search/run — trigger manual search
searchRouter.post("/run", async (req, res, next) => {
  try {
    const icp = await icpService.getActiveIcpProfile(req.userId)
    if (!icp) {
      res.status(400).json({ error: "No active ICP profile. Create one first." })
      return
    }

    // Start pipeline (don't await — return immediately)
    const resultPromise = runSearchPipeline(req.userId, icp.id, "manual")

    // Return the search run ID quickly
    const { data: latestRun } = await supabaseAdmin
      .from("search_runs")
      .select("id")
      .eq("user_id", req.userId)
      .eq("icp_profile_id", icp.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .single()

    // Still await the result so errors are logged
    resultPromise.catch((err) => {
      console.error("Manual search pipeline failed:", err)
    })

    res.json({ search_run_id: latestRun?.id, status: "running" })
  } catch (err) {
    next(err)
  }
})

// GET /api/search/history — list past search runs
searchRouter.get("/history", async (req, res, next) => {
  try {
    const { data: runs, error } = await supabaseAdmin
      .from("search_runs")
      .select("*")
      .eq("user_id", req.userId)
      .order("started_at", { ascending: false })
      .limit(50)

    if (error) throw error
    res.json({ runs: runs ?? [] })
  } catch (err) {
    next(err)
  }
})
