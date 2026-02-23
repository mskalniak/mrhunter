import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../middleware/auth.js"
import { validate } from "../middleware/validate.js"
import * as habitsService from "../services/habits.service.js"

export const habitsRouter = Router()

// All routes require auth
habitsRouter.use(requireAuth)

// GET /api/habits — list habits + stats
habitsRouter.get("/", async (req, res, next) => {
  try {
    const result = await habitsService.getHabitsWithStats(req.userId)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// POST /api/habits — create habit
const createSchema = z.object({
  name: z.string().min(1).max(40),
  description: z.string().max(80).default(""),
  icon: z.string().min(1).max(30),
  color: z.string().min(1).max(20),
})

habitsRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const habit = await habitsService.createHabit(req.userId, req.body)
    res.status(201).json(habit)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/habits/reorder — batch reorder (must be before /:id to avoid conflict)
const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
})

habitsRouter.patch("/reorder", validate(reorderSchema), async (req, res, next) => {
  try {
    await habitsService.reorderHabits(req.userId, req.body.orderedIds)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/habits/:id — update habit
const updateSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  description: z.string().max(80).optional(),
  icon: z.string().min(1).max(30).optional(),
  color: z.string().min(1).max(20).optional(),
})

habitsRouter.patch("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const habit = await habitsService.updateHabit(req.userId, req.params.id as string, req.body)
    res.json(habit)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/habits/:id — soft delete
habitsRouter.delete("/:id", async (req, res, next) => {
  try {
    await habitsService.deleteHabit(req.userId, req.params.id as string)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// POST /api/habits/:id/complete — mark completed
const completeSchema = z.object({
  date: z.string().date().optional(),
})

habitsRouter.post("/:id/complete", validate(completeSchema), async (req, res, next) => {
  try {
    await habitsService.completeHabit(req.userId, req.params.id as string, req.body.date)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/habits/:id/complete — unmark completed
habitsRouter.delete("/:id/complete", async (req, res, next) => {
  try {
    const date = req.query.date as string | undefined
    await habitsService.uncompleteHabit(req.userId, req.params.id as string, date)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})
