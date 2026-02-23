import { useQuery } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"
import type { LeadDetailResponse } from "../types"

export function useLead(leadId: string | undefined) {
  return useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => leadsApi<LeadDetailResponse>(`/leads/${leadId}`),
    enabled: !!leadId,
  })
}
