import express from "express"
import cors from "cors"
import { icpRouter } from "./routes/icp.js"
import { leadsRouter } from "./routes/leads.js"
import { searchRouter } from "./routes/search.js"
import { cronRouter } from "./routes/cron.js"
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

app.use("/api/icp", icpRouter)
app.use("/api/leads", leadsRouter)
app.use("/api/search", searchRouter)
app.use("/api/cron", cronRouter)

app.use(errorHandler)

if (process.env.VERCEL !== "1") {
  const port = Number(process.env.PORT ?? 3001)
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`)
  })
}

export default app
