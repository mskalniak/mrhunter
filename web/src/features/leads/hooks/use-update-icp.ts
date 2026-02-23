import { useMutation, useQueryClient } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"
import type { IcpProfile } from "../types"

export function useUpdateIcp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ icpId, rawPrompt }: { icpId: string; rawPrompt: string }) =>
      leadsApi<{ profile: IcpProfile }>(`/icp/${icpId}`, {
        method: "PUT",
        body: JSON.stringify({ raw_prompt: rawPrompt }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["icp"] })
    },
  })
}
