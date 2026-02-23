import { useMutation, useQueryClient } from "@tanstack/react-query"
import { leadsApi } from "../lib/api-client"

export function useSearchRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      leadsApi<{ search_run_id: string; status: string }>("/search/run", {
        method: "POST",
      }),
    onSuccess: () => {
      // Refetch leads after a delay to allow pipeline to complete
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["leads"] })
        queryClient.invalidateQueries({ queryKey: ["search-history"] })
      }, 5000)
    },
  })
}
