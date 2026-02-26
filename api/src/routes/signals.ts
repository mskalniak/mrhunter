import { Router } from "express"
import { requireAuth } from "../middleware/auth.js"
import { runSignalDetection } from "../signals/runner.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { allDetectors } from "../signals/registry.js"

export const signalsRouter = Router()
signalsRouter.use(requireAuth)

// POST /api/signals/run — trigger signal detection (runs in background)
signalsRouter.post("/run", async (req, res, next) => {
  try {
    const { data: icp, error: icpError } = await supabaseAdmin
      .from("icp_profiles")
      .select("id")
      .eq("user_id", req.userId)
      .eq("is_active", true)
      .single()

    if (icpError || !icp) {
      res.status(400).json({ error: "No active ICP profile found" })
      return
    }

    // Run in background (don't await)
    const runPromise = runSignalDetection(req.userId, icp.id)

    res.json({
      status: "started",
      message: `Running ${allDetectors.length} signal detectors`,
      detectors: allDetectors.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        strength: d.strength,
      })),
    })

    runPromise
      .then((result) => console.log("[signals] Run completed:", result))
      .catch((err) => console.error("[signals] Run failed:", err))
  } catch (err) {
    next(err)
  }
})

// GET /api/signals/detectors — list available detectors
signalsRouter.get("/detectors", (_req, res) => {
  res.json({
    detectors: allDetectors.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      strength: d.strength,
      scorePoints: d.scorePoints,
      source: d.source,
      requiresAI: d.requiresAI,
    })),
    total: allDetectors.length,
  })
})
