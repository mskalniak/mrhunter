import { Router } from "express"
import { requireAuth } from "../middleware/auth.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { runSignalDetection } from "../signals/runner.js"
import * as icpService from "../services/icp.service.js"

export const searchRouter = Router()
searchRouter.use(requireAuth)

// POST /api/search/run — trigger manual search via signal detection
searchRouter.post("/run", async (req, res, next) => {
  try {
    const icp = await icpService.getActiveIcpProfile(req.userId)
    if (!icp) {
      res.status(400).json({ error: "No active ICP profile. Create one first." })
      return
    }

    // Start signal detection in background
    runSignalDetection(req.userId, icp.id)
      .then((result) => console.log("[search/run] Signal detection completed:", result))
      .catch((err) => console.error("[search/run] Signal detection failed:", err))

    // Wait briefly for the search_run record to be created
    await new Promise((resolve) => setTimeout(resolve, 500))

    const { data: latestRun } = await supabaseAdmin
      .from("search_runs")
      .select("id")
      .eq("user_id", req.userId)
      .eq("icp_profile_id", icp.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .single()

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
