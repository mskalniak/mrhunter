import { apiClient } from "@solomakers/shared"

export function leadsApi<T>(path: string, options?: RequestInit) {
  return apiClient<T>(`/api${path}`, options)
}
