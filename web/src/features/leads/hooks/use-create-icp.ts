import { useMutation, useQueryClient } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"
import type { IcpProfile } from "../types"

export function useCreateIcp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (rawPrompt: string) =>
      leadsApi<{ profile: IcpProfile }>("/icp", {
        method: "POST",
        body: JSON.stringify({ raw_prompt: rawPrompt }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["icp"] })
      queryClient.invalidateQueries({ queryKey: ["leads"] })
    },
  })
}
