let getApiUrl: () => string = () => {
  throw new Error("API not configured. Call configureApi() at app startup.")
}
let getAuthToken: () => Promise<string | null> = async () => null

export function configureApi(config: {
  apiUrl: string | (() => string)
  authToken: () => Promise<string | null>
}) {
  const { apiUrl } = config
  getApiUrl = typeof apiUrl === "string" ? () => apiUrl : apiUrl
  getAuthToken = config.authToken
}

export async function habitApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken()

  const res = await fetch(`${getApiUrl()}/api/habits${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `API error: ${res.status}`)
  }

  return res.json()
}
