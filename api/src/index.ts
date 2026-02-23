import express from "express"
import cors from "cors"
import { habitsRouter } from "./routes/habits.js"
import { errorHandler } from "./middleware/error-handler.js"

export const app = express()

app.use(cors())
app.use(express.json())

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

app.get("/api/health", (_req, res) => {
  res.json({ ok: true })
})

app.use("/api/habits", habitsRouter)
app.use("/habits", habitsRouter)

app.use(errorHandler)

if (process.env.VERCEL !== "1") {
  const port = Number(process.env.PORT ?? 3001)
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`)
  })
}

export default app
