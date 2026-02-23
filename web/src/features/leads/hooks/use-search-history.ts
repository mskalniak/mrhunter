import { useQuery } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"
import type { SearchRun } from "../types"

export function useSearchHistory() {
  return useQuery({
    queryKey: ["search-history"],
    queryFn: () => leadsApi<{ runs: SearchRun[] }>("/search/history"),
    select: (data) => data.runs,
  })
}
