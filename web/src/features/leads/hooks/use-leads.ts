import { useQuery } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"
import type { LeadsResponse } from "../types"

type LeadsFilters = {
  page?: number
  per_page?: number
  status?: string
  signal_type?: string
  min_score?: number
}

export function useLeads(filters: LeadsFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page) params.set("page", String(filters.page))
  if (filters.per_page) params.set("per_page", String(filters.per_page))
  if (filters.status) params.set("status", filters.status)
  if (filters.signal_type) params.set("signal_type", filters.signal_type)
  if (filters.min_score) params.set("min_score", String(filters.min_score))

  const queryString = params.toString()
  const path = `/leads${queryString ? `?${queryString}` : ""}`

  return useQuery({
    queryKey: ["leads", filters],
    queryFn: () => leadsApi<LeadsResponse>(path),
  })
}
