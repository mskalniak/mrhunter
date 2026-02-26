import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../middleware/auth.js"
import { validate } from "../middleware/validate.js"
import { processOnboardingChat } from "../services/onboarding.service.js"
import { createIcpFromOnboarding } from "../services/icp.service.js"
import { runSignalDetection } from "../signals/runner.js"

export const onboardingRouter = Router()
onboardingRouter.use(requireAuth)

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  currentState: z.record(z.unknown()),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
})

onboardingRouter.post("/chat", validate(chatSchema), async (req, res, next) => {
  try {
    const { message, currentState, chatHistory } = req.body
    const result = await processOnboardingChat(message, currentState, chatHistory)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

const completeSchema = z.object({
  state: z.record(z.unknown()),
})

onboardingRouter.post("/complete", validate(completeSchema), async (req, res, next) => {
  try {
    const profile = await createIcpFromOnboarding(req.userId, req.body.state)

    runSignalDetection(req.userId, profile.id).catch(err => {
      console.error("First signal detection failed:", err)
    })

    res.status(201).json({ success: true, icpProfileId: profile.id })
  } catch (err) {
    next(err)
  }
})
