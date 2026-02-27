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
      // Poll for results — pipeline can take 30+ seconds
      const poll = (attempts: number) => {
        if (attempts >= 12) return // stop after ~60s
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["leads"] })
          queryClient.invalidateQueries({ queryKey: ["search-history"] })
          poll(attempts + 1)
        }, 5000)
      }
      poll(0)
    },
  })
}
