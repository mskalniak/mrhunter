import Anthropic from "@anthropic-ai/sdk"
import { getRequiredAnthropicEnv } from "../config/env.js"

let client: Anthropic | null = null

export function getClaudeClient(): Anthropic {
  if (client) return client
  const { ANTHROPIC_API_KEY } = getRequiredAnthropicEnv()
  client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
  return client
}
