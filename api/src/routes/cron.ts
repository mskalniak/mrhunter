import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { getRequiredCronEnv } from "../config/env.js"
import { runSignalDetection } from "../signals/runner.js"

export const cronRouter = Router()

// POST /api/cron/search — called by Vercel Cron daily
cronRouter.post("/search", async (req, res, next) => {
  try {
    // Verify cron secret
    const { CRON_SECRET } = getRequiredCronEnv()
    const authHeader = req.headers.authorization

    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }

    // Get all active ICP profiles
    const { data: profiles, error } = await supabaseAdmin
      .from("icp_profiles")
      .select("id, user_id")
      .eq("is_active", true)

    if (error) throw error
    if (!profiles || profiles.length === 0) {
      res.json({ message: "No active ICP profiles", runs: 0 })
      return
    }

    // Run signal detection for each active profile
    const results = await Promise.allSettled(
      profiles.map((p: { user_id: string; id: string }) => runSignalDetection(p.user_id, p.id))
    )

    const succeeded = results.filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected").length

    res.json({ message: "Cron search completed", succeeded, failed, total: profiles.length })
  } catch (err) {
    next(err)
  }
})
