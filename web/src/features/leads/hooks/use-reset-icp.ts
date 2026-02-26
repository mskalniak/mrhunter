import { useMutation, useQueryClient } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"

export function useResetIcp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      leadsApi<{ success: boolean }>("/icp", {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["icp"] })
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      queryClient.invalidateQueries({ queryKey: ["search-history"] })
    },
  })
}
