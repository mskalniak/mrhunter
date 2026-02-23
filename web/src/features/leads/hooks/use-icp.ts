import { useQuery } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"
import type { IcpProfile } from "../types"

export function useIcp() {
  return useQuery({
    queryKey: ["icp"],
    queryFn: () => leadsApi<{ profile: IcpProfile | null }>("/icp"),
    select: (data) => data.profile,
  })
}
