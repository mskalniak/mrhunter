import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../middleware/auth.js"
import { validate } from "../middleware/validate.js"
import { supabaseAdmin } from "../lib/supabase.js"

export const leadsRouter = Router()
leadsRouter.use(requireAuth)

// GET /api/leads — list leads with pagination and filters
leadsRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const perPage = Math.min(100, Math.max(1, Number(req.query.per_page) || 20))
    const status = req.query.status as string | undefined
    const signalType = req.query.signal_type as string | undefined
    const minScore = Number(req.query.min_score) || 0
    const offset = (page - 1) * perPage

    let query = supabaseAdmin
      .from("leads")
      .select("*", { count: "exact" })
      .eq("user_id", req.userId)
      .gte("intent_score", minScore)
      .order("intent_score", { ascending: false })
      .range(offset, offset + perPage - 1)

    if (status) {
      query = query.eq("status", status)
    }

    if (signalType) {
      query = query.contains("signal_types", [signalType])
    }

    const { data: leads, error, count } = await query

    if (error) throw error

    res.json({
      leads: leads ?? [],
      total: count ?? 0,
      page,
      per_page: perPage,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/leads/:id — get lead detail with signals
leadsRouter.get("/:id", async (req, res, next) => {
  try {
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", req.userId)
      .single()

    if (leadError) throw leadError

    // Get linked signals
    const { data: signalLinks } = await supabaseAdmin
      .from("lead_signals")
      .select("signal_id")
      .eq("lead_id", lead.id)

    const signalIds = (signalLinks ?? []).map((l: { signal_id: string }) => l.signal_id)

    let signals: Array<{
      id: string
      source_url: string
      signal_type: string
      title: string
      snippet: string
      created_at: string
    }> = []

    if (signalIds.length > 0) {
      const { data: signalData } = await supabaseAdmin
        .from("signals")
        .select("id, source_url, signal_type, title, snippet, created_at")
        .in("id", signalIds)
        .order("created_at", { ascending: false })

      signals = signalData ?? []
    }

    res.json({ ...lead, signals })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/leads/:id — update lead status
const updateSchema = z.object({
  status: z.enum(["new", "viewed", "saved", "dismissed"]),
})

leadsRouter.patch("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const { data: lead, error } = await supabaseAdmin
      .from("leads")
      .update({
        status: req.body.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.params.id)
      .eq("user_id", req.userId)
      .select()
      .single()

    if (error) throw error
    res.json(lead)
  } catch (err) {
    next(err)
  }
})
