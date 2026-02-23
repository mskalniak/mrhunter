import { getRequiredSerperEnv } from "../config/env.js"

type SerperResult = {
  title: string
  link: string
  snippet: string
  position: number
}

type SerperResponse = {
  organic: SerperResult[]
  searchParameters: {
    q: string
    num: number
  }
}

export async function searchGoogle(query: string, num: number = 20): Promise<SerperResult[]> {
  const { SERPER_API_KEY } = getRequiredSerperEnv()

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": SERPER_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      num,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Serper API error (${response.status}): ${errorText}`)
  }

  const data: SerperResponse = await response.json()
  return data.organic ?? []
}

export async function searchLinkedInSignals(queries: string[]): Promise<{
  results: Array<{
    query: string
    items: SerperResult[]
  }>
  totalQueries: number
}> {
  const results = await Promise.all(
    queries.map(async (query) => {
      const items = await searchGoogle(query, 20)
      return { query, items }
    })
  )

  return {
    results,
    totalQueries: queries.length,
  }
}
