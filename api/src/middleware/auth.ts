import type { Request, Response, NextFunction } from "express"
import { supabaseAdmin } from "../lib/supabase.js"

declare global {
  namespace Express {
    interface Request {
      userId: string
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization token" })
    return
  }

  const token = header.slice(7)
  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired token" })
    return
  }

  req.userId = data.user.id
  next()
}
