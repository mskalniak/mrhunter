import type { Request, Response, NextFunction } from "express"

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  console.error("Unhandled error:", message)
  if (stack) console.error(stack)
  res.status(500).json({ error: "Internal server error" })
}
