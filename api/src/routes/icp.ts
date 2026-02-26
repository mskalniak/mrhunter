import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../middleware/auth.js"
import { validate } from "../middleware/validate.js"
import * as icpService from "../services/icp.service.js"
import { runSearchPipeline } from "../services/search-pipeline.service.js"
import { supabaseAdmin } from "../lib/supabase.js"

export const icpRouter = Router()
icpRouter.use(requireAuth)

// GET /api/icp — get active ICP profile
icpRouter.get("/", async (req, res, next) => {
  try {
    const profile = await icpService.getActiveIcpProfile(req.userId)
    res.json({ profile })
  } catch (err) {
    next(err)
  }
})

// POST /api/icp — create ICP profile and trigger first search
const createSchema = z.object({
  raw_prompt: z.string().min(10).max(2000),
})

icpRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    // Deactivate any existing ICP profiles
    await icpService.deactivateAllProfiles(req.userId).catch(() => {})

    const profile = await icpService.createIcpProfile(req.userId, req.body.raw_prompt)

    // Trigger first search in background (don't await)
    runSearchPipeline(req.userId, profile.id, "manual").catch((err) => {
      console.error("First search pipeline failed:", err)
    })

    res.status(201).json({ profile })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/icp — full reset: deactivate ICP + delete all leads, signals, search runs
icpRouter.delete("/", async (req, res, next) => {
  try {
    // Delete in order: lead_signals (junction) → leads → signals → search_runs → deactivate ICP
    await supabaseAdmin.from("lead_signals")
      .delete()
      .in("lead_id",
        supabaseAdmin.from("leads").select("id").eq("user_id", req.userId)
      )
    await supabaseAdmin.from("leads").delete().eq("user_id", req.userId)
    await supabaseAdmin.from("signals").delete().eq("user_id", req.userId)
    await supabaseAdmin.from("search_runs").delete().eq("user_id", req.userId)
    await icpService.deactivateAllProfiles(req.userId)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// PUT /api/icp/:id — update ICP profile
const updateSchema = z.object({
  raw_prompt: z.string().min(10).max(2000),
})

icpRouter.put("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const profile = await icpService.updateIcpProfile(req.userId, req.params.id as string, req.body.raw_prompt)
    res.json({ profile })
  } catch (err) {
    next(err)
  }
})
